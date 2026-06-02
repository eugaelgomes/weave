const { pool } = require("@/database/connection");

class WeaveAIRepository {
  /**
   * Cria uma nova sessão de chat.
   * @param {string} userId - UUID do usuário dono da sessão
   * @returns {Promise<object>} A sessão criada
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
   * @param {string} sessionId - UUID da sessão
   * @param {string} userId - UUID do usuário
   * @param {string} title - Novo título
   * @returns {Promise<object>} A sessão atualizada
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
   * @property {string} sessionId - UUID da sessão
   * @property {string} userId - UUID do usuário
   * @property {string} role - Papel da mensagem (user, assistant, tool)
   * @property {string|null} [content] - Conteúdo da mensagem
   * @property {string} [model] - Nome/versão do modelo usado
   * @property {Object} [metadata={}] - Metadados extras
   * @property {string|null} [requestId=null] - ID do request
   * @property {string|null} [provider=null] - Provedor da IA
   * @property {string} [status="ok"] - Status da mensagem (ok, error, etc)
   * @property {string|null} [errorCode=null] - Código do erro
   * @property {string|null} [errorMessage=null] - Mensagem do erro
   * @property {number|null} [latencyMs=null] - Latência em ms
   * @property {number|null} [inputTokens=null] - Tokens de input
   * @property {number|null} [outputTokens=null] - Tokens de output
   * @property {number|null} [totalTokens=null] - Total de tokens
   * @property {string|null} [agentId=null] - UUID do agente
   * @property {boolean} [allowEdit=false] - Se permite edição
   * @property {Array<Object>|null} [toolCalls=null] - Ferramentas chamadas
   * @property {string|null} [toolCallId=null] - ID da ferramenta
   */

  /**
   * Salva uma mensagem no banco de dados.
   * @param {ChatMessageData} data - Os dados da mensagem
   * @returns {Promise<object>} A mensagem salva
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
      toolCalls = null,
      toolCallId = null,
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
      tool_calls,
      tool_call_id,
      created_at
    )
    VALUES (
      $1, $2, $3, $4, $5, $6,
      $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, NOW()
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
      toolCalls ? JSON.stringify(toolCalls) : null,
      toolCallId,
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
   * Busca todas as sessões de um usuário
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
