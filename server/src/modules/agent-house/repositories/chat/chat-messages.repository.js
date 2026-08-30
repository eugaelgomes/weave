const { pool } = require("@/database/connection");

class ChatMessagesRepository {
  async saveMessage(data) {
    const {
      sessionId,
      userId,
      workspaceId = null,
      role,
      content,
      model,
      metadata = {},
      requestId = null,
      provider = null,
      status = "ok",
      errorCode = null,
      errorMessage = null,
      latencyMs = null,
      inputTokens = null,
      outputTokens = null,
      totalTokens = null,
      agentId = null,
      allowEdit = false,
      toolCalls = null,
      toolCallId = null,
    } = data;

    const query = `
    INSERT INTO ai_chat_messages (
      session_id, user_id, workspace_id, role, content, model, metadata,
      request_id, provider, status, error_code, error_message, latency_ms,
      input_tokens, output_tokens, total_tokens, agent_id, allow_edit,
      tool_calls, tool_call_id, created_at
    )
    VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, NOW()
    )
    RETURNING *
  `;

    const result = await pool.query(query, [
      sessionId,
      userId,
      workspaceId,
      role,
      content,
      model,
      JSON.stringify(metadata),
      requestId,
      provider,
      status,
      errorCode,
      errorMessage,
      latencyMs,
      inputTokens,
      outputTokens,
      totalTokens,
      agentId,
      allowEdit,
      toolCalls ? JSON.stringify(toolCalls) : null,
      toolCallId,
    ]);

    await pool.query(
      `
        UPDATE ai_chat_sessions
        SET
          updated_at = NOW(),
          last_message_at = NOW(),
          last_model = $2,
          last_provider = COALESCE($3, last_provider),
          message_count = COALESCE(message_count, 0) + 1,
          total_tokens = COALESCE(total_tokens, 0) + COALESCE($4, 0)
        WHERE id = $1 AND COALESCE(deleted, false) = false
      `,
      [sessionId, model, provider, totalTokens]
    );

    return result.rows[0];
  }

  async saveMessageIdempotent(data) {
    const { requestId = null, role, sessionId, userId } = data;

    if (!requestId) {
      return this.saveMessage(data);
    }

    const existingQuery = `
      SELECT *
      FROM ai_chat_messages
      WHERE session_id = $1 AND user_id = $2 AND role = $3 AND request_id = $4
      ORDER BY created_at DESC
      LIMIT 1
    `;
    const existingResult = await pool.query(existingQuery, [sessionId, userId, role, requestId]);
    if (existingResult.rows[0]) {
      return existingResult.rows[0];
    }

    return this.saveMessage(data);
  }

  async getMessagesByRequestId(sessionId, userId, requestId) {
    const query = `
      SELECT *
      FROM ai_chat_messages
      WHERE session_id = $1 AND user_id = $2 AND request_id = $3
      ORDER BY created_at ASC
    `;

    const result = await pool.query(query, [sessionId, userId, requestId]);
    return result.rows;
  }

  async getSessionMessages(sessionId, userId) {
    const query = `
    SELECT * FROM ai_chat_messages
    WHERE session_id = $1 AND user_id = $2
      AND EXISTS (
        SELECT 1 FROM ai_chat_sessions s
        WHERE s.id = ai_chat_messages.session_id AND s.user_id = $2 AND COALESCE(s.deleted, false) = false
      )
    ORDER BY created_at ASC
  `;

    const result = await pool.query(query, [sessionId, userId]);
    return result.rows;
  }

  async getSessionMessagesForContext(sessionId, userId, limit = 20) {
    const query = `
    SELECT role, content, model, created_at
    FROM (
      SELECT role, content, model, created_at
      FROM ai_chat_messages
      WHERE session_id = $1 AND user_id = $2 AND COALESCE(content, '') <> '' AND role IN ('user', 'assistant')
        AND EXISTS (
          SELECT 1 FROM ai_chat_sessions s
          WHERE s.id = ai_chat_messages.session_id AND s.user_id = $2 AND COALESCE(s.deleted, false) = false
        )
      ORDER BY created_at DESC
      LIMIT $3
    ) recent_messages
    ORDER BY created_at ASC
  `;

    const normalizedLimit =
      Number.isFinite(Number(limit)) && Number(limit) > 0 ? Number(limit) : 20;
    const result = await pool.query(query, [sessionId, userId, normalizedLimit]);
    return result.rows;
  }

  async updateMessageFeedback(messageId, userId, rating, comment) {
    const query = `
      UPDATE ai_chat_messages
      SET user_feedback_rating = $1, user_feedback_comment = $2
      WHERE id = $3 AND user_id = $4
      RETURNING id
    `;
    const result = await pool.query(query, [rating, comment, messageId, userId]);
    return result.rowCount > 0;
  }
}

module.exports = new ChatMessagesRepository();
