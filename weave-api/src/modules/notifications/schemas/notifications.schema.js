const { z } = require("zod");

const uuidParamSchema = z
  .string()
  .uuid("Invalid UUID format")
  .describe("Unique identifier of the resource in UUID format.");

const notificationIdParamSchema = z
  .object({
    notificationId: uuidParamSchema.describe(
      "The unique identifier of the notification to be referenced."
    ),
  })
  .describe("Schema for identifying a specific notification by its ID.");

const listNotificationsQuerySchema = z
  .object({
    entity_type: z
      .string()
      .optional()
      .describe(
        "Filters notifications by the type of the associated entity, such as note, comment, or sprint."
      ),
    limit: z
      .string()
      .optional()
      .describe(
        "Maximum number of notifications to return in a single page request. Must be a valid integer."
      ),
    order: z
      .string()
      .optional()
      .describe(
        "The sorting direction for notifications. Allowed values are ASC for ascending or DESC for descending ordering."
      ),
    page: z
      .string()
      .optional()
      .describe(
        "The page index to fetch for pagination. Must be a valid integer."
      ),
    search: z
      .string()
      .optional()
      .describe(
        "Search term used to filter notifications by matching title or text content."
      ),
    status: z
      .string()
      .optional()
      .describe(
        "Filters notifications by status, which can be READ, UNREAD, or TRASH."
      ),
    type: z
      .string()
      .optional()
      .describe("Filters notifications by notification type classification."),
  })
  .describe(
    "Query schema for filtering, paginating, and searching the notifications list."
  );

const createNotificationSchema = z
  .object({
    content: z
      .record(z.any())
      .optional()
      .nullable()
      .describe(
        "Optional structured metadata or payload containing extra details relevant to the notification context."
      ),
    entity_id: z
      .string()
      .min(1, "entity_id is required")
      .describe(
        "The unique identifier of the entity associated with this notification."
      ),
    entity_type: z
      .string()
      .min(1, "entity_type is required")
      .describe(
        "The type classification of the entity associated with this notification, such as note or project."
      ),
    target_user_id: uuidParamSchema
      .optional()
      .nullable()
      .describe(
        "The unique identifier of the user who is the target recipient of this notification."
      ),
    title: z
      .string()
      .min(1, "title is required")
      .describe("The primary title or headline text of the notification."),
    type: z
      .string()
      .min(1, "type is required")
      .describe(
        "The category or classification of this notification, such as note_collaboration or system_alert."
      ),
    user_id: uuidParamSchema
      .optional()
      .nullable()
      .describe(
        "The unique identifier of the user creating the notification, or the sender user context."
      ),
  })
  .refine((data) => data.user_id || data.target_user_id, {
    message: "user_id or target_user_id is required",
    path: ["user_id"],
  })
  .describe(
    "Schema for creating a new notification. Requires at least user_id or target_user_id, along with title, type, entity_id, and entity_type."
  );

const markNotificationReadSchema = z
  .object({
    is_read: z
      .boolean()
      .optional()
      .nullable()
      .describe(
        "Flag to indicate if the notification should be marked as read using snake_case parameter."
      ),
    isRead: z
      .boolean()
      .optional()
      .nullable()
      .describe(
        "Flag to indicate if the notification should be marked as read using camelCase parameter."
      ),
  })
  .describe("Schema for marking a notification as read or unread.");

const toggleTrashStatusSchema = z
  .object({
    in_trash: z
      .boolean()
      .optional()
      .nullable()
      .describe(
        "Flag to indicate if the notification should be placed in the trash using snake_case parameter."
      ),
    inTrash: z
      .boolean()
      .optional()
      .nullable()
      .describe(
        "Flag to indicate if the notification should be placed in the trash using camelCase parameter."
      ),
  })
  .describe("Schema for moving a notification to or from the trash.");

module.exports = {
  createNotificationSchema,
  listNotificationsQuerySchema,
  markNotificationReadSchema,
  notificationIdParamSchema,
  toggleTrashStatusSchema,
};
