const { pool } = require("@/database/connection");

async function updateSessionTitle(sessionId, userId, title) {
    const query = `
    UPDATE ai_chat_sessions
    SET title = $1, updated_at = NOW()
    WHERE id = $2
      AND user_id = $3
      AND COALESCE(deleted, false) = false
    RETURNING *
  `;

    const result = await pool.query(query, [title, sessionId, userId]);
    return result.rows[0];
  }

module.exports = { updateSessionTitle };
