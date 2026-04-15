const { pool } = require("@/database/connection");

class AgentsRepository {
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

module.exports = new AgentsRepository();