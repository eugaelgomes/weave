const { pool } = require("@/database/connection");

async function unassignFromProject(agentId, userId) {
    const query = `
      UPDATE ai_user_agent
      SET project_id = NULL, updated_at = NOW()
      WHERE id = $1 AND user_id = $2 AND (deleted = false OR deleted IS NULL)
      RETURNING *
    `;

    const result = await pool.query(query, [agentId, userId]);
    return result.rows[0];
  }

module.exports = { unassignFromProject };
