const { z } = require("zod");

const uuidParamSchema = z.string().uuid("Invalid UUID format");

const notificationIdParamSchema = z.object({
  notificationId: uuidParamSchema,
});

const listNotificationsQuerySchema = z.object({
  limit: z.string().optional(),
  page: z.string().optional(),
  status: z.string().optional(),
  order: z.string().optional(),
  type: z.string().optional(),
  entity_type: z.string().optional(),
  search: z.string().optional(),
});

const createNotificationSchema = z
  .object({
    user_id: uuidParamSchema.optional().nullable(),
    target_user_id: uuidParamSchema.optional().nullable(),
    type: z.string().min(1, "type is required"),
    entity_type: z.string().min(1, "entity_type is required"),
    entity_id: z.string().min(1, "entity_id is required"),
    title: z.string().min(1, "title is required"),
    content: z.record(z.any()).optional().nullable(),
  })
  .refine((data) => data.user_id || data.target_user_id, {
    message: "user_id or target_user_id is required",
    path: ["user_id"],
  });

const markNotificationReadSchema = z.object({
  is_read: z.boolean().optional().nullable(),
  isRead: z.boolean().optional().nullable(),
});

const toggleTrashStatusSchema = z.object({
  in_trash: z.boolean().optional().nullable(),
  inTrash: z.boolean().optional().nullable(),
});

module.exports = {
  notificationIdParamSchema,
  listNotificationsQuerySchema,
  createNotificationSchema,
  markNotificationReadSchema,
  toggleTrashStatusSchema,
};
