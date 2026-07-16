const { executeQuery } = require("@/database/connection");
const { normalizeNotificationPayload } = require("../normalize");
const {
  mapNotificationRow,
} = require("@/modules/notifications/repositories/notification-mapping");

class NotificationsCreateRepository {
  async createNotification({
    userId,
    actorId = null,
    type,
    entityType,
    entityId,
    title,
    content = {},
  }) {
    const normalized = normalizeNotificationPayload({
      actorId,
      content,
      entityId,
      entityType,
      title,
      type,
      userId,
    });

    const query = `
      INSERT INTO notifications (
        user_id,
        actor_id,
        type,
        entity_type,
        entity_id,
        title,
        content
      )
      VALUES (
        $1::uuid,
        $2::uuid,
        $3::notification_type_enum,
        $4::notification_entity_type_enum,
        $5::uuid,
        $6,
        $7::jsonb
      )
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

    const rows = await executeQuery(query, [
      normalized.userId,
      normalized.actorId,
      normalized.type ? normalized.type.toUpperCase() : null,
      normalized.entityType ? normalized.entityType.toUpperCase() : null,
      normalized.entityId,
      normalized.title,
      JSON.stringify(normalized.content || {}),
    ]);

    return rows.length ? mapNotificationRow(rows[0]) : null;
  }
}

module.exports = new NotificationsCreateRepository();
