const { pool } = require("@/database/connection");
const { randomBytes } = require("crypto");

class ChatSharingRepository {
  async generateShareToken(sessionId, userId) {
    const token = randomBytes(16).toString("hex");

    const query = `
      UPDATE ai_chat_sessions
      SET share_token = $1, updated_at = NOW()
      WHERE id = $2 AND user_id = $3 AND COALESCE(deleted, false) = false
      RETURNING share_token
    `;

    const result = await pool.query(query, [token, sessionId, userId]);
    return result.rows[0]?.share_token || null;
  }

  async getSharedSessionByToken(token) {
    const query = `
      SELECT id as session_id, title, message_count, created_at, last_message_at
      FROM ai_chat_sessions
      WHERE share_token = $1 AND COALESCE(deleted, false) = false
    `;

    const result = await pool.query(query, [token]);
    return result.rows[0] || null;
  }

  async forkSession(token, newUserId) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const sessionQuery = `
        SELECT * FROM ai_chat_sessions
        WHERE share_token = $1 AND COALESCE(deleted, false) = false
      `;
      const sessionResult = await client.query(sessionQuery, [token]);
      const originalSession = sessionResult.rows[0];

      if (!originalSession) {
        throw new Error("Shared session not found or deleted");
      }

      const createSessionQuery = `
        INSERT INTO ai_chat_sessions (user_id, title, created_at, updated_at, message_count, last_model, last_provider, total_tokens)
        VALUES ($1, $2, NOW(), NOW(), $3, $4, $5, $6)
        RETURNING *
      `;
      const newSessionResult = await client.query(createSessionQuery, [
        newUserId,
        `Fork: ${originalSession.title}`,
        originalSession.message_count,
        originalSession.last_model,
        originalSession.last_provider,
        originalSession.total_tokens,
      ]);
      const newSession = newSessionResult.rows[0];

      const copyMessagesQuery = `
        INSERT INTO ai_chat_messages (
          session_id, user_id, workspace_id, role, content, model, metadata, 
          request_id, provider, status, error_code, error_message, latency_ms, 
          input_tokens, output_tokens, total_tokens, agent_id, allow_edit, 
          tool_calls, tool_call_id, created_at
        )
        SELECT 
          $1, $2, $3, role, content, model, metadata, 
          request_id, provider, status, error_code, error_message, latency_ms, 
          input_tokens, output_tokens, total_tokens, agent_id, allow_edit, 
          tool_calls, tool_call_id, created_at
        FROM ai_chat_messages
        WHERE session_id = $4
        ORDER BY created_at ASC
      `;
      await client.query(copyMessagesQuery, [
        newSession.id,
        newUserId,
        null, // workspace_id
        originalSession.id,
      ]);

      await client.query("COMMIT");
      return newSession;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = new ChatSharingRepository();
