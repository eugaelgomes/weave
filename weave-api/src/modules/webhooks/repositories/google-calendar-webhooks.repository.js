const { executeQuery, rowCount } = require("@/database/connection");

/**
 * Persistência de canais/watch do Google Calendar (`google_calendar_webhooks`).
 */
class GoogleCalendarWebhooksRepository {
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

module.exports = new GoogleCalendarWebhooksRepository();
