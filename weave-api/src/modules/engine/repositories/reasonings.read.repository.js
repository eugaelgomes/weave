const { pool } = require("@/database/connection");

class ReasoningsReadRepository {
  /**
   * Lists reasonings for a project+sprint, scoped by project_members access.
   *
   * @param {string} projectId
   * @param {string} userId
   * @param {object} [options]
   * @param {string} [options.sprintId]
   * @param {string} [options.reasoningType]
   * @param {number} [options.limit]
   * @returns {Promise<object[]>}
   */
  async getByProjectSprint(projectId, userId, options = {}) {
    const limit = Math.min(parseInt(options.limit) || 20, 50);
    const params = [projectId, userId, limit];
    let paramIdx = 4;

    let sprintFilter = "";
    if (options.sprintId) {
      sprintFilter = `AND r.sprint_id = $${paramIdx}`;
      params.push(options.sprintId);
      paramIdx++;
    }

    let typeFilter = "";
    if (options.reasoningType) {
      typeFilter = `AND r.reasoning_type = $${paramIdx}::weave_engine_reasoning_type`;
      params.push(options.reasoningType);
      paramIdx++;
    }

    const query = `
      SELECT
        r.id,
        r.reasoning_type,
        r.title,
        r.status,
        r.safety_label,
        r.safety_blocked,
        r.provider_used,
        r.model_used,
        r.action_items_count,
        r.processing_time_ms,
        r.recipient_scope,
        r.expires_at,
        r.created_at,
        r.updated_at,
        ri.is_read,
        ri.is_pinned,
        ri.is_dismissed,
        ri.feedback,
        ps.sprint_number,
        ps.title AS sprint_title
      FROM weave_engine_reasonings r
      LEFT JOIN weave_engine_reasoning_interactions ri
        ON ri.reasoning_id = r.id
        AND ri.user_id = $2
      LEFT JOIN project_sprints ps
        ON ps.id = r.sprint_id
        AND ps.deleted = false
      WHERE r.project_id = $1
        AND r.deleted = false
        AND r.safety_blocked = false
        ${sprintFilter}
        ${typeFilter}
        AND (
          r.recipient_scope = 'all_members'
          OR (r.recipient_scope = 'owner_only' AND r.triggered_by = $2)
          OR (r.recipient_scope = 'custom' AND r.custom_recipients @> to_jsonb($2::text))
        )
      ORDER BY r.created_at DESC
      LIMIT $3
    `;

    const result = await pool.query(query, params);
    return result.rows;
  }

  /**
   * Lists reasonings with filters, sorting, and pagination (member-scoped).
   *
   * @param {string} projectId
   * @param {string} userId
   * @param {Record<string, unknown>} filters
   * @param {{ limit: number, offset: number }} pagination
   * @param {{ field: string, order: string }} sort
   * @returns {Promise<{ rows: object[], total: number }>}
   */
  async listByProjectForMember(projectId, userId, filters, pagination, sort) {
    const params = [projectId, userId];
    let paramIdx = 3;

    let sprintFilter = "";
    if (filters.sprintId) {
      sprintFilter = `AND r.sprint_id = $${paramIdx}::uuid`;
      params.push(filters.sprintId);
      paramIdx++;
    }

    let typeFilter = "";
    if (filters.reasoningType) {
      typeFilter = `AND r.reasoning_type = $${paramIdx}::weave_engine_reasoning_type`;
      params.push(filters.reasoningType);
      paramIdx++;
    }

    let dateFrom = "";
    if (filters.from) {
      dateFrom = `AND r.created_at >= $${paramIdx}::timestamptz`;
      params.push(filters.from);
      paramIdx++;
    }

    let dateTo = "";
    if (filters.to) {
      dateTo = `AND r.created_at <= $${paramIdx}::timestamptz`;
      params.push(filters.to);
      paramIdx++;
    }

    let createdByFilter = "";
    if (filters.created_by) {
      createdByFilter = `AND r.triggered_by = $${paramIdx}::uuid`;
      params.push(filters.created_by);
      paramIdx++;
    }

    let readFilter = "";
    if (filters.is_read === true) {
      readFilter = `AND COALESCE(ri.is_read, false) = true`;
    } else if (filters.is_read === false) {
      readFilter = `AND COALESCE(ri.is_read, false) = false`;
    }

    let pinnedFilter = "";
    if (filters.is_pinned === true) {
      pinnedFilter = `AND COALESCE(ri.is_pinned, false) = true`;
    } else if (filters.is_pinned === false) {
      pinnedFilter = `AND COALESCE(ri.is_pinned, false) = false`;
    }

    let dismissedFilter = "";
    if (filters.is_dismissed === true) {
      dismissedFilter = `AND COALESCE(ri.is_dismissed, false) = true`;
    } else if (filters.is_dismissed === false) {
      dismissedFilter = `AND COALESCE(ri.is_dismissed, false) = false`;
    }

    const sortCol =
      sort.field === "updated_at" ? "r.updated_at" : "r.created_at";
    const sortDir = sort.order === "asc" ? "ASC" : "DESC";

    params.push(pagination.limit);
    const limIdx = paramIdx;
    paramIdx++;
    params.push(pagination.offset);
    const offIdx = paramIdx;

    const query = `
      SELECT
        r.id,
        r.reasoning_type,
        r.title,
        r.status,
        r.safety_label,
        r.safety_blocked,
        r.provider_used,
        r.model_used,
        r.action_items_count,
        r.processing_time_ms,
        r.recipient_scope,
        r.expires_at,
        r.created_at,
        r.updated_at,
        ri.is_read,
        ri.is_pinned,
        ri.is_dismissed,
        ri.feedback,
        ps.sprint_number,
        ps.title AS sprint_title,
        COUNT(*) OVER() AS total_count
      FROM weave_engine_reasonings r
      LEFT JOIN weave_engine_reasoning_interactions ri
        ON ri.reasoning_id = r.id
        AND ri.user_id = $2::uuid
      LEFT JOIN project_sprints ps
        ON ps.id = r.sprint_id
        AND ps.deleted = false
      WHERE r.project_id = $1::uuid
        AND r.deleted = false
        AND r.safety_blocked = false
        ${sprintFilter}
        ${typeFilter}
        ${dateFrom}
        ${dateTo}
        ${createdByFilter}
        ${readFilter}
        ${pinnedFilter}
        ${dismissedFilter}
        AND (
          r.recipient_scope = 'all_members'
          OR (r.recipient_scope = 'owner_only' AND r.triggered_by = $2::uuid)
          OR (r.recipient_scope = 'custom' AND r.custom_recipients @> to_jsonb($2::text))
        )
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
   * Gets the heavy content payload for a single reasoning.
   *
   * @param {string} reasoningId
   * @returns {Promise<object|undefined>}
   */
  async getContentById(reasoningId) {
    const query = `
      SELECT
        rc.*,
        r.title,
        r.reasoning_type,
        r.status,
        r.safety_label,
        r.created_at AS reasoning_created_at
      FROM weave_engine_reasoning_contents rc
      INNER JOIN weave_engine_reasonings r ON r.id = rc.reasoning_id
      WHERE rc.reasoning_id = $1
    `;

    const result = await pool.query(query, [reasoningId]);
    return result.rows[0];
  }

  /**
   * Gets action items for a reasoning.
   *
   * @param {string} reasoningId
   * @returns {Promise<object[]>}
   */
  async getActionItemsByReasoning(reasoningId) {
    const query = `
      SELECT
        ai.*,
        u.name AS assigned_to_name,
        u.avatar_url AS assigned_to_avatar,
        cb.name AS completed_by_name
      FROM weave_engine_reasoning_action_items ai
      LEFT JOIN users u ON u.user_id = ai.assigned_to
      LEFT JOIN users cb ON cb.user_id = ai.completed_by
      WHERE ai.reasoning_id = $1
        AND ai.deleted = false
      ORDER BY ai.position ASC
    `;

    const result = await pool.query(query, [reasoningId]);
    return result.rows;
  }
}

module.exports = new ReasoningsReadRepository();
