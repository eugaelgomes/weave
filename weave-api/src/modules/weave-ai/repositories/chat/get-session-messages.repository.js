const { pool } = require("@/database/connection");

async function getSessionMessages(sessionId, userId) {
    const query = `
    SELECT * FROM ai_chat_messages
    WHERE session_id = $1
      AND user_id = $2
      AND EXISTS (
        SELECT 1
        FROM ai_chat_sessions s
        WHERE s.id = ai_chat_messages.session_id
          AND s.user_id = $2
          AND COALESCE(s.deleted, false) = false
      )
    ORDER BY created_at ASC
  `;

    const result = await pool.query(query, [sessionId, userId]);
    return result.rows;
  }

module.exports = { getSessionMessages };
