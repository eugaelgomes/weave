const {
  listNotificationsQuerySchema,
  markNotificationReadSchema,
  createNotificationSchema,
  notificationIdParamSchema,
} = require("../schemas/notifications.schema");
const NotificationsReadRepository = require("../repositories/notifications-read.repository");
const NotificationsUpdateRepository = require("../repositories/notifications-update.repository");
const NotificationsCreateRepository = require("../repositories/notifications-create.repository");

/**
 * Creates the Notifications tools registry bound to a specific user context.
 *
 * @param {Object} user - The authenticated user object.
 * @returns {Record<string, Object>} The tools definition map.
 */
const createNotificationsTools = (user) => ({
  create_notification: {
    description: "Create a new notification for a specific user.",
    handler: async (args) => {
      try {
        const targetUserId = args.target_user_id || args.user_id;

        const result = await NotificationsCreateRepository.createNotification({
          actorId: user.id,
          content: args.content,
          entityId: args.entity_id,
          entityType: args.entity_type,
          title: args.title,
          type: args.type,
          userId: targetUserId,
        });

        return {
          content: [
            {
              text: JSON.stringify(result, null, 2),
              type: "text",
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              text: `Error creating notification: ${error.message}`,
              type: "text",
            },
          ],
          isError: true,
        };
      }
    },
    name: "create_notification",
    schema: createNotificationSchema,
  },
  list_notifications: {
    description:
      "List notifications for the current user, with optional filtering, pagination, and search.",
    handler: async (args) => {
      try {
        const result = await NotificationsReadRepository.listUserNotifications({
          userId: user.id,
          ...args,
        });

        return {
          content: [
            {
              text: JSON.stringify(result, null, 2),
              type: "text",
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              text: `Error listing notifications: ${error.message}`,
              type: "text",
            },
          ],
          isError: true,
        };
      }
    },
    name: "list_notifications",
    schema: listNotificationsQuerySchema,
  },
  mark_notification_read: {
    description: "Mark a notification as read or unread for the current user.",
    handler: async (args) => {
      try {
        const isRead = args.isRead !== undefined ? args.isRead : args.is_read;
        const result = await NotificationsUpdateRepository.markNotificationRead(
          {
            isRead,
            notificationId: args.notificationId,
            userId: user.id,
          }
        );

        if (!result) {
          throw new Error("Notification not found or access denied.");
        }

        return {
          content: [
            {
              text: JSON.stringify(result, null, 2),
              type: "text",
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              text: `Error marking notification as read: ${error.message}`,
              type: "text",
            },
          ],
          isError: true,
        };
      }
    },
    name: "mark_notification_read",
    schema: notificationIdParamSchema.merge(markNotificationReadSchema),
  },
});

module.exports = {
  createNotificationsTools,
};
