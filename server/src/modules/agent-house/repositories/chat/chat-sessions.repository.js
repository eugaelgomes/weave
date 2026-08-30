const { pool } = require("@/database/connection");

class ChatSessionsRepository {
  async createSession(userId) {
    const query = `
    INSERT INTO ai_chat_sessions (user_id, title, created_at, updated_at)
    VALUES ($1, $2, NOW(), NOW())
    RETURNING *
  `;
    const result = await pool.query(query, [userId, "Nova Conversa"]);
    return result.rows[0];
  }

  async updateSessionTitle(sessionId, userId, title) {
    const query = `
    UPDATE ai_chat_sessions
    SET title = $1, updated_at = NOW()
    WHERE id = $2 AND user_id = $3 AND COALESCE(deleted, false) = false
    RETURNING *
  `;
    const result = await pool.query(query, [title, sessionId, userId]);
    return result.rows[0];
  }

  async getUserSessions(userId, limit = 50, offset = 0) {
    const query = `
    SELECT 
      id, title, created_at, updated_at, last_message_at, last_model,
      last_provider, deleted, deleted_at, total_tokens,
      COALESCE(message_count, 0) as message_count
    FROM ai_chat_sessions
    WHERE user_id = $1 AND COALESCE(deleted, false) = false
    ORDER BY updated_at DESC
    LIMIT $2 OFFSET $3
  `;
    const result = await pool.query(query, [userId, limit, offset]);
    return result.rows;
  }

  async getSessionMessageCount(sessionId) {
    const query = `
    SELECT COUNT(*) as count
    FROM ai_chat_messages
    WHERE session_id = $1
  `;
    const result = await pool.query(query, [sessionId]);
    return parseInt(result.rows[0].count);
  }

  async deleteSession(sessionId, userId) {
    const query = `
      UPDATE ai_chat_sessions
      SET deleted = true, deleted_at = NOW(), updated_at = NOW()
      WHERE id = $1 AND user_id = $2 AND COALESCE(deleted, false) = false
      RETURNING id
    `;
    const result = await pool.query(query, [sessionId, userId]);
    return result.rowCount > 0;
  }
}

module.exports = new ChatSessionsRepository();
