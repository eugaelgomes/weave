import { z } from "zod";

export const NotificationTypeSchema = z.enum([
  "system_alert",
  "system_update",
  "organization_invite",
  "organization_action",
  "project_invite",
  "project_action",
  "note_shared",
  "note_action",
  "ai_action",
  "job_action",
]);

export const NotificationEntityTypeSchema = z.enum([
  "organization",
  "project",
  "note",
  "job",
  "weave-ai",
]);

export const NotificationStatusFilterSchema = z.enum(["all", "unread", "read", "trash"]);

export const NotificationActorSchema = z.object({
  id: z.string(),
  name: z.string().nullable().optional(),
  username: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  avatar_url: z.string().nullable().optional(),
});

export const NotificationSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  actor_id: z.string().nullable().optional(),
  actor: NotificationActorSchema.nullable(),
  type: NotificationTypeSchema,
  entity_type: NotificationEntityTypeSchema,
  entity_id: z.string(),
  title: z.string(),
  content: z.union([z.string(), z.record(z.string(), z.unknown())]),
  is_read: z.boolean(),
  read_at: z.string().nullable(),
  in_trash: z.boolean(),
  trashed_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const PaginationMetaSchema = z.object({
  page: z.number(),
  limit: z.number(),
  total: z.number(),
  total_pages: z.number(),
});

export const NotificationsResponseSchema = z.object({
  notifications: z.array(NotificationSchema),
  pagination: PaginationMetaSchema,
});

export const NotificationEnvelopeSchema = z.object({
  notification: NotificationSchema,
});

export const MarkAllReadResponseSchema = z.object({
  updated: z.number(),
});

export type NotificationType = z.infer<typeof NotificationTypeSchema>;
export type NotificationEntityType = z.infer<typeof NotificationEntityTypeSchema>;
export type NotificationStatusFilter = z.infer<typeof NotificationStatusFilterSchema>;
export type NotificationActor = z.infer<typeof NotificationActorSchema>;
export type NotificationRow = z.infer<typeof NotificationSchema>;
export type PaginationMeta = z.infer<typeof PaginationMetaSchema>;
