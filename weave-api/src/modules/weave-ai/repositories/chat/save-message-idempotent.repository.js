const { pool } = require("@/database/connection");

const { saveMessage } = require("./save-message.repository");

async function saveMessageIdempotent(data) {
    const { requestId = null, role, sessionId, userId } = data;

    if (!requestId) {
      return saveMessage(data);
    }

    const existingQuery = `
      SELECT *
      FROM ai_chat_messages
      WHERE session_id = $1
        AND user_id = $2
        AND role = $3
        AND request_id = $4
      ORDER BY created_at DESC
      LIMIT 1
    `;
    const existingResult = await pool.query(existingQuery, [
      sessionId,
      userId,
      role,
      requestId,
    ]);
    if (existingResult.rows[0]) {
      return existingResult.rows[0];
    }

    return saveMessage(data);
  }

module.exports = { saveMessageIdempotent };
