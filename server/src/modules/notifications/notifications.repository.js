const { executeQuery } = require("@/database/connection");
const { normalizeNotificationPayload } = require("./normalize");

class NotificationsRepository {
  _mapNotificationRow(row) {
    if (!row) {
      return null;
    }

    return {
      id: row.id,
      user_id: row.user_id,
      actor_id: row.actor_id,
      actor: row.actor_id
        ? {
            id: row.actor_id,
            name: row.actor_name,
            username: row.actor_username,
            email: row.actor_email,
            avatar_url: row.actor_avatar_url,
          }
        : null,
      type: row.type,
      entity_type: row.entity_type,
      entity_id: row.entity_id,
      title: row.title,
      content: row.content || {},
      is_read: row.is_read,
      read_at: row.read_at,
      in_trash: row.in_trash,
      trashed_at: row.trashed_at,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

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
      userId,
      actorId,
      type,
      entityType,
      entityId,
      title,
      content,
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
      normalized.type,
      normalized.entityType,
      normalized.entityId,
      normalized.title,
      JSON.stringify(normalized.content || {}),
    ]);

    return rows.length ? this._mapNotificationRow(rows[0]) : null;
  }

  async listUserNotifications({
    userId,
    filter = "all",
    limit = 20,
    offset = 0,
    type,
    entityType,
    search,
    order = "desc",
  }) {
    const filters = ["n.user_id = $1::uuid", "n.deleted = false"];
    const params = [userId];
    let paramIndex = params.length;

    if (filter === "unread") {
      filters.push("n.is_read = false", "n.in_trash = false");
    } else if (filter === "trash") {
      filters.push("n.in_trash = true");
    } else if (filter === "read") {
      filters.push("n.is_read = true", "n.in_trash = false");
    } else {
      filters.push("n.in_trash = false");
    }

    if (type) {
      paramIndex += 1;
      filters.push(`n.type = $${paramIndex}::notification_type_enum`);
      params.push(type);
    }

    if (entityType) {
      paramIndex += 1;
      filters.push(
        `n.entity_type = $${paramIndex}::notification_entity_type_enum`
      );
      params.push(entityType);
    }

    if (search) {
      paramIndex += 1;
      filters.push(`n.title ILIKE $${paramIndex}`);
      params.push(`%${search}%`);
    }

    paramIndex += 1;
    params.push(limit);
    paramIndex += 1;
    params.push(offset);

    const orderDirection = order === "asc" ? "ASC" : "DESC";

    const query = `
      SELECT
        n.id::text,
        n.user_id::text,
        n.actor_id::text,
        n.type,
        n.entity_type,
        n.entity_id::text,
        n.title,
        n.content,
        n.is_read,
        n.read_at,
        n.in_trash,
        n.trashed_at,
        n.created_at,
        n.updated_at,
        u.name AS actor_name,
        u.username AS actor_username,
        u.email AS actor_email,
        u.avatar_url AS actor_avatar_url,
        COUNT(*) OVER() AS total_count
      FROM notifications n
      LEFT JOIN users u ON u.user_id = n.actor_id
      WHERE ${filters.join(" AND ")}
      ORDER BY n.created_at ${orderDirection}
      LIMIT $${paramIndex - 1}
      OFFSET $${paramIndex};
    `;

    const rows = await executeQuery(query, params);
    const total = rows.length ? Number(rows[0].total_count) : 0;

    return {
      notifications: rows.map((row) => this._mapNotificationRow(row)),
      total,
    };
  }

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
    return rows.length ? this._mapNotificationRow(rows[0]) : null;
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
    return rows.length ? this._mapNotificationRow(rows[0]) : null;
  }

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

module.exports = new NotificationsRepository();
