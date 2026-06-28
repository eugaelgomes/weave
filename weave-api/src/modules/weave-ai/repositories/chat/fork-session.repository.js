const { pool } = require("@/database/connection");

async function forkSession(token, newUserId) {
    // We use a transaction to ensure both session and messages are copied safely
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // 1. Find the original session
      const sessionQuery = `
        SELECT * FROM ai_chat_sessions
        WHERE share_token = $1
          AND COALESCE(deleted, false) = false
      `;
      const sessionResult = await client.query(sessionQuery, [token]);
      const originalSession = sessionResult.rows[0];

      if (!originalSession) {
        throw new Error("Shared session not found or deleted");
      }

      // 2. Create the new session
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

      // 3. Copy all messages
      const copyMessagesQuery = `
        INSERT INTO ai_chat_messages (
          session_id, user_id, organization_id, role, content, model, metadata, 
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
      // For organizationId, we don't have it strictly tied to the fork unless we fetch it from the new user.
      // But the schema allows organization_id to be null. Let's keep it null for the fork, or we'd need to pass it.
      await client.query(copyMessagesQuery, [
        newSession.id,
        newUserId,
        null, // organization_id
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

module.exports = { forkSession };
