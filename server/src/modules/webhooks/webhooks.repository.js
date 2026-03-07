const { executeQuery, rowCount } = require("@/services/db/index");

class WebhooksRepository {
  /* ── OAuth Tokens ── */

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

  async clearGoogleTokens(userId) {
    await rowCount(
      `UPDATE user_oauth_tokens
       SET deleted = true, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $1 AND provider = 'google'`,
      [userId]
    );
  }

  /* ── Calendar Webhooks ── */

  async getWebhookByChannelId(channelId) {
    const results = await executeQuery(
      `SELECT * FROM google_calendar_webhooks
       WHERE channel_id = $1 AND is_active = true AND deleted = false
       LIMIT 1`,
      [channelId]
    );
    return results[0];
  }

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

  async updateSyncToken(channelId, syncToken) {
    await rowCount(
      `UPDATE google_calendar_webhooks
       SET sync_token = $1, updated_at = CURRENT_TIMESTAMP
       WHERE channel_id = $2`,
      [syncToken, channelId]
    );
  }
}

module.exports = new WebhooksRepository();