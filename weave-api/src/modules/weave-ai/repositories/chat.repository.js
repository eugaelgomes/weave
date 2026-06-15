/**
 * @module weave-ai/repositories/chat.repository
 * @description Data access layer for Weave AI chat sessions and messages.
 * Manages persisting conversation history, handling idempotency for retries, and updating session metadata.
 *
 * Dependencies:
 * - `@/database/connection`: PostgreSQL connection pool.
 *
 * Used by:
 * - `weave-ai/services/chat-orchestrator.service.js`: To persist user and assistant messages, and fetch history.
 * - `weave-ai/controllers/chat.controller.js`: For fetching history and managing session lifecycles.
 */
const { pool } = require("@/database/connection");

class WeaveAIRepository {
  /**
   * Creates a new chat session for a user.
   *
   * @param {string} userId - UUID of the user owning the session.
   * @returns {Promise<object>} The created session record.
   */
  async createSession(userId) {
    const query = `
    INSERT INTO ai_chat_sessions (user_id, title, created_at, updated_at)
    VALUES ($1, $2, NOW(), NOW())
    RETURNING *
  `;

    const result = await pool.query(query, [userId, "Nova Conversa"]);
    return result.rows[0];
  }

  /**
   * Updates the title of an existing chat session.
   *
   * @param {string} sessionId - UUID of the session.
   * @param {string} userId - UUID of the user owning the session.
   * @param {string} title - The new title for the session.
   * @returns {Promise<object>} The updated session record.
   */
  async updateSessionTitle(sessionId, userId, title) {
    const query = `
    UPDATE ai_chat_sessions
    SET title = $1, updated_at = NOW()
    WHERE id = $2
      AND user_id = $3
      AND COALESCE(deleted, false) = false
    RETURNING *
  `;

    const result = await pool.query(query, [title, sessionId, userId]);
    return result.rows[0];
  }

  /**
   * @typedef {Object} ChatMessageData
   * @property {string} sessionId - UUID of the chat session.
   * @property {string} userId - UUID of the user.
   * @property {string|null} [organizationId=null] - UUID of the organization.
   * @property {string} role - The role of the message sender (user, assistant, tool).
   * @property {string|null} [content] - The text content of the message.
   * @property {string} [model] - The name and version of the LLM model used.
   * @property {Object} [metadata={}] - Additional metadata payload.
   * @property {string|null} [requestId=null] - Request idempotency key.
   * @property {string|null} [provider=null] - The AI provider name.
   * @property {string} [status="ok"] - Execution status of the message (ok, error, function_call, etc.).
   * @property {string|null} [errorCode=null] - Error code if the status is error.
   * @property {string|null} [errorMessage=null] - Error message description.
   * @property {number|null} [latencyMs=null] - Network latency in milliseconds.
   * @property {number|null} [inputTokens=null] - Count of input tokens consumed.
   * @property {number|null} [outputTokens=null] - Count of output tokens consumed.
   * @property {number|null} [totalTokens=null] - Total token consumption.
   * @property {string|null} [agentId=null] - Associated AI Agent UUID.
   * @property {boolean} [allowEdit=false] - Whether the context allows destructive edits.
   * @property {Array<Object>|null} [toolCalls=null] - Tool execution payloads requested by the LLM.
   * @property {string|null} [toolCallId=null] - Identifier of the specific tool call.
   */

  /**
   * Persists a chat message into the database and updates the session summary.
   *
   * @param {ChatMessageData} data - The message payload to persist.
   * @returns {Promise<object>} The persisted message record.
   */
  async saveMessage(data) {
    const {
      sessionId,
      userId,
      organizationId = null,
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
      session_id,
      user_id,
      organization_id,
      role,
      content,
      model,
      metadata,
      request_id,
      provider,
      status,
      error_code,
      error_message,
      latency_ms,
      input_tokens,
      output_tokens,
      total_tokens,
      agent_id,
      allow_edit,
      tool_calls,
      tool_call_id,
      created_at
    )
    VALUES (
      $1, $2, $3, $4, $5, $6,
      $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, NOW()
    )
    RETURNING *
  `;

    const result = await pool.query(query, [
      sessionId,
      userId,
      organizationId,
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

    // Update the session summary with recent statistics
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

  /**
   * Saves a message once for a session/user/role/request tuple.
   * Returns the existing row when a duplicate is detected.
   *
   * @param {object} data
   * @returns {Promise<object>}
   */
  async saveMessageIdempotent(data) {
    const { requestId = null, role, sessionId, userId } = data;

    if (!requestId) {
      return this.saveMessage(data);
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

    return this.saveMessage(data);
  }

  /**
   * Reads stored chat messages for a request id inside a user session.
   *
   * @param {string} sessionId
   * @param {string} userId
   * @param {string} requestId
   * @returns {Promise<Array<object>>}
   */
  async getMessagesByRequestId(sessionId, userId, requestId) {
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

  /**
   * Retrieves all messages belonging to a specific session, verifying session ownership.
   *
   * @param {string} sessionId - UUID of the session.
   * @param {string} userId - UUID of the user requesting the messages.
   * @returns {Promise<Array<object>>} An array of message records.
   */
  async getSessionMessages(sessionId, userId) {
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

  /**
   * Returns the most recent messages for prompt context composition.
   *
   * @param {string} sessionId
   * @param {string} userId
   * @param {number} limit
   * @returns {Promise<Array<{role: string, content: string, model: string|null, created_at: string}>>}
   */
  async getSessionMessagesForContext(sessionId, userId, limit = 20) {
    const query = `
    SELECT role, content, model, created_at
    FROM (
      SELECT role, content, model, created_at
      FROM ai_chat_messages
      WHERE session_id = $1
        AND user_id = $2
        AND COALESCE(content, '') <> ''
        AND role IN ('user', 'assistant')
        AND EXISTS (
          SELECT 1
          FROM ai_chat_sessions s
          WHERE s.id = ai_chat_messages.session_id
            AND s.user_id = $2
            AND COALESCE(s.deleted, false) = false
        )
      ORDER BY created_at DESC
      LIMIT $3
    ) recent_messages
    ORDER BY created_at ASC
  `;

    const normalizedLimit =
      Number.isFinite(Number(limit)) && Number(limit) > 0 ? Number(limit) : 20;
    const result = await pool.query(query, [
      sessionId,
      userId,
      normalizedLimit,
    ]);
    return result.rows;
  }

  /**
   * Retrieves a paginated list of all active chat sessions for a user.
   *
   * @param {string} userId - UUID of the user.
   * @param {number} [limit=50] - Maximum number of sessions to return.
   * @param {number} [offset=0] - Offset for pagination.
   * @returns {Promise<Array<object>>} An array of session summary records.
   */
  async getUserSessions(userId, limit = 50, offset = 0) {
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

  /**
   * Counts the total number of messages within a session.
   *
   * @param {string} sessionId - UUID of the session.
   * @returns {Promise<number>} The total message count.
   */
  async getSessionMessageCount(sessionId) {
    const query = `
    SELECT COUNT(*) as count
    FROM ai_chat_messages
    WHERE session_id = $1
  `;

    const result = await pool.query(query, [sessionId]);
    return parseInt(result.rows[0].count);
  }

  /**
   * Soft-deletes a chat session, preventing it from appearing in queries.
   *
   * @param {string} sessionId - UUID of the session to delete.
   * @param {string} userId - UUID of the user attempting to delete the session.
   * @returns {Promise<boolean>} True if the session was successfully deleted.
   */
  async deleteSession(sessionId, userId) {
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
  /**
   * Updates a chat message with user feedback (rating and comment).
   *
   * @param {string} messageId - UUID of the message.
   * @param {string} userId - UUID of the user who owns the message.
   * @param {string|null} rating - 'like', 'dislike', or null.
   * @param {string|null} comment - Optional feedback comment.
   * @returns {Promise<boolean>} True if successful.
   */
  async updateMessageFeedback(messageId, userId, rating, comment) {
    const query = `
      UPDATE ai_chat_messages
      SET
        user_feedback_rating = $1,
        user_feedback_comment = $2
      WHERE id = $3
        AND user_id = $4
      RETURNING id
    `;
    const result = await pool.query(query, [rating, comment, messageId, userId]);
    return result.rowCount > 0;
  }
}

module.exports = new WeaveAIRepository();
