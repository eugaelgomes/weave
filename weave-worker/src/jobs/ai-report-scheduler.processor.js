const redis = require("../config/redis");
const { executeQuery } = require("../database/connection");
const { logger } = require("../lib");

const THIRTY_MINUTES_MS = 30 * 60 * 1000;
const ENGINE_PROACTIVE_QUEUE = "queue:engine-proactive-tasks";

class AiReportSchedulerProcessor {
  constructor() {
    this.isRunning = false;
    this.intervalId = null;
  }

  async start() {
    if (this.isRunning) return;
    this.isRunning = true;

    const enabled = process.env.AI_REPORT_SCHEDULER_ENABLED !== "false";
    if (!enabled) {
      logger.info("AI report scheduler disabled by env");
      return;
    }

    // Run immediately, then every 30 minutes
    this.run().catch((error) => {
      logger.error("AI report scheduler first run failed", {
        error: error.message,
      });
    });

    this.intervalId = setInterval(() => {
      this.run().catch((error) => {
        logger.error("AI report scheduler periodic run failed", {
          error: error.message,
        });
      });
    }, THIRTY_MINUTES_MS);

    logger.info("AI report scheduler started", {
      intervalMs: THIRTY_MINUTES_MS,
    });
  }

  async run() {
    const dueConfigs = await this.getDueConfigs();

    if (!dueConfigs.length) {
      logger.debug("AI report scheduler: no due reports");
      return;
    }

    logger.info("AI report scheduler: processing due reports", {
      count: dueConfigs.length,
    });

    for (const config of dueConfigs) {
      try {
        await this.processConfig(config);
      } catch (error) {
        logger.error("AI report scheduler: failed to process config", {
          configId: config.id,
          projectId: config.project_id,
          error: error.message,
        });
      }
    }
  }

  /**
   * Queries configs that have a pending report.
   */
  async getDueConfigs() {
    return executeQuery(`
      SELECT
        rc.*,
        ps.id AS sprint_id,
        ps.sprint_number,
        ps.title AS sprint_title,
        ps.status AS sprint_status,
        ps.start_date AS sprint_start,
        ps.end_date AS sprint_end,
        ps.workable_days AS sprint_workable_days,
        p.title AS project_title,
        p.user_id AS project_owner_id
      FROM project_ai_report_configs rc
      INNER JOIN projects p ON p.id = rc.project_id AND p.deleted = false
      LEFT JOIN project_sprints ps ON ps.id = rc.current_sprint_id AND ps.deleted = false
      WHERE rc.deleted = false
        AND rc.enabled = true
        AND rc.next_report_at IS NOT NULL
        AND rc.next_report_at <= NOW()
    `);
  }

  /**
   * Processes a single due config: determines report type, pushes to engine queue,
   * and advances scheduler state.
   */
  async processConfig(config) {
    if (!config.sprint_id) {
      logger.warn("AI report scheduler: config has no active sprint", {
        configId: config.id,
        projectId: config.project_id,
      });
      return;
    }

    const reportType = this.determineReportType(config);
    if (!reportType) {
      logger.debug("AI report scheduler: no applicable report type today", {
        configId: config.id,
      });
      // Still advance next_report_at to avoid re-processing
      const nextAt = this.calculateNextReportAt(config);
      await this.updateSchedulerState(config.id, {
        next_report_at: nextAt,
      });
      return;
    }

    // Push job to engine proactive queue
    const job = {
      type: "ai_project_report",
      reportType,
      projectId: config.project_id,
      projectTitle: config.project_title,
      projectOwnerId: config.project_owner_id,
      sprintId: config.sprint_id,
      sprintNumber: config.sprint_number,
      sprintTitle: config.sprint_title,
      channels: config.channels,
      recipientScope: config.recipient_scope,
      customRecipients: config.custom_recipients,
      scheduledAt: config.next_report_at,
      createdAt: new Date().toISOString(),
    };

    await redis.rpush(ENGINE_PROACTIVE_QUEUE, JSON.stringify(job));
    logger.info("AI report scheduler: pushed job to engine", {
      reportType,
      projectId: config.project_id,
      sprintNumber: config.sprint_number,
    });

    // Check if sprint has ended and auto-create is enabled
    const today = new Date();
    const sprintEnd = new Date(config.sprint_end);
    const sprintEnded = today >= sprintEnd && reportType === "sprint_review";

    if (sprintEnded && config.auto_create_next_sprint) {
      await this.advanceSprint(config);
    } else {
      // Just advance the scheduler state
      const nextAt = this.calculateNextReportAt(config);
      await this.updateSchedulerState(config.id, {
        last_report_type: reportType,
        last_report_at: new Date().toISOString(),
        next_report_at: nextAt,
      });
    }
  }

  /**
   * Determines what type of report to generate based on today's date
   * relative to the sprint dates.
   */
  determineReportType(config) {
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    const startStr =
      typeof config.sprint_start === "string"
        ? config.sprint_start.split("T")[0]
        : new Date(config.sprint_start).toISOString().split("T")[0];
    const endStr =
      typeof config.sprint_end === "string"
        ? config.sprint_end.split("T")[0]
        : new Date(config.sprint_end).toISOString().split("T")[0];

    const dayOfWeek = today.getUTCDay();
    const workableDays = config.sprint_workable_days ||
      config.default_workable_days || [1, 2, 3, 4, 5];

    if (todayStr === startStr && config.enable_sprint_kickoff) {
      return "sprint_kickoff";
    }

    if (todayStr === endStr && config.enable_sprint_review) {
      return "sprint_review";
    }

    if (
      todayStr > startStr &&
      todayStr < endStr &&
      workableDays.includes(dayOfWeek) &&
      config.enable_daily_standup
    ) {
      return "daily_standup";
    }

    return null;
  }

  /**
   * Calculates the next report timestamp.
   */
  calculateNextReportAt(config) {
    const sprintStart = config.sprint_start;
    const sprintEnd = config.sprint_end;
    const workableDays = config.sprint_workable_days ||
      config.default_workable_days || [1, 2, 3, 4, 5];

    if (!sprintStart || !sprintEnd) return null;

    const [hours, minutes] = (config.report_time_utc || "14:00").split(":");
    const now = new Date();

    const startStr =
      typeof sprintStart === "string"
        ? sprintStart.split("T")[0]
        : new Date(sprintStart).toISOString().split("T")[0];
    const endStr =
      typeof sprintEnd === "string"
        ? sprintEnd.split("T")[0]
        : new Date(sprintEnd).toISOString().split("T")[0];

    const start = new Date(startStr + "T00:00:00Z");
    const end = new Date(endStr + "T00:00:00Z");

    // Start from tomorrow (we already handled today)
    const tomorrow = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)
    );
    let candidate = new Date(Math.max(tomorrow.getTime(), start.getTime()));

    while (candidate <= end) {
      const dayOfWeek = candidate.getUTCDay();
      const isStartDay = candidate.getTime() === start.getTime();
      const isEndDay = candidate.getTime() === end.getTime();
      const isWorkableDay = workableDays.includes(dayOfWeek);

      let hasReport = false;

      if (isStartDay && config.enable_sprint_kickoff) {
        hasReport = true;
      } else if (isEndDay && config.enable_sprint_review) {
        hasReport = true;
      } else if (
        !isStartDay &&
        !isEndDay &&
        isWorkableDay &&
        config.enable_daily_standup
      ) {
        hasReport = true;
      }

      if (hasReport) {
        const reportTime = new Date(candidate);
        reportTime.setUTCHours(
          parseInt(hours, 10),
          parseInt(minutes, 10),
          0,
          0
        );
        return reportTime.toISOString();
      }

      candidate.setUTCDate(candidate.getUTCDate() + 1);
    }

    return null;
  }

  /**
   * Completes the current sprint and auto-creates the next one.
   */
  async advanceSprint(config) {
    // Mark current sprint as completed
    await executeQuery(
      `UPDATE project_sprints
       SET status = 'completed', completed_at = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [config.sprint_id]
    );

    // Calculate next sprint dates
    const prevEnd = new Date(config.sprint_end);
    const nextStart = new Date(prevEnd);
    nextStart.setDate(nextStart.getDate() + 1);
    const nextEnd = new Date(nextStart);
    nextEnd.setDate(
      nextEnd.getDate() + (config.default_sprint_duration_days || 14) - 1
    );

    const nextNumber = config.sprint_number + 1;

    // Create next sprint
    const newSprints = await executeQuery(
      `INSERT INTO project_sprints (
        project_id, sprint_number, title, status,
        start_date, end_date, workable_days
      )
      VALUES ($1, $2, $3, 'active', $4, $5, $6)
      RETURNING id`,
      [
        config.project_id,
        nextNumber,
        `Sprint ${nextNumber}`,
        nextStart.toISOString().split("T")[0],
        nextEnd.toISOString().split("T")[0],
        config.default_workable_days || [1, 2, 3, 4, 5],
      ]
    );

    const newSprintId = newSprints[0]?.id;

    // Calculate next report for new sprint
    const nextAt = this.calculateNextReportAt({
      ...config,
      sprint_start: nextStart.toISOString().split("T")[0],
      sprint_end: nextEnd.toISOString().split("T")[0],
    });

    await this.updateSchedulerState(config.id, {
      current_sprint_id: newSprintId,
      last_report_type: "sprint_review",
      last_report_at: new Date().toISOString(),
      next_report_at: nextAt,
    });

    logger.info("AI report scheduler: sprint advanced", {
      projectId: config.project_id,
      completedSprint: config.sprint_number,
      newSprint: nextNumber,
    });
  }

  /**
   * Updates scheduler state on the config row.
   */
  async updateSchedulerState(configId, state) {
    const fields = [];
    const values = [configId];
    let idx = 2;

    for (const [key, value] of Object.entries(state)) {
      fields.push(`${key} = $${idx}`);
      values.push(value);
      idx++;
    }

    if (fields.length === 0) return;

    await executeQuery(
      `UPDATE project_ai_report_configs
       SET ${fields.join(", ")}, updated_at = NOW()
       WHERE id = $1`,
      values
    );
  }

  stop() {
    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

module.exports = new AiReportSchedulerProcessor();
