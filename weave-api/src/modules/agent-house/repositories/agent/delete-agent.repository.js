const { pool } = require("@/database/connection");

async function deleteAgent(agentId, userId) {
    const query = `
      UPDATE ai_user_agent
      SET deleted = true, deleted_at = NOW()
      WHERE id = $1 AND user_id = $2
    `;

    await pool.query(query, [agentId, userId]);
    return true;
  }

module.exports = { deleteAgent };
