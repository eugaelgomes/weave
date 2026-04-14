const { executeQuery } = require("@/database/connection");

class NotificationsDeleteRepository {
  async deleteNotification({ notificationId, userId }) {
    const query = `
      UPDATE notifications
      SET deleted = true, updated_at = NOW()
      WHERE id = $1::uuid
        AND user_id = $2::uuid
        AND deleted = false
      RETURNING id::text;
    `;

    const rows = await executeQuery(query, [notificationId, userId]);
    return rows.length ? rows[0] : null;
  }
}

module.exports = new NotificationsDeleteRepository();
