const BaseRepository = require("./base.repository");

/**
 * Tokens de download de backup (`tokens` + join com job).
 */
class BackupDownloadTokensRepository extends BaseRepository {
  /**
   * @param {string} token
   * @param {string} userId
   * @param {string} type
   * @param {Date} expiresAt
   * @returns {Promise<Record<string, unknown>>}
   */
  async createDownloadToken(token, userId, type, expiresAt) {
    const query = `
      INSERT INTO tokens (token, user_id, type, expires_at)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    const [result] = await this.executeQuery(query, [
      token,
      userId,
      type,
      expiresAt,
    ]);
    return result;
  }

  /**
   * @param {string} token
   * @returns {Promise<Record<string, unknown> | undefined>}
   */
  async getTokenWithJob(token) {
    const query = `
      SELECT t.*, j.result
      FROM tokens t
      LEFT JOIN jobs j ON j.user_id = t.user_id 
        AND j.type = 'backup_export' 
        AND j.result IS NOT NULL
        AND j.result->>'downloadToken' = t.token
      WHERE t.token = $1 
      AND t.type = 'backup_download'
      AND t.used_at IS NULL
    `;

    const [result] = await this.executeQuery(query, [token]);
    return result;
  }

  /**
   * @param {string} token
   * @returns {Promise<Record<string, unknown> | undefined>}
   */
  async markTokenAsUsed(token) {
    const query = `
      UPDATE tokens 
      SET used_at = NOW() 
      WHERE token = $1
      RETURNING *
    `;

    const [result] = await this.executeQuery(query, [token]);
    return result;
  }
}

module.exports = new BackupDownloadTokensRepository();
