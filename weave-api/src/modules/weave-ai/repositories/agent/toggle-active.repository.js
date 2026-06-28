const { pool } = require("@/database/connection");

async function toggleActive(agentId, userId, isActive) {
    const query = `
      UPDATE ai_user_agent
      SET is_active = $3, updated_at = NOW()
      WHERE id = $1 AND user_id = $2 AND (deleted = false OR deleted IS NULL)
      RETURNING *
    `;

    const result = await pool.query(query, [agentId, userId, isActive]);
    return result.rows[0];
  }

module.exports = { toggleActive };
