const { pool } = require("@/database/connection");

async function shareAgent(agentId, ownerId, sharedWithList) {
    const query = `
      UPDATE ai_user_agent
      SET shared_with = $3::jsonb, updated_at = NOW()
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `;

    const result = await pool.query(query, [
      agentId,
      ownerId,
      JSON.stringify(sharedWithList),
    ]);
    return result.rows[0];
  }

module.exports = { shareAgent };
