const { pool } = require("@/database/connection");

class ReasoningsInteractionsRepository {
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
}

module.exports = new ReasoningsInteractionsRepository();
