const { pool } = require("@/database/connection");

class SprintsRepository {
  /**
   * Creates a new sprint for a project.
   *
   * @param {object} data
   * @returns {Promise<object>}
   */
  async create(data) {
    const query = `
      INSERT INTO project_sprints (
        project_id, sprint_number, title, goal, status,
        start_date, end_date, workable_days
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const result = await pool.query(query, [
      data.projectId,
      data.sprintNumber || 1,
      data.title || null,
      data.goal || null,
      data.status || "planned",
      data.startDate,
      data.endDate,
      data.workableDays || [1, 2, 3, 4, 5],
    ]);
    return result.rows[0];
  }

  /**
   * Gets the active sprint for a project.
   *
   * @param {string} projectId
   * @returns {Promise<object|undefined>}
   */
  async getActiveByProject(projectId) {
    const query = `
      SELECT *
      FROM project_sprints
      WHERE project_id = $1
        AND status = 'active'
        AND deleted = false
      ORDER BY sprint_number DESC
      LIMIT 1
    `;

    const result = await pool.query(query, [projectId]);
    return result.rows[0];
  }

  /**
   * Gets all sprints for a project (history).
   *
   * @param {string} projectId
   * @param {number} [limit=20]
   * @returns {Promise<object[]>}
   */
  async getAllByProject(projectId, limit = 20) {
    const query = `
      SELECT *
      FROM project_sprints
      WHERE project_id = $1
        AND deleted = false
      ORDER BY sprint_number DESC
      LIMIT $2
    `;

    const result = await pool.query(query, [projectId, limit]);
    return result.rows;
  }

  /**
   * Gets a sprint by ID.
   *
   * @param {string} sprintId
   * @returns {Promise<object|undefined>}
   */
  async getById(sprintId) {
    const query = `
      SELECT *
      FROM project_sprints
      WHERE id = $1 AND deleted = false
      LIMIT 1
    `;

    const result = await pool.query(query, [sprintId]);
    return result.rows[0];
  }

  /**
   * Gets the next sprint number for a project.
   *
   * @param {string} projectId
   * @returns {Promise<number>}
   */
  async getNextSprintNumber(projectId) {
    const query = `
      SELECT COALESCE(MAX(sprint_number), 0) + 1 AS next_number
      FROM project_sprints
      WHERE project_id = $1 AND deleted = false
    `;

    const result = await pool.query(query, [projectId]);
    return result.rows[0].next_number;
  }

  /**
   * Activates a sprint (sets status to 'active').
   *
   * @param {string} sprintId
   * @returns {Promise<object|undefined>}
   */
  async activate(sprintId) {
    const query = `
      UPDATE project_sprints
      SET status = 'active', updated_at = NOW()
      WHERE id = $1 AND deleted = false
      RETURNING *
    `;

    const result = await pool.query(query, [sprintId]);
    return result.rows[0];
  }

  /**
   * Completes a sprint.
   *
   * @param {string} sprintId
   * @param {object} [completionData]
   * @param {string} [completionData.summary]
   * @param {object} [completionData.metrics]
   * @returns {Promise<object|undefined>}
   */
  async complete(sprintId, completionData = {}) {
    const query = `
      UPDATE project_sprints
      SET status = 'completed',
          completed_at = NOW(),
          summary = COALESCE($2, summary),
          metrics = CASE
            WHEN $3::jsonb IS NOT NULL THEN metrics || $3::jsonb
            ELSE metrics
          END,
          updated_at = NOW()
      WHERE id = $1 AND deleted = false
      RETURNING *
    `;

    const result = await pool.query(query, [
      sprintId,
      completionData.summary || null,
      completionData.metrics ? JSON.stringify(completionData.metrics) : null,
    ]);
    return result.rows[0];
  }

  /**
   * Cancels a sprint.
   *
   * @param {string} sprintId
   * @returns {Promise<object|undefined>}
   */
  async cancel(sprintId) {
    const query = `
      UPDATE project_sprints
      SET status = 'cancelled', updated_at = NOW()
      WHERE id = $1 AND deleted = false
      RETURNING *
    `;

    const result = await pool.query(query, [sprintId]);
    return result.rows[0];
  }
}

module.exports = new SprintsRepository();
