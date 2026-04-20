const { executeQuery } = require("@/database/connection");
const {
  mapNotificationRow,
} = require("@/modules/notifications/repositories/notification-mapping");

class NotificationsReadRepository {
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
      notifications: rows.map((row) => mapNotificationRow(row)),
      total,
    };
  }
}

module.exports = new NotificationsReadRepository();
