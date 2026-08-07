const { pool } = require("@/database/connection");

async function updateAgent(agentId, userId, updates) {
    const allowedColumns = [
      "name",
      "description",
      "project_id",
      "is_active",
      "personality",
      "knowledge_files",
      "shared_with",
    ];

    const fields = [];
    const values = [agentId, userId];
    let paramIndex = 3;

    for (const [key, value] of Object.entries(updates)) {
      if (allowedColumns.includes(key)) {
        fields.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    if (fields.length === 0) return null;

    const query = `
      UPDATE ai_user_agent
      SET ${fields.join(", ")}, updated_at = NOW()
      WHERE id = $1 AND user_id = $2 AND (deleted = false OR deleted IS NULL)
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows[0];
  }

module.exports = { updateAgent };
