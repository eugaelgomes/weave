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
    const { sessionId, userId, role, content, model, metadata = {} } = data;

    const query = `
    INSERT INTO ai_chat_messages (
      session_id, user_id, role, content, model, metadata, created_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, NOW())
    RETURNING *
  `;

    const result = await pool.query(query, [
      sessionId,
      userId,
      role,
      content,
      model,
      JSON.stringify(metadata),
    ]);

    // Atualiza timestamp da sessão
    await pool.query(
      "UPDATE ai_chat_sessions SET updated_at = NOW() WHERE id = $1",
      [sessionId]
    );

    return result.rows[0];
  }

  /**
   * Busca mensagens de uma sessão
   */
  async getSessionMessages(sessionId, userId) {
    const query = `
    SELECT * FROM ai_chat_messages
    WHERE session_id = $1 AND user_id = $2
    ORDER BY created_at ASC
  `;

    const result = await pool.query(query, [sessionId, userId]);
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
      COUNT(m.id) as message_count
    FROM ai_chat_sessions s
    LEFT JOIN ai_chat_messages m ON m.session_id = s.id
    WHERE s.user_id = $1
    GROUP BY s.id, s.title, s.created_at, s.updated_at
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
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // Delete messages
      await client.query(
        "DELETE FROM ai_chat_messages WHERE session_id = $1 AND user_id = $2",
        [sessionId, userId]
      );

      // Delete session
      await client.query(
        "DELETE FROM ai_chat_sessions WHERE id = $1 AND user_id = $2",
        [sessionId, userId]
      );

      await client.query("COMMIT");
      return true;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Cria um novo agente personalizado
   * @param {string} userId
   * @param {object} agentData JSON com a configuração do agente
   */
  async createAgent(userId, agentData) {
    const query = `
    INSERT INTO ai_user_agent (user_id, personality, created_at, updated_at)
    VALUES ($1, $2, NOW(), NOW())
    RETURNING *
  `;

    const result = await pool.query(query, [userId, agentData]);
    return result.rows[0];
  }

  /**
   * Busca agentes do usuário
   */
  async getUserAgents(userId) {
    const query = `
    SELECT id, user_id, personality, created_at, updated_at, knowledge_files, shared_with
    FROM ai_user_agent
    WHERE user_id = $1 AND (deleted = false OR deleted IS NULL)
    ORDER BY updated_at DESC
  `;

    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  async getAgentById(agentId, userId) {
    const query = `
      SELECT id, user_id, personality, created_at, updated_at, knowledge_files, shared_with
      FROM ai_user_agent
      WHERE id = $1 AND user_id = $2 AND (deleted = false OR deleted IS NULL)
      LIMIT 1
    `;

    const result = await pool.query(query, [agentId, userId]);
    return result.rows[0];
  }

  /**
   * Atualiza um agente existente com suporte a Partial Update
   * @param {string} agentId - ID do agente
   * @param {string} userId - ID do dono do agente
   * @param {object} updates - Campos a serem atualizados (personality, knowledge_files, etc)
   */
  async updateAgent(agentId, userId, updates) {
    // Monta query dinamicamente baseada nos campos presentes em "updates"
    const fields = [];
    const values = [agentId, userId];
    let paramIndex = 3;

    for (const [key, value] of Object.entries(updates)) {
      // Ignora campos que não existem ou não devem ser atualizados diretamente
      if (["personality", "knowledge_files", "shared_with"].includes(key)) {
        fields.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    if (fields.length === 0) return null; // Nada para atualizar

    const query = `
      UPDATE ai_user_agent
      SET ${fields.join(", ")}, updated_at = NOW()
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Compartilha um agente com outros usuários
   * @param {string} agentId
   * @param {string} ownerId
   * @param {Array<{userId: string, permission: string}>} sharedWithList
   */
  async shareAgent(agentId, ownerId, sharedWithList) {
    const query = `
      UPDATE ai_user_agent
      SET shared_with = $3::jsonb, updated_at = NOW()
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `;

    const result = await pool.query(query, [
      agentId,
      ownerId,
      JSON.stringify(sharedWithList),
    ]);
    return result.rows[0];
  }

  /**
   * Remove um agente (soft delete)
   */
  async deleteAgent(agentId, userId) {
    const query = `
    UPDATE ai_user_agent
    SET deleted = true, deleted_at = NOW()
    WHERE id = $1 AND user_id = $2
  `;

    await pool.query(query, [agentId, userId]);
    return true;
  }
}

module.exports = new WeaveAIRepository();
