const BaseRepository = require("./base.repository");

/**
 * Listagem de tokens do utilizador.
 */
class ListApiTokensRepository extends BaseRepository {
  /**
   * @param {string} userId
   * @returns {Promise<Record<string, unknown>[]>}
   */
  async getTokensByUserId(userId) {
    const query = `
      SELECT id, name, key_prefix, organization_id, scopes, expires_at, revoked_at, created_at, updated_at 
      FROM api_tokens 
      WHERE user_id = $1 AND deleted = false
      ORDER BY created_at DESC
    `;
    return await this.executeQuery(query, [userId]);
  }
}

module.exports = new ListApiTokensRepository();
