const { executeQuery, rowCount } = require("@/database/connection");

class ApiTokensRepository {
  /**
   * Insere um novo token no banco de dados.
   * @param {Object} params - Parâmetros para criação do token.
   * @param {string} params.name - Nome identificador dado ao token.
   * @param {string} params.keyPrefix - O prefixo para busca rápida no banco (ex: vn_abc).
   * @param {string} params.tokenHash - O hash gerado usando bcrypt.
   * @param {string} params.userId - Identificador do dono (UUID).
   * @param {string} [params.organizationId] - Organização ligada (opcional UUID).
   * @param {string[]} [params.scopes] -  Array com os contextos / permissões.
   * @param {Date|string} [params.expiresAt] - Data em que o token será expirado (opcional).
   * @returns {Promise<Object>} Retorna informações básicas de metadados do token recém-criado.
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

    const result = await executeQuery(query, values);
    return result[0];
  }

  async getTokensByUserId(userId) {
    const query = `
      SELECT id, name, key_prefix, organization_id, scopes, expires_at, revoked_at, created_at, updated_at 
      FROM api_tokens 
      WHERE user_id = $1 AND deleted = false
      ORDER BY created_at DESC
    `;
    return await executeQuery(query, [userId]);
  }

  async getTokenByKeyPrefix(keyPrefix) {
    const query = `
      SELECT * 
      FROM api_tokens 
      WHERE key_prefix = $1 AND deleted = false
    `;
    const result = await executeQuery(query, [keyPrefix]);
    return result[0];
  }

  async revokeToken(id, userId) {
    const query = `
      UPDATE api_tokens 
      SET revoked_at = NOW(), updated_at = NOW() 
      WHERE id = $1 AND user_id = $2 AND deleted = false
      RETURNING id, name, revoked_at
    `;
    const result = await executeQuery(query, [id, userId]);
    return result[0];
  }

  async deleteToken(id, userId) {
    const query = `
      UPDATE api_tokens 
      SET deleted = true, deleted_at = NOW() 
      WHERE id = $1 AND user_id = $2
      RETURNING id
    `;
    const result = await executeQuery(query, [id, userId]);
    return result.length > 0;
  }

  /**
   * Checa o papel de um usuário dentro de uma organização específica.
   * Utilizado para validar se tem permissões de super_admin na criação de chaves.
   */
  async getUserOrgRole(userId, organizationId) {
    const query = `
      SELECT role FROM organizations_members 
      WHERE user_id = $1 AND org_id = $2
    `;
    const result = await executeQuery(query, [userId, organizationId]);
    return result.length > 0 ? result[0].role : null;
  }
}

module.exports = new ApiTokensRepository();
