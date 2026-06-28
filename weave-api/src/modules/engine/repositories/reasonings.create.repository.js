const { pool } = require("@/database/connection");

class ReasoningsCreateRepository {
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
          project_id,
          sprint_id,
          report_config_id,
          organization_id,
          triggered_by,
          reasoning_type,
          title,
          provider_used,
          model_used,
          safety_label,
          safety_reason,
          safety_blocked,
          status,
          error_message,
          processing_time_ms,
          recipient_scope,
          custom_recipients,
          action_items_count,
          expires_at
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
          $16,
          $17,
          $18,
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
          reasoning_id,
          output_markdown,
          output_raw,
          output_metadata,
          input_context,
          input_prompt,
          input_system_message
        )
        VALUES (
         $1,
         $2,
         $3,
         $4,
         $5,
         $6,
         $7
        )`,
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
}

module.exports = new ReasoningsCreateRepository();
