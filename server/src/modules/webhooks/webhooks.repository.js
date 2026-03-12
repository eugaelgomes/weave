const { executeQuery, rowCount } = require("@/services/db/index");

class WebhooksRepository {
  /* ── OAuth Tokens ── */

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
       WHERE user_id = $1 AND provider = 'google' AND deleted = false
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
         WHERE user_id = $4 AND provider = 'google' AND deleted = false`,
        [accessToken, refreshToken, expiresAt, userId]
      );
    } else {
      await executeQuery(
        `INSERT INTO user_oauth_tokens (user_id, provider, access_token, refresh_token, expires_at)
         VALUES ($1, 'google', $2, $3, $4)`,
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
       WHERE user_id = $1 AND provider = 'google' AND deleted = false
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
       WHERE user_id = $1 AND provider = 'google'`,
      [userId]
    );
  }

  /* ── Calendar Webhooks ── */

  /**
   * Busca um webhook ativo pelo channel ID.
   * @param {string} channelId - ID do channel do Google Calendar
   * @returns {Promise<object|undefined>}
   */
  async getWebhookByChannelId(channelId) {
    const results = await executeQuery(
      `SELECT * FROM google_calendar_webhooks
       WHERE channel_id = $1 AND is_active = true AND deleted = false
       LIMIT 1`,
      [channelId]
    );
    return results[0];
  }

  /**
   * Cria um registro de webhook do Google Calendar.
   * @param {object} params
   * @param {string} params.userId - ID do usuário
   * @param {string} params.calendarId - ID do calendário
   * @param {string} params.channelId - ID do channel
   * @param {string} params.resourceId - ID do recurso monitorado
   * @param {string|null} params.syncToken - Token de sincronização
   * @param {Date|null} params.expiresAt - Data de expiração do webhook
   * @returns {Promise<object>} Registro criado
   */
  async createWebhook({ userId, calendarId, channelId, resourceId, syncToken, expiresAt }) {
    const results = await executeQuery(
      `INSERT INTO google_calendar_webhooks
         (user_id, calendar_id, channel_id, resource_id, sync_token, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [userId, calendarId, channelId, resourceId, syncToken, expiresAt]
    );
    return results[0];
  }

  /**
   * Atualiza o sync token de um webhook existente.
   * @param {string} channelId - ID do channel
   * @param {string} syncToken - Novo sync token
   */
  async updateSyncToken(channelId, syncToken) {
    await rowCount(
      `UPDATE google_calendar_webhooks
       SET sync_token = $1, updated_at = CURRENT_TIMESTAMP
       WHERE channel_id = $2`,
      [syncToken, channelId]
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
       WHERE user_id = $3 AND provider = 'google' AND deleted = false`,
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
       WHERE user_id = $1 AND provider = 'google' AND deleted = false
       LIMIT 1`,
      [userId]
    );
    return results.length > 0;
  }

  /**
   * Retorna todos os webhooks ativos de um usuário.
   * @param {string} userId - ID do usuário
   * @returns {Promise<Array<{channel_id: string, resource_id: string, calendar_id: string}>>}
   */
  async getActiveWebhooks(userId) {
    return executeQuery(
      `SELECT channel_id, resource_id, calendar_id
       FROM google_calendar_webhooks
       WHERE user_id = $1 AND is_active = true AND deleted = false`,
      [userId]
    );
  }

  /**
   * Desativa e marca como deletados todos os webhooks de um usuário (soft delete).
   * @param {string} userId - ID do usuário
   */
  async clearWebhooks(userId) {
    await rowCount(
      `UPDATE google_calendar_webhooks
       SET is_active = false, deleted = true, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $1`,
      [userId]
    );
  }
}

module.exports = new WebhooksRepository();
