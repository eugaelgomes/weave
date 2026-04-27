const { pool } = require("@/database/connection");

class WeaveAIRepository {
  /**
   * Cria uma nova sessão de chat
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
   * Atualiza título da sessão
   */
  async updateSessionTitle(sessionId, title) {
    const query = `
    UPDATE ai_chat_sessions
    SET title = $1, updated_at = NOW()
    WHERE id = $2
    RETURNING *
  `;

    const result = await pool.query(query, [title, sessionId]);
    return result.rows[0];
  }

  /**
   * Salva uma mensagem
   */
  async saveMessage(data) {
    const {
      sessionId,
      userId,
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
    } = data;

    const query = `
    INSERT INTO ai_chat_messages (
      session_id,
      user_id,
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
      created_at
    )
    VALUES (
      $1, $2, $3, $4, $5, $6,
      $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW()
    )
    RETURNING *
  `;

    const result = await pool.query(query, [
      sessionId,
      userId,
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
    ]);

    // Atualiza resumo da sessão
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
   * Busca mensagens de uma sessão
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
   * @returns {Promise<Array<{role: string, content: string, created_at: string}>>}
   */
  async getSessionMessagesForContext(sessionId, userId, limit = 20) {
    const query = `
    SELECT role, content, created_at
    FROM (
      SELECT role, content, created_at
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

    const normalizedLimit = Number.isFinite(Number(limit)) && Number(limit) > 0
      ? Number(limit)
      : 20;
    const result = await pool.query(query, [sessionId, userId, normalizedLimit]);
    return result.rows;
  }

  /**
   * Busca todas as sessões de um usuário
   */
  async getUserSessions(userId, limit = 50) {
    const query = `
    SELECT 
      s.id,
      s.title,
      s.created_at,
      s.updated_at,
      s.last_message_at,
      s.last_model,
      s.last_provider,
      s.deleted,
      s.deleted_at,
      s.total_tokens,
      COALESCE(s.message_count, COUNT(m.id)::int) as message_count
    FROM ai_chat_sessions s
    LEFT JOIN ai_chat_messages m ON m.session_id = s.id
    WHERE s.user_id = $1
      AND COALESCE(s.deleted, false) = false
    GROUP BY
      s.id,
      s.title,
      s.created_at,
      s.updated_at,
      s.last_message_at,
      s.last_model,
      s.last_provider,
      s.deleted,
      s.deleted_at,
      s.total_tokens,
      s.message_count
    ORDER BY s.updated_at DESC
    LIMIT $2
  `;

    const result = await pool.query(query, [userId, limit]);
    return result.rows;
  }

  /**
   * Conta mensagens de uma sessão
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
   * Deleta uma sessão e suas mensagens
   * @param {string} sessionId
   * @param {string} userId
   * @returns {Promise<boolean>} Retorna true se a sessão foi deletada com sucesso
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
}

module.exports = new WeaveAIRepository();
