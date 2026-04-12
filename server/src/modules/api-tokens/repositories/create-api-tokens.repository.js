const BaseRepository = require("./base.repository");

/**
 * Criação de tokens e checagem de papel na organização.
 */
class CreateApiTokensRepository extends BaseRepository {
  /**
   * @param {Object} params
   * @param {string} params.name
   * @param {string} params.keyPrefix
   * @param {string} params.tokenHash
   * @param {string} params.userId
   * @param {string} [params.organizationId]
   * @param {string[]} [params.scopes]
   * @param {Date|string} [params.expiresAt]
   * @returns {Promise<Record<string, unknown>>}
   */
  async createToken({
    name,
    keyPrefix,
    tokenHash,
    userId,
    organizationId,
    scopes,
    expiresAt,
  }) {
    const query = `
      INSERT INTO api_tokens (
        name, key_prefix, token_hash, user_id, organization_id, scopes, expires_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7
      ) RETURNING id, name, key_prefix, scopes, expires_at, created_at
    `;
    const values = [
      name,
      keyPrefix,
      tokenHash,
      userId,
      organizationId || null,
      scopes || ["read"],
      expiresAt || null,
    ];

    const result = await this.executeQuery(query, values);
    return result[0];
  }

  /**
   * @param {string} userId
   * @param {string} organizationId
   * @returns {Promise<string | null>}
   */
  async getUserOrgRole(userId, organizationId) {
    const query = `
      SELECT role FROM organizations_members 
      WHERE user_id = $1 AND org_id = $2
    `;
    const result = await this.executeQuery(query, [userId, organizationId]);
    return result.length > 0 ? result[0].role : null;
  }
}

module.exports = new CreateApiTokensRepository();
