const { pool } = require("@/database/connection");

async function getUserSessions(userId, limit = 50, offset = 0) {
    const query = `
    SELECT 
      id,
      title,
      created_at,
      updated_at,
      last_message_at,
      last_model,
      last_provider,
      deleted,
      deleted_at,
      total_tokens,
      COALESCE(message_count, 0) as message_count
    FROM ai_chat_sessions
    WHERE user_id = $1
      AND COALESCE(deleted, false) = false
    ORDER BY updated_at DESC
    LIMIT $2 OFFSET $3
  `;

    const result = await pool.query(query, [userId, limit, offset]);
    return result.rows;
  }

module.exports = { getUserSessions };
