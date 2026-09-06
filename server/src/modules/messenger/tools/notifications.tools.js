const { z } = require("zod");
const NotificationsRepository = require("../repositories/notifications.repository");

const manageNotificationsSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create"),
    content: z.string().optional().describe("Content of the notification"),
    entity_id: z.string().optional().describe("Associated entity ID"),
    entity_type: z.string().optional().describe("Associated entity type"),
    target_user_id: z.string().uuid().optional().describe("ID of the target user"),
    title: z.string().optional().describe("Title of the notification"),
    type: z.string().optional().describe("Type of notification"),
  }),
  z.object({
    action: z.literal("list"),
  }),
  z.object({
    action: z.literal("mark_read"),
    isRead: z.boolean().optional().describe("Whether to mark as read or unread"),
    notificationId: z.string().uuid().describe("ID of the notification"),
  }),
]);

const createNotificationsTools = (user) => ({
  manage_notifications: {
    description: "Manage notifications (create, list, mark_read).",
    handler: async (args) => {
      try {
        const {
          action,
          notificationId,
          target_user_id,
          content,
          title,
          type,
          entity_id,
          entity_type,
          isRead,
          ...listArgs
        } = args;

        if (action === "create") {
          const result = await NotificationsRepository.createNotification({
            actorId: user.id,
            content,
            entityId: entity_id,
            entityType: entity_type,
            title,
            type,
            userId: target_user_id || user.id,
          });
          return {
            content: [{ text: JSON.stringify(result, null, 2), type: "text" }],
          };
        }

        if (action === "list") {
          const result = await NotificationsRepository.listUserNotifications({
            userId: user.id,
            ...listArgs,
          });
          return {
            content: [{ text: JSON.stringify(result, null, 2), type: "text" }],
          };
        }

        if (action === "mark_read") {
          if (!notificationId) throw new Error("notificationId is required for mark_read action.");
          const result = await NotificationsRepository.markNotificationRead({
            isRead: isRead !== undefined ? isRead : true,
            notificationId,
            userId: user.id,
          });
          if (!result) throw new Error("Notification not found or access denied.");
          return {
            content: [{ text: JSON.stringify(result, null, 2), type: "text" }],
          };
        }

        throw new Error(`Invalid action: ${action}`);
      } catch (error) {
        return {
          content: [
            {
              text: `Error managing notifications: ${error.message}`,
              type: "text",
            },
          ],
          isError: true,
        };
      }
    },
    name: "manage_notifications",
    schema: manageNotificationsSchema,
  },
});

module.exports = {
  createNotificationsTools,
};
