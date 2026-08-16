const BaseRepository = require("./base.repository");

/**
 * Revogação e remoção lógica de tokens.
 */
class MutateApiTokensRepository extends BaseRepository {
  /**
   * @param {string} id
   * @param {string} userId
   * @returns {Promise<Record<string, unknown> | undefined>}
   */
  async revokeToken(id, userId) {
    const query = `
      UPDATE api_tokens 
      SET revoked_at = NOW(), updated_at = NOW() 
      WHERE id = $1 AND user_id = $2 AND deleted = false
      RETURNING id, name, revoked_at
    `;
    const result = await this.executeQuery(query, [id, userId]);
    return result[0];
  }

  /**
   * @param {string} id
   * @param {string} userId
   * @returns {Promise<boolean>}
   */
  async deleteToken(id, userId) {
    const query = `
      UPDATE api_tokens 
      SET deleted = true, deleted_at = NOW() 
      WHERE id = $1 AND user_id = $2
      RETURNING id
    `;
    const result = await this.executeQuery(query, [id, userId]);
    return result.length > 0;
  }
}

module.exports = new MutateApiTokensRepository();
