const { pool } = require("@/database/connection");

class ReasoningsActionItemsRepository {
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

module.exports = new ReasoningsActionItemsRepository();
