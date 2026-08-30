const { pool } = require("@/database/connection");

class AgentLlmsRepository {
  /**
   * Creates a new BYO-LLM configuration.
   */
  async create(userId, data) {
    const query = `
      INSERT INTO ai_llms (
        user_id, workspace_id, title, provider, model, api_key, temperature, max_tokens, reasoning_effort, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      RETURNING *
    `;
    const values = [
      userId,
      data.workspaceId || null,
      data.title,
      data.provider,
      data.model,
      data.apiKey, // Note: Encryption should happen in the Service layer
      data.temperature || 0.7,
      data.maxTokens || null,
      data.reasoningEffort || null,
    ];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Finds all active LLM configurations for a user.
   */
  async findByUserId(userId) {
    const query = `
      SELECT id, user_id, workspace_id, title, provider, model, temperature, max_tokens, reasoning_effort, created_at, updated_at
      FROM ai_llms 
      WHERE user_id = $1 AND (deleted = false OR deleted IS NULL)
      ORDER BY created_at DESC
    `;
    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  /**
   * Finds a specific LLM configuration (including API key for execution).
   */
  async findById(id, userId) {
    const query = `
      SELECT *
      FROM ai_llms 
      WHERE id = $1 AND user_id = $2 AND (deleted = false OR deleted IS NULL)
    `;
    const result = await pool.query(query, [id, userId]);
    return result.rows[0];
  }

  /**
   * Updates an LLM configuration.
   */
  async update(id, userId, updates) {
    const allowedColumns = [
      "title",
      "provider",
      "model",
      "api_key",
      "temperature",
      "max_tokens",
      "reasoning_effort",
    ];

    const fields = [];
    const values = [id, userId];
    let paramIndex = 3;

    for (const [key, value] of Object.entries(updates)) {
      if (allowedColumns.includes(key)) {
        fields.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    if (fields.length === 0) return null;

    const query = `
      UPDATE ai_llms
      SET ${fields.join(", ")}, updated_at = NOW()
      WHERE id = $1 AND user_id = $2 AND (deleted = false OR deleted IS NULL)
      RETURNING id, user_id, workspace_id, title, provider, model, temperature, max_tokens, reasoning_effort, updated_at
    `;

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Soft-deletes an LLM configuration.
   */
  async delete(id, userId) {
    const query = `
      UPDATE ai_llms 
      SET deleted = true, deleted_at = NOW() 
      WHERE id = $1 AND user_id = $2 
      RETURNING id
    `;
    const result = await pool.query(query, [id, userId]);
    return result.rows[0];
  }
}

module.exports = new AgentLlmsRepository();
