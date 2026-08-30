const { pool } = require("@/database/connection");

class AgentCustomToolsRepository {
  /**
   * Creates a new custom tool.
   */
  async create(userId, data) {
    const query = `
      INSERT INTO ai_custom_tools (
        user_id, workspace_id, name, description, webhook_url, method, headers, payload_schema, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      RETURNING *
    `;
    const values = [
      userId,
      data.workspaceId || null,
      data.name,
      data.description || null,
      data.webhookUrl,
      data.method || "POST",
      data.headers ? JSON.stringify(data.headers) : "{}",
      data.payloadSchema ? JSON.stringify(data.payloadSchema) : "{}",
    ];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Finds all custom tools for a user.
   */
  async findByUserId(userId) {
    const query = `
      SELECT *
      FROM ai_custom_tools 
      WHERE user_id = $1 AND (deleted = false OR deleted IS NULL)
      ORDER BY created_at DESC
    `;
    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  /**
   * Finds a specific custom tool by ID.
   */
  async findById(id, userId) {
    const query = `
      SELECT *
      FROM ai_custom_tools 
      WHERE id = $1 AND user_id = $2 AND (deleted = false OR deleted IS NULL)
    `;
    const result = await pool.query(query, [id, userId]);
    return result.rows[0];
  }

  /**
   * Updates a custom tool.
   */
  async update(id, userId, updates) {
    const allowedColumns = [
      "name",
      "description",
      "webhook_url",
      "method",
      "headers",
      "payload_schema",
    ];

    const fields = [];
    const values = [id, userId];
    let paramIndex = 3;

    for (const [key, value] of Object.entries(updates)) {
      if (allowedColumns.includes(key)) {
        fields.push(`${key} = $${paramIndex}`);
        values.push(
          (key === "headers" || key === "payload_schema") && typeof value === "object"
            ? JSON.stringify(value)
            : value
        );
        paramIndex++;
      }
    }

    if (fields.length === 0) return null;

    const query = `
      UPDATE ai_custom_tools
      SET ${fields.join(", ")}, updated_at = NOW()
      WHERE id = $1 AND user_id = $2 AND (deleted = false OR deleted IS NULL)
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Soft-deletes a custom tool.
   */
  async delete(id, userId) {
    const query = `
      UPDATE ai_custom_tools 
      SET deleted = true, deleted_at = NOW() 
      WHERE id = $1 AND user_id = $2 
      RETURNING id
    `;
    const result = await pool.query(query, [id, userId]);
    return result.rows[0];
  }
}

module.exports = new AgentCustomToolsRepository();
