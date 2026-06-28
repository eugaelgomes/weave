const { pool } = require("@/database/connection");

async function getSessionMessageCount(sessionId) {
    const query = `
    SELECT COUNT(*) as count
    FROM ai_chat_messages
    WHERE session_id = $1
  `;

    const result = await pool.query(query, [sessionId]);
    return parseInt(result.rows[0].count);
  }

module.exports = { getSessionMessageCount };
