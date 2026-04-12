const BaseRepository = require("./base.repository");

/**
 * Busca token por prefixo (validação Bearer no middleware).
 */
class LookupApiTokensRepository extends BaseRepository {
  /**
   * @param {string} keyPrefix
   * @returns {Promise<Record<string, unknown> | undefined>}
   */
  async getTokenByKeyPrefix(keyPrefix) {
    const query = `
      SELECT * 
      FROM api_tokens 
      WHERE key_prefix = $1 AND deleted = false
    `;
    const result = await this.executeQuery(query, [keyPrefix]);
    return result[0];
  }
}

module.exports = new LookupApiTokensRepository();
