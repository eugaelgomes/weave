const redis = require("@/services/queue/consumer-connection");
const {
  getEngineProactiveResponseQueueRedisKey,
  getEngineProactiveTaskQueueRedisKey,
  getReasoningTriggerQueueRedisKey,
} = require("@/services/queue/queue-keys");
const sprintContextBuilder = require("./sprint-context-builder");
const {
  appendInstructionBlock,
  resolveInstructionAppends,
} = require("@/utils/mcp.util");

class ReasoningTriggerConsumer {
  constructor() {
    this.isRunning = false;
    this.engineQueueKey = getEngineProactiveTaskQueueRedisKey();
    this.responseQueueKey = getEngineProactiveResponseQueueRedisKey();
  }

  async start() {
    if (this.isRunning) return;
    this.isRunning = true;

    const queueKey = getReasoningTriggerQueueRedisKey();
    console.info(`[Reasoning Trigger Consumer] Listening on: ${queueKey}`);

    while (this.isRunning) {
      try {
        const result = await redis.blpop(queueKey, 0);

        if (result) {
          const [, payloadStr] = result;
          await this.processTrigger(JSON.parse(payloadStr));
        }
      } catch (error) {
        console.error("[Reasoning Trigger Consumer] Error in loop:", error);
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }
  }

  /**
   * Processes a reasoning trigger from the worker:
   * 1. Fetches all necessary data (notes, blocks, members).
   * 2. Builds markdown context.
   * 3. Pushes the full job to the Engine.
   *
   * @param {object} trigger
   */
  async processTrigger(trigger) {
    const { projectId, reportType, config } = trigger;

    console.info(
      `[Reasoning Trigger Consumer] Building context for project: ${projectId}, type: ${reportType}`
    );

    try {
      // 1. Build context (Data fetching happens here in the API)
      const context = await sprintContextBuilder.build(config);
      const normalizedType = this._normalizeReportType(reportType || trigger.reasoningType);
      const customAppends = resolveInstructionAppends(
        config?.reasoning_instructions,
        normalizedType
      );
      const prompt = this._buildPrompt(normalizedType, context, customAppends.promptAppend);
      const systemMessage = this._buildSystemMessage(normalizedType, customAppends.systemAppend);
      const sprintId = trigger.sprintId || config?.current_sprint_id || config?.sprint_id || null;

      // 2. Prepare Engine Job
      const job = {
        channels: Array.isArray(config?.channels) ? config.channels : ["in_app"],
        createdAt: new Date().toISOString(),
        customRecipients: Array.isArray(config?.custom_recipients) ? config.custom_recipients : [],
        expiresAt: this._buildExpiresAt(config),
        inputContext: context || {},
        model: process.env.WEAVE_PROACTIVE_MODEL || null,
        options: {
          allowEdit: false,
        },
        organizationId: config?.organization_id || null,
        projectId,
        prompt,
        reasoningType: normalizedType,
        recipientScope: config?.recipient_scope || "all_members",
        reportConfigId: config?.id || null,
        responseQueueKey: this.responseQueueKey,
        sprintId,
        systemMessage,
        title:
          trigger.title ||
          `${this._toLabel(normalizedType)} - ${new Date().toISOString().slice(0, 10)}`,
        triggeredBy: config?.user_id || trigger.triggeredBy || null,
        type: normalizedType,
      };

      // 3. Push to Engine
      await redis.rpush(this.engineQueueKey, JSON.stringify(job));
      console.info(`[Reasoning Trigger Consumer] Job pushed to engine for project: ${projectId}`);
    } catch (error) {
      console.error("[Reasoning Trigger Consumer] Failed to process trigger:", error);
    }
  }

  stop() {
    this.isRunning = false;
  }

  /**
   * @param {string | undefined | null} reportType
   * @returns {string}
   */
  _normalizeReportType(reportType) {
    const type = String(reportType || "").trim();
    if (
      type === "sprint_kickoff" ||
      type === "daily_standup" ||
      type === "sprint_review" ||
      type === "deadline_alert" ||
      type === "analysis"
    ) {
      return type;
    }
    return "analysis";
  }

  /**
   * @param {string} reportType
   * @param {{ fullContext?: string, stats?: object }} context
   * @returns {string}
   */
  _buildPrompt(reportType, context, customAppend = "") {
    const baseContext =
      typeof context?.fullContext === "string" && context.fullContext.trim().length > 0
        ? context.fullContext.trim()
        : "No structured sprint context available.";

    const intentByType = {
      analysis:
        "Create an operational project analysis highlighting key signals, risk areas and next actions.",
      daily_standup:
        "Create a daily standup briefing with progress, blockers, deadlines at risk and prioritized next actions.",
      deadline_alert:
        "Create a focused deadline risk alert with impacted tasks and immediate mitigation actions.",
      sprint_kickoff:
        "Create a kickoff briefing for the current sprint with priorities, risks and first actions.",
      sprint_review:
        "Create a sprint review summary with outcomes, risks that materialized, and recommendations for the next sprint.",
    };

    const base = [
      intentByType[reportType] || intentByType.analysis,
      "",
      "Use concise markdown with these sections:",
      "1) Summary",
      "2) Risks",
      "3) Suggested actions",
      "4) Why this matters",
      "",
      "Project context:",
      baseContext,
    ].join("\n");

    return appendInstructionBlock(base, customAppend);
  }

  /**
   * @param {string} reportType
   * @returns {string}
   */
  _buildSystemMessage(reportType, customAppend = "") {
    const base = [
      "You are Weave Engine, the proactive operational intelligence core for project execution.",
      `Report type: ${reportType}.`,
      "Write professional markdown in pt-BR.",
      "Be direct, evidence-based, and avoid generic statements.",
      "Never invent data that is not present in the provided context.",
      "Always include at least three actionable recommendations.",
    ].join(" ");

    return appendInstructionBlock(base, customAppend);
  }

  /**
   * @param {object} config
   * @returns {string|null}
   */
  _buildExpiresAt(config) {
    const sprintEnd = config?.sprint_end || config?.current_sprint_end || null;
    if (!sprintEnd) return null;
    const asIsoDate =
      typeof sprintEnd === "string"
        ? sprintEnd.slice(0, 10)
        : new Date(sprintEnd).toISOString().slice(0, 10);
    return `${asIsoDate}T23:59:59.999Z`;
  }

  /**
   * @param {string} reportType
   * @returns {string}
   */
  _toLabel(reportType) {
    const labels = {
      analysis: "Analysis",
      daily_standup: "Daily standup",
      deadline_alert: "Deadline alert",
      sprint_kickoff: "Sprint kickoff",
      sprint_review: "Sprint review",
    };
    return labels[reportType] || "Reasoning";
  }
}

module.exports = new ReasoningTriggerConsumer();
