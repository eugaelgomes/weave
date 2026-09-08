const { prisma } = require("@theweave/database");
const { normalizeNotificationPayload } = require("../normalize");

/**
 * Repository for managing user notifications.
 */
class NotificationsRepository {
  /**
   * Helper to map Prisma notification result to the standard output format.
   * @param {Object} row - The raw notification object from Prisma.
   * @returns {Object|null}
   * @private
   */
  #mapNotification(row) {
    if (!row) {
      return null;
    }

    const { users_notifications_actor_idTousers: actorData, ...rest } = row;

    return {
      ...rest,
      actor: actorData
        ? {
            avatar_url: actorData.avatar_url,
            email: actorData.email,
            id: actorData.user_id,
            name: actorData.name,
            username: actorData.username,
          }
        : null,
    };
  }

  /**
   * Creates a new notification.
   * @param {Object} params
   * @param {string} params.userId - The ID of the user receiving the notification.
   * @param {string} [params.actorId=null] - The ID of the user who triggered the notification.
   * @param {string} params.type - The notification type.
   * @param {string} params.entityType - The type of entity associated with the notification.
   * @param {string} params.entityId - The ID of the entity.
   * @param {string} params.title - The notification title.
   * @param {Object} [params.content={}] - Additional context or data for the notification.
   * @param {import("@prisma/client").PrismaClient} [client=prisma] - Optional Prisma client for transactions.
   * @returns {Promise<Object>} The created notification.
   */
  async createNotification(
    { userId, actorId = null, type, entityType, entityId, title, content = {} },
    client = prisma
  ) {
    const normalized = normalizeNotificationPayload({
      actorId,
      content,
      entityId,
      entityType,
      title,
      type,
      userId,
    });

    const result = await client.notifications.create({
      data: {
        actor_id: normalized.actorId,
        content: normalized.content || {},
        entity_id: normalized.entityId,
        entity_type: normalized.entityType ? normalized.entityType.toUpperCase() : undefined,
        title: normalized.title,
        type: normalized.type ? normalized.type.toUpperCase() : undefined,
        user_id: normalized.userId,
      },
      include: {
        users_notifications_actor_idTousers: {
          select: {
            avatar_url: true,
            email: true,
            name: true,
            user_id: true,
            username: true,
          },
        },
      },
    });

    return this.#mapNotification(result);
  }

  /**
   * Lists notifications for a given user based on filters.
   * @param {Object} params
   * @param {string} params.userId - The ID of the user.
   * @param {string} [params.filter="all"] - Filter status ("all", "unread", "trash", "read").
   * @param {number} [params.limit=20] - Max number of notifications to return.
   * @param {number} [params.offset=0] - Number of items to skip.
   * @param {string} [params.type] - Filter by notification type.
   * @param {string} [params.entityType] - Filter by entity type.
   * @param {string} [params.search] - Search query for title.
   * @param {string} [params.order="desc"] - Order direction ("asc" or "desc").
   * @param {import("@prisma/client").PrismaClient} [client=prisma] - Optional Prisma client for transactions.
   * @returns {Promise<{notifications: Object[], total: number}>}
   */
  async listUserNotifications(
    { userId, filter = "all", limit = 20, offset = 0, type, entityType, search, order = "desc" },
    client = prisma
  ) {
    const where = {
      deleted: false,
      user_id: userId,
    };

    if (filter === "unread") {
      where.is_read = false;
      where.in_trash = false;
    } else if (filter === "trash") {
      where.in_trash = true;
    } else if (filter === "read") {
      where.is_read = true;
      where.in_trash = false;
    } else {
      where.in_trash = false;
    }

    if (type) {
      where.type = type.toUpperCase();
    }

    if (entityType) {
      where.entity_type = entityType.toUpperCase();
    }

    if (search) {
      where.title = {
        contains: search,
        mode: "insensitive",
      };
    }

    const orderDirection = order === "asc" ? "asc" : "desc";

    const [rows, total] = await Promise.all([
      client.notifications.findMany({
        include: {
          users_notifications_actor_idTousers: {
            select: {
              avatar_url: true,
              email: true,
              name: true,
              user_id: true,
              username: true,
            },
          },
        },
        orderBy: { created_at: orderDirection },
        skip: offset,
        take: limit,
        where,
      }),
      client.notifications.count({ where }),
    ]);

    return {
      notifications: rows.map((row) => this.#mapNotification(row)),
      total,
    };
  }

  /**
   * Marks a notification as read or unread.
   * @param {Object} params
   * @param {string} params.notificationId - The ID of the notification.
   * @param {string} params.userId - The ID of the user.
   * @param {boolean} params.isRead - Whether to mark as read or unread.
   * @param {import("@prisma/client").PrismaClient} [client=prisma] - Optional Prisma client for transactions.
   * @returns {Promise<Object|null>} The updated notification, or null if not found.
   */
  async markNotificationRead({ notificationId, userId, isRead }, client = prisma) {
    try {
      const result = await client.notifications.update({
        data: {
          is_read: isRead,
          read_at: isRead ? new Date() : null,
          updated_at: new Date(),
        },
        include: {
          users_notifications_actor_idTousers: {
            select: {
              avatar_url: true,
              email: true,
              name: true,
              user_id: true,
              username: true,
            },
          },
        },
        where: {
          deleted: false,
          id: notificationId,
          user_id: userId,
        },
      });

      return this.#mapNotification(result);
    } catch (error) {
      if (error.code === "P2025") {
        return null;
      }
      throw error;
    }
  }

  /**
   * Marks all unread, non-trashed notifications as read for a user.
   * @param {string} userId - The ID of the user.
   * @param {import("@prisma/client").PrismaClient} [client=prisma] - Optional Prisma client for transactions.
   * @returns {Promise<number>} The number of notifications marked as read.
   */
  async markAllAsRead(userId, client = prisma) {
    const result = await client.notifications.updateMany({
      data: {
        is_read: true,
        read_at: new Date(),
        updated_at: new Date(),
      },
      where: {
        deleted: false,
        in_trash: false,
        is_read: false,
        user_id: userId,
      },
    });

    return result.count;
  }

  /**
   * Moves a notification to or out of the trash.
   * @param {Object} params
   * @param {string} params.notificationId - The ID of the notification.
   * @param {string} params.userId - The ID of the user.
   * @param {boolean} params.inTrash - Whether to move to trash or restore.
   * @param {import("@prisma/client").PrismaClient} [client=prisma] - Optional Prisma client for transactions.
   * @returns {Promise<Object|null>} The updated notification, or null if not found.
   */
  async toggleTrashStatus({ notificationId, userId, inTrash }, client = prisma) {
    try {
      const result = await client.notifications.update({
        data: {
          in_trash: inTrash,
          trashed_at: inTrash ? new Date() : null,
          updated_at: new Date(),
        },
        include: {
          users_notifications_actor_idTousers: {
            select: {
              avatar_url: true,
              email: true,
              name: true,
              user_id: true,
              username: true,
            },
          },
        },
        where: {
          deleted: false,
          id: notificationId,
          user_id: userId,
        },
      });

      return this.#mapNotification(result);
    } catch (error) {
      if (error.code === "P2025") {
        return null;
      }
      throw error;
    }
  }

  /**
   * Soft-deletes a notification.
   * @param {Object} params
   * @param {string} params.notificationId - The ID of the notification.
   * @param {string} params.userId - The ID of the user.
   * @param {import("@prisma/client").PrismaClient} [client=prisma] - Optional Prisma client for transactions.
   * @returns {Promise<Object|null>} The deleted notification's ID object, or null if not found.
   */
  async deleteNotification({ notificationId, userId }, client = prisma) {
    try {
      const result = await client.notifications.update({
        data: {
          deleted: true,
          deleted_at: new Date(),
          updated_at: new Date(),
        },
        select: {
          id: true,
        },
        where: {
          deleted: false,
          id: notificationId,
          user_id: userId,
        },
      });

      return result;
    } catch (error) {
      if (error.code === "P2025") {
        return null;
      }
      throw error;
    }
  }
}

module.exports = new NotificationsRepository();
