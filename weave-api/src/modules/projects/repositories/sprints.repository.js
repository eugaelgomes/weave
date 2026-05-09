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
   * Filtered, sorted, paginated sprint history for a project.
   *
   * @param {string} projectId
   * @param {Record<string, unknown>} filters
   * @param {{ limit: number, offset: number }} pagination
   * @param {{ field: string, order: string }} sort
   * @returns {Promise<{ rows: object[], total: number }>}
   */
  async getFilteredByProject(projectId, filters, pagination, sort) {
    const conditions = ["project_id = $1::uuid", "deleted = false"];
    const params = [projectId];
    let i = 2;

    if (filters.status?.length) {
      params.push(filters.status);
      conditions.push(`status = ANY($${i}::text[])`);
      i++;
    }

    const toDateStr = (v) => {
      if (!v) return null;
      if (v instanceof Date) return v.toISOString().slice(0, 10);
      if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v))
        return v.slice(0, 10);
      const d = new Date(v);
      return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
    };

    const sf = toDateStr(filters.start_from);
    const st = toDateStr(filters.start_to);
    const ef = toDateStr(filters.end_from);
    const et = toDateStr(filters.end_to);

    if (sf) {
      params.push(sf);
      conditions.push(`start_date >= $${i}::date`);
      i++;
    }
    if (st) {
      params.push(st);
      conditions.push(`start_date <= $${i}::date`);
      i++;
    }
    if (ef) {
      params.push(ef);
      conditions.push(`end_date >= $${i}::date`);
      i++;
    }
    if (et) {
      params.push(et);
      conditions.push(`end_date <= $${i}::date`);
      i++;
    }

    const sortMap = {
      sprint_number: "sprint_number",
      start_date: "start_date",
      end_date: "end_date",
    };
    const sortCol = sortMap[sort.field] || "sprint_number";
    const sortDir = sort.order === "asc" ? "ASC" : "DESC";

    params.push(pagination.limit);
    const limIdx = i;
    i++;
    params.push(pagination.offset);
    const offIdx = i;

    const whereClause = conditions.join(" AND ");
    const query = `
      SELECT *,
        COUNT(*) OVER() AS total_count
      FROM project_sprints
      WHERE ${whereClause}
      ORDER BY ${sortCol} ${sortDir}
      LIMIT $${limIdx} OFFSET $${offIdx}
    `;

    const result = await pool.query(query, params);
    const rows = result.rows;
    const total =
      rows.length > 0 ? parseInt(String(rows[0].total_count), 10) || 0 : 0;
    const stripped = rows.map((r) => {
      const row = { ...r };
      delete row.total_count;
      return row;
    });
    return { rows: stripped, total };
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
