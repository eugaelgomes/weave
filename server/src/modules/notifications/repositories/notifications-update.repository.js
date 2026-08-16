const { executeQuery } = require("@/database/connection");
const { mapNotificationRow } = require("@/modules/notifications/repositories/notification-mapping");

class NotificationsUpdateRepository {
  async markNotificationRead({ notificationId, userId, isRead }) {
    const query = `
      UPDATE notifications
      SET
        is_read = $3,
        read_at = CASE WHEN $3 THEN NOW() ELSE NULL END,
        updated_at = NOW()
      WHERE id = $1::uuid
        AND user_id = $2::uuid
        AND deleted = false
      RETURNING 
        id::text,
        user_id::text,
        actor_id::text,
        type,
        entity_type,
        entity_id::text,
        title,
        content,
        is_read,
        read_at,
        in_trash,
        trashed_at,
        created_at,
        updated_at,
        (SELECT name FROM users WHERE users.user_id = notifications.actor_id) AS actor_name,
        (SELECT username FROM users WHERE users.user_id = notifications.actor_id) AS actor_username,
        (SELECT email FROM users WHERE users.user_id = notifications.actor_id) AS actor_email,
        (SELECT avatar_url FROM users WHERE users.user_id = notifications.actor_id) AS actor_avatar_url;
    `;

    const rows = await executeQuery(query, [notificationId, userId, isRead]);
    return rows.length ? mapNotificationRow(rows[0]) : null;
  }

  async markAllAsRead(userId) {
    const query = `
      UPDATE notifications
      SET
        is_read = true,
        read_at = NOW(),
        updated_at = NOW()
      WHERE user_id = $1::uuid
        AND deleted = false
        AND in_trash = false
        AND is_read = false
      RETURNING id::text;
    `;

    const rows = await executeQuery(query, [userId]);
    return rows.length;
  }

  async toggleTrashStatus({ notificationId, userId, inTrash }) {
    const query = `
      UPDATE notifications
      SET
        in_trash = $3,
        trashed_at = CASE WHEN $3 THEN NOW() ELSE NULL END,
        updated_at = NOW()
      WHERE id = $1::uuid
        AND user_id = $2::uuid
        AND deleted = false
      RETURNING 
        id::text,
        user_id::text,
        actor_id::text,
        type,
        entity_type,
        entity_id::text,
        title,
        content,
        is_read,
        read_at,
        in_trash,
        trashed_at,
        created_at,
        updated_at,
        (SELECT name FROM users WHERE users.user_id = notifications.actor_id) AS actor_name,
        (SELECT username FROM users WHERE users.user_id = notifications.actor_id) AS actor_username,
        (SELECT email FROM users WHERE users.user_id = notifications.actor_id) AS actor_email,
        (SELECT avatar_url FROM users WHERE users.user_id = notifications.actor_id) AS actor_avatar_url;
    `;

    const rows = await executeQuery(query, [notificationId, userId, inTrash]);
    return rows.length ? mapNotificationRow(rows[0]) : null;
  }
}

module.exports = new NotificationsUpdateRepository();
