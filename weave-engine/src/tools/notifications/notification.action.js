const { pool } = require("../../services/database/postgres.client");

async function getUnreadNotifications(args) {
  if (!args.userId)
    return { error: "No userId provided in execution context." };
  const limit =
    typeof args.limit === "number" && args.limit > 0 ? args.limit : 10;

  try {
    const query = `
      SELECT id, type, entity_type, entity_id, title, content, created_at
      FROM notifications
      WHERE deleted = false AND is_read = false AND in_trash = false AND user_id = $1::uuid
      ORDER BY created_at DESC
      LIMIT $2
    `;
    const result = await pool.query(query, [args.userId, limit]);

    return {
      notifications: result.rows,
      success: true,
    };
  } catch (error) {
    console.error("Error in getUnreadNotifications tool:", error);
    return { error: `Database error: ${error.message}` };
  }
}

async function markNotificationRead(args) {
  if (!args.userId)
    return { error: "No userId provided in execution context." };

  try {
    const query = `
      UPDATE notifications
      SET is_read = true, read_at = now(), updated_at = now()
      WHERE id = $1::uuid AND user_id = $2::uuid AND deleted = false
      RETURNING id
    `;
    const result = await pool.query(query, [args.notificationId, args.userId]);

    if (result.rowCount === 0) {
      return {
        error:
          "Notificação not found ou você não tem permission para alterá-la.",
      };
    }

    return {
      message: "Notificação marcada como lida.",
      success: true,
    };
  } catch (error) {
    console.error("Error in markNotificationRead tool:", error);
    return { error: `Database error: ${error.message}` };
  }
}

module.exports = {
  getUnreadNotifications,
  markNotificationRead,
};
