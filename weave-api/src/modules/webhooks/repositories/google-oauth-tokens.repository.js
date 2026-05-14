const { executeQuery, rowCount } = require("@/database/connection");

/** Matches `oauth_provider_enum` in PostgreSQL (`new_structure_db.sql`). */
const GOOGLE_OAUTH_PROVIDER = "GOOGLE";

/**
 * Persistência de tokens OAuth2 do Google (`user_oauth_tokens`).
 */
class GoogleOauthTokensRepository {
  /**
   * Salva ou atualiza os tokens OAuth2 do Google para um usuário.
   * Se já existirem tokens, atualiza-os; caso contrário, insere um novo registro.
   * @param {string} userId - ID do usuário
   * @param {string} accessToken - Token de acesso do Google
   * @param {string|null} refreshToken - Token de refresh (mantém o existente se null)
   * @param {Date|null} expiresAt - Data de expiração do access token
   */
  async saveGoogleTokens(userId, accessToken, refreshToken, expiresAt) {
    const existing = await executeQuery(
      `SELECT id FROM user_oauth_tokens
       WHERE user_id = $1 AND provider = '${GOOGLE_OAUTH_PROVIDER}' AND deleted = false
       LIMIT 1`,
      [userId]
    );

    if (existing.length > 0) {
      await rowCount(
        `UPDATE user_oauth_tokens
         SET access_token = $1,
             refresh_token = COALESCE($2, refresh_token),
             expires_at = $3,
             updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $4 AND provider = '${GOOGLE_OAUTH_PROVIDER}' AND deleted = false`,
        [accessToken, refreshToken, expiresAt, userId]
      );
    } else {
      await executeQuery(
        `INSERT INTO user_oauth_tokens (user_id, provider, access_token, refresh_token, expires_at)
         VALUES ($1, '${GOOGLE_OAUTH_PROVIDER}', $2, $3, $4)`,
        [userId, accessToken, refreshToken, expiresAt]
      );
    }
  }

  /**
   * Retorna os tokens OAuth2 do Google de um usuário.
   * @param {string} userId - ID do usuário
   * @returns {Promise<{access_token: string, refresh_token: string, expires_at: string}|undefined>}
   */
  async getGoogleTokens(userId) {
    const results = await executeQuery(
      `SELECT access_token, refresh_token, expires_at
       FROM user_oauth_tokens
       WHERE user_id = $1 AND provider = '${GOOGLE_OAUTH_PROVIDER}' AND deleted = false
       LIMIT 1`,
      [userId]
    );
    return results[0];
  }

  /**
   * Marca os tokens OAuth2 do Google de um usuário como deletados (soft delete).
   * @param {string} userId - ID do usuário
   */
  async clearGoogleTokens(userId) {
    await rowCount(
      `UPDATE user_oauth_tokens
       SET deleted = true, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $1 AND provider = '${GOOGLE_OAUTH_PROVIDER}'`,
      [userId]
    );
  }

  /**
   * Atualiza apenas o access token e sua expiração após um refresh automático.
   * @param {string} userId - ID do usuário
   * @param {string} accessToken - Novo access token
   * @param {Date|null} expiresAt - Nova data de expiração
   */
  async updateGoogleAccessToken(userId, accessToken, expiresAt) {
    await rowCount(
      `UPDATE user_oauth_tokens
       SET access_token = $1,
           expires_at = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $3 AND provider = '${GOOGLE_OAUTH_PROVIDER}' AND deleted = false`,
      [accessToken, expiresAt, userId]
    );
  }

  /**
   * Verifica se o usuário possui tokens do Google armazenados.
   * @param {string} userId - ID do usuário
   * @returns {Promise<boolean>}
   */
  async hasGoogleTokens(userId) {
    const results = await executeQuery(
      `SELECT 1 FROM user_oauth_tokens
       WHERE user_id = $1 AND provider = '${GOOGLE_OAUTH_PROVIDER}' AND deleted = false
       LIMIT 1`,
      [userId]
    );
    return results.length > 0;
  }
}

module.exports = new GoogleOauthTokensRepository();
