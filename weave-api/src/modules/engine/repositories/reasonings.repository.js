const { pool } = require("@/database/connection");

class ReasoningsRepository {
  // ══════════════════════════════════════════════════════════════════════
  // CREATE
  // ══════════════════════════════════════════════════════════════════════

  /**
   * Creates a reasoning and its content in a single transaction.
   *
   * @param {object} data
   * @param {string} data.projectId
   * @param {string} data.sprintId
   * @param {string} data.triggeredBy
   * @param {string} data.reasoningType
   * @param {string} data.title
   * @param {object} data.content - Heavy payload (output_markdown, input_context, etc.)
   * @param {object} [data.options] - Optional metadata (provider, model, safety, etc.)
   * @returns {Promise<object>}
   */
  async create(data) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const opts = data.options || {};

      // 1. Insert lean reasoning
      const reasoningResult = await client.query(
        `INSERT INTO weave_engine_reasonings (
          project_id, sprint_id, report_config_id, organization_id,
          triggered_by, reasoning_type, title,
          provider_used, model_used,
          safety_label, safety_reason, safety_blocked,
          status, error_message, processing_time_ms,
          recipient_scope, custom_recipients, action_items_count,
          expires_at
        )
        VALUES (
          $1, $2, $3, $4,
          $5, $6, $7,
          $8, $9,
          $10, $11, $12,
          $13, $14, $15,
          $16, $17, $18,
          $19
        )
        RETURNING *`,
        [
          data.projectId,
          data.sprintId,
          opts.reportConfigId || null,
          opts.organizationId || null,
          data.triggeredBy,
          data.reasoningType,
          data.title,
          opts.providerUsed || null,
          opts.modelUsed || null,
          opts.safetyLabel || "safe",
          opts.safetyReason || null,
          opts.safetyBlocked || false,
          opts.status || "completed",
          opts.errorMessage || null,
          opts.processingTimeMs || null,
          opts.recipientScope || "all_members",
          JSON.stringify(opts.customRecipients || []),
          opts.actionItemsCount || 0,
          opts.expiresAt || null,
        ]
      );

      const reasoning = reasoningResult.rows[0];

      // 2. Insert heavy content
      const content = data.content || {};
      await client.query(
        `INSERT INTO weave_engine_reasoning_contents (
          reasoning_id, output_markdown, output_raw,
          output_metadata, input_context,
          input_prompt, input_system_message
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          reasoning.id,
          content.outputMarkdown || "",
          content.outputRaw ? JSON.stringify(content.outputRaw) : null,
          JSON.stringify(content.outputMetadata || {}),
          JSON.stringify(content.inputContext || {}),
          content.inputPrompt || null,
          content.inputSystemMessage || null,
        ]
      );

      // 3. Insert action items if provided
      if (
        Array.isArray(content.actionItems) &&
        content.actionItems.length > 0
      ) {
        const actionValues = content.actionItems.map((item, idx) => [
          reasoning.id,
          item.noteId || null,
          idx,
          item.content,
          item.priority || null,
          item.assignedTo || null,
        ]);

        const placeholders = actionValues
          .map(
            (_, i) =>
              `($${i * 6 + 1}, $${i * 6 + 2}, $${i * 6 + 3}, $${i * 6 + 4}, $${i * 6 + 5}, $${i * 6 + 6})`
          )
          .join(", ");

        await client.query(
          `INSERT INTO weave_engine_reasoning_action_items
            (reasoning_id, note_id, position, content, priority, assigned_to)
          VALUES ${placeholders}`,
          actionValues.flat()
        );

        // Update count
        await client.query(
          `UPDATE weave_engine_reasonings
           SET action_items_count = $2
           WHERE id = $1`,
          [reasoning.id, content.actionItems.length]
        );
        reasoning.action_items_count = content.actionItems.length;
      }

      await client.query("COMMIT");
      return reasoning;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  // ══════════════════════════════════════════════════════════════════════
  // READ
  // ══════════════════════════════════════════════════════════════════════

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
        r.id, r.reasoning_type, r.title, r.status, r.safety_label,
        r.safety_blocked, r.provider_used, r.model_used,
        r.action_items_count, r.processing_time_ms,
        r.recipient_scope, r.expires_at,
        r.created_at, r.updated_at,
        ri.is_read, ri.is_pinned, ri.is_dismissed, ri.feedback,
        ps.sprint_number, ps.title AS sprint_title
      FROM weave_engine_reasonings r
      INNER JOIN project_members pm
        ON pm.project_id = r.project_id
        AND pm.user_id = $2
        AND pm.deleted = false
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
        r.id, r.reasoning_type, r.title, r.status, r.safety_label,
        r.safety_blocked, r.provider_used, r.model_used,
        r.action_items_count, r.processing_time_ms,
        r.recipient_scope, r.expires_at,
        r.created_at, r.updated_at,
        ri.is_read, ri.is_pinned, ri.is_dismissed, ri.feedback,
        ps.sprint_number, ps.title AS sprint_title,
        COUNT(*) OVER() AS total_count
      FROM weave_engine_reasonings r
      INNER JOIN project_members pm
        ON pm.project_id = r.project_id
        AND pm.user_id = $2::uuid
        AND pm.deleted = false
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
      SELECT rc.*, r.title, r.reasoning_type, r.status,
        r.safety_label, r.created_at AS reasoning_created_at
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

  // ══════════════════════════════════════════════════════════════════════
  // INTERACTIONS
  // ══════════════════════════════════════════════════════════════════════

  /**
   * Upserts a member interaction (read, dismiss, pin, feedback).
   *
   * @param {string} reasoningId
   * @param {string} userId
   * @param {object} data
   * @returns {Promise<object>}
   */
  async upsertInteraction(reasoningId, userId, data = {}) {
    const fields = [];
    const conflictUpdates = [];
    const values = [reasoningId, userId];
    let paramIdx = 3;

    // Build dynamic upsert
    if (data.isRead !== undefined) {
      fields.push("is_read");
      values.push(data.isRead);
      conflictUpdates.push(`is_read = $${paramIdx}`);
      paramIdx++;

      if (data.isRead) {
        fields.push("read_at");
        values.push(new Date());
        conflictUpdates.push(`read_at = $${paramIdx}`);
        paramIdx++;
      }
    }

    if (data.isDismissed !== undefined) {
      fields.push("is_dismissed");
      values.push(data.isDismissed);
      conflictUpdates.push(`is_dismissed = $${paramIdx}`);
      paramIdx++;

      fields.push("dismissed_at");
      values.push(data.isDismissed ? new Date() : null);
      conflictUpdates.push(`dismissed_at = $${paramIdx}`);
      paramIdx++;
    }

    if (data.isPinned !== undefined) {
      fields.push("is_pinned");
      values.push(data.isPinned);
      conflictUpdates.push(`is_pinned = $${paramIdx}`);
      paramIdx++;

      fields.push("pinned_at");
      values.push(data.isPinned ? new Date() : null);
      conflictUpdates.push(`pinned_at = $${paramIdx}`);
      paramIdx++;
    }

    if (data.feedback !== undefined) {
      fields.push("feedback");
      values.push(data.feedback);
      conflictUpdates.push(`feedback = $${paramIdx}`);
      paramIdx++;

      fields.push("feedback_at");
      values.push(data.feedback ? new Date() : null);
      conflictUpdates.push(`feedback_at = $${paramIdx}`);
      paramIdx++;
    }

    if (fields.length === 0) {
      return null;
    }

    const allColumns = ["reasoning_id", "user_id", ...fields];
    const allPlaceholders = allColumns.map((_, i) => `$${i + 1}`).join(", ");

    const query = `
      INSERT INTO weave_engine_reasoning_interactions (${allColumns.join(", ")})
      VALUES (${allPlaceholders})
      ON CONFLICT (reasoning_id, user_id)
      DO UPDATE SET ${conflictUpdates.join(", ")}, updated_at = NOW()
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  // ══════════════════════════════════════════════════════════════════════
  // ACTION ITEMS
  // ══════════════════════════════════════════════════════════════════════

  /**
   * Updates an action item (complete, assign, etc.).
   *
   * @param {string} actionItemId
   * @param {object} data
   * @returns {Promise<object|undefined>}
   */
  async updateActionItem(actionItemId, data = {}) {
    const fields = [];
    const values = [actionItemId];
    let paramIdx = 2;

    if (data.isCompleted !== undefined) {
      fields.push(`is_completed = $${paramIdx}`);
      values.push(data.isCompleted);
      paramIdx++;

      fields.push(`completed_at = $${paramIdx}`);
      values.push(data.isCompleted ? new Date() : null);
      paramIdx++;

      if (data.completedBy) {
        fields.push(`completed_by = $${paramIdx}`);
        values.push(data.completedBy);
        paramIdx++;
      }
    }

    if (data.assignedTo !== undefined) {
      fields.push(`assigned_to = $${paramIdx}`);
      values.push(data.assignedTo);
      paramIdx++;
    }

    if (data.priority !== undefined) {
      fields.push(`priority = $${paramIdx}`);
      values.push(data.priority);
      paramIdx++;
    }

    if (fields.length === 0) {
      return null;
    }

    const query = `
      UPDATE weave_engine_reasoning_action_items
      SET ${fields.join(", ")}
      WHERE id = $1 AND deleted = false
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows[0];
  }
}

module.exports = new ReasoningsRepository();
