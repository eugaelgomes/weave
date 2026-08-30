const { pool } = require("@/database/connection");

class ArtifactsRepository {
  /**
   * Creates a new artifact.
   *
   * @param {Object} data
   * @param {string} data.userId
   * @param {string|null} data.workspaceId
   * @param {string|null} data.sessionId
   * @param {string} data.title
   * @param {string} data.type
   * @param {Object|Array} data.content
   * @returns {Promise<Object>}
   */
  async createArtifact(data) {
    const {
      userId,
      workspaceId = null,
      sessionId = null,
      title = "Untitled Artifact",
      type = "document",
      content = [],
    } = data;

    const query = `
      INSERT INTO ai_artifacts (
        user_id,
        workspace_id,
        session_id,
        title,
        type,
        content,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING *
    `;

    const result = await pool.query(query, [
      userId,
      workspaceId,
      sessionId,
      title,
      type,
      JSON.stringify(content),
    ]);

    return result.rows[0];
  }

  /**
   * Retrieves an artifact by its ID and ensures the user owns it.
   *
   * @param {string} id - Artifact UUID
   * @param {string} userId - User UUID
   * @returns {Promise<Object|null>}
   */
  async getArtifactById(id, userId) {
    const query = `
      SELECT *
      FROM ai_artifacts
      WHERE id = $1 AND user_id = $2
    `;
    const result = await pool.query(query, [id, userId]);
    return result.rows[0] || null;
  }

  /**
   * Updates an existing artifact.
   *
   * @param {string} id - Artifact UUID
   * @param {string} userId - User UUID
   * @param {Object} data - Data to update
   * @param {string} [data.title]
   * @param {Object|Array} [data.content]
   * @returns {Promise<Object|null>}
   */
  async updateArtifact(id, userId, data) {
    const fields = [];
    const values = [];
    let idx = 1;

    if (data.title !== undefined) {
      fields.push(`title = $${idx++}`);
      values.push(data.title);
    }

    if (data.content !== undefined) {
      fields.push(`content = $${idx++}`);
      values.push(JSON.stringify(data.content));
    }

    if (fields.length === 0) {
      return this.getArtifactById(id, userId);
    }

    fields.push(`updated_at = NOW()`);
    values.push(id, userId); // For the WHERE clause

    const query = `
      UPDATE ai_artifacts
      SET ${fields.join(", ")}
      WHERE id = $${idx} AND user_id = $${idx + 1}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows[0] || null;
  }
  /**
   * Retrieves a list of artifacts for the user.
   *
   * @param {string} userId - User UUID
   * @param {number} limit - Pagination limit
   * @param {number} offset - Pagination offset
   * @returns {Promise<Object[]>}
   */
  async listArtifacts(userId, limit = 20, offset = 0) {
    const query = `
      SELECT *
      FROM ai_artifacts
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;
    const result = await pool.query(query, [userId, limit, offset]);
    return result.rows;
  }

  /**
   * Deletes an artifact if it belongs to the user.
   *
   * @param {string} id - Artifact UUID
   * @param {string} userId - User UUID
   * @returns {Promise<boolean>} True if deleted, false otherwise
   */
  async deleteArtifact(id, userId) {
    const query = `
      DELETE FROM ai_artifacts
      WHERE id = $1 AND user_id = $2
      RETURNING id
    `;
    const result = await pool.query(query, [id, userId]);
    return (result.rowCount ?? 0) > 0;
  }
}

module.exports = new ArtifactsRepository();
