const { pool } = require("@/database/connection");

class ReportConfigRepository {
  /**
   * Gets the AI report config for a project.
   *
   * @param {string} projectId
   * @returns {Promise<object|undefined>}
   */
  async getByProjectId(projectId) {
    const query = `      SELECT
        rc.*,
        ps.sprint_number AS current_sprint_number,
        ps.title AS current_sprint_title,
        ps.status AS current_sprint_status,
        ps.start_date AS current_sprint_start,
        ps.end_date AS current_sprint_end
      FROM project_ai_report_configs rc
      LEFT JOIN project_sprints ps ON ps.id = rc.current_sprint_id AND ps.deleted = false
      WHERE rc.project_id = $1 AND rc.deleted = false
      LIMIT 1`;

    const result = await pool.query(query, [projectId]);
    return result.rows[0];
  }

  /**
   * Creates or updates the AI report config for a project (upsert).
   *
   * @param {string} projectId
   * @param {string} userId
   * @param {object} config
   * @returns {Promise<object>}
   */
  async upsert(projectId, userId, config) {
    const query = `      INSERT INTO project_ai_report_configs (
        project_id,
        user_id,
        enabled,
        default_sprint_duration_days,
        default_workable_days,
        auto_create_next_sprint,
        enable_sprint_kickoff,
        enable_daily_standup,
        enable_sprint_review,
        report_time_utc,
        channels,
        recipient_scope,
        custom_recipients,
        current_sprint_id,
        next_report_at,
        reasoning_instructions
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8,
        $9,
        $10,
        $11,
        $12,
        $13,
        $14,
        $15,
        COALESCE($16, '{}'::jsonb)
      )
      ON CONFLICT (project_id)
      DO UPDATE SET
        user_id = EXCLUDED.user_id,
        enabled = EXCLUDED.enabled,
        default_sprint_duration_days = EXCLUDED.default_sprint_duration_days,
        default_workable_days = EXCLUDED.default_workable_days,
        auto_create_next_sprint = EXCLUDED.auto_create_next_sprint,
        enable_sprint_kickoff = EXCLUDED.enable_sprint_kickoff,
        enable_daily_standup = EXCLUDED.enable_daily_standup,
        enable_sprint_review = EXCLUDED.enable_sprint_review,
        report_time_utc = EXCLUDED.report_time_utc,
        channels = EXCLUDED.channels,
        recipient_scope = EXCLUDED.recipient_scope,
        custom_recipients = EXCLUDED.custom_recipients,
        current_sprint_id = COALESCE(EXCLUDED.current_sprint_id, project_ai_report_configs.current_sprint_id),
        next_report_at = EXCLUDED.next_report_at,
        reasoning_instructions = COALESCE(
          EXCLUDED.reasoning_instructions,
          project_ai_report_configs.reasoning_instructions
        ),
        updated_at = NOW()
      RETURNING *`;

    const result = await pool.query(query, [
      projectId,
      userId,
      config.enabled !== false,
      config.default_sprint_duration_days || 14,
      config.default_workable_days || [1, 2, 3, 4, 5],
      config.auto_create_next_sprint !== false,
      config.enable_sprint_kickoff !== false,
      config.enable_daily_standup !== false,
      config.enable_sprint_review !== false,
      config.report_time_utc || "14:00",
      config.channels || ["in_app"],
      config.recipient_scope || "all_members",
      JSON.stringify(config.custom_recipients || []),
      config.current_sprint_id || null,
      config.next_report_at || null,
      config.reasoning_instructions !== undefined
        ? JSON.stringify(config.reasoning_instructions)
        : null,
    ]);
    return result.rows[0];
  }

  /**
   * Updates scheduler state fields (used by the worker).
   *
   * @param {string} configId
   * @param {object} state
   * @returns {Promise<object|undefined>}
   */
  async updateSchedulerState(configId, state) {
    const fields = [];
    const values = [configId];
    let paramIndex = 2;

    const allowedFields = [
      "current_sprint_id",
      "last_report_type",
      "last_report_at",
      "next_report_at",
    ];

    for (const [key, value] of Object.entries(state)) {
      if (allowedFields.includes(key)) {
        fields.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    if (fields.length === 0) return null;

    const query = `
      UPDATE project_ai_report_configs
      SET ${fields.join(", ")},
      updated_at = NOW()
      WHERE id = $1 AND deleted = false
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Soft-deletes a report config.
   *
   * @param {string} projectId
   * @returns {Promise<boolean>}
   */
  async delete(projectId) {
    const query = `      UPDATE project_ai_report_configs
      SET deleted = true,
      deleted_at = NOW(),
      enabled = false
      WHERE project_id = $1`;

    await pool.query(query, [projectId]);
    return true;
  }

  /**
   * Gets all configs that are due for a report.
   * Used by the worker scheduler.
   *
   * @returns {Promise<object[]>}
   */
  async getDueConfigs() {
    const query = `      SELECT
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
        AND rc.next_report_at <= NOW()`;

    const result = await pool.query(query);
    return result.rows;
  }
}

module.exports = new ReportConfigRepository();
