const { pool } = require("@/database/connection");

async function getSharedSessionByToken(token) {
    const query = `
      SELECT id as session_id, title, message_count, created_at, last_message_at
      FROM ai_chat_sessions
      WHERE share_token = $1
        AND COALESCE(deleted, false) = false
    `;

    const result = await pool.query(query, [token]);
    return result.rows[0] || null;
  }

module.exports = { getSharedSessionByToken };
