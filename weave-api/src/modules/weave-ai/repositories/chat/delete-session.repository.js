const { pool } = require("@/database/connection");

async function deleteSession(sessionId, userId) {
    const query = `
      UPDATE ai_chat_sessions
      SET
        deleted = true,
        deleted_at = NOW(),
        updated_at = NOW()
      WHERE id = $1
        AND user_id = $2
        AND COALESCE(deleted, false) = false
      RETURNING id
    `;

    const result = await pool.query(query, [sessionId, userId]);
    return result.rowCount > 0;
  }

module.exports = { deleteSession };
