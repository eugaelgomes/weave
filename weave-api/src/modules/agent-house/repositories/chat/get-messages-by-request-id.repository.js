const { pool } = require("@/database/connection");

async function getMessagesByRequestId(sessionId, userId, requestId) {
    const query = `
      SELECT *
      FROM ai_chat_messages
      WHERE session_id = $1
        AND user_id = $2
        AND request_id = $3
      ORDER BY created_at ASC
    `;

    const result = await pool.query(query, [sessionId, userId, requestId]);
    return result.rows;
  }

module.exports = { getMessagesByRequestId };
