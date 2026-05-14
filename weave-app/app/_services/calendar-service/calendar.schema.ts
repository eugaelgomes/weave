import { z } from "zod";

// =================== GOOGLE CALENDAR SCHEMAS ===================

export const GoogleCalendarEventSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  start: z.string().nullable().optional(),
  end: z.string().nullable().optional(),
  allDay: z.boolean(),
  htmlLink: z.string().nullable().optional(),
  colorId: z.string().nullable().optional(),
});

export const CalendarEventsResponseSchema = z.object({
  connected: z.boolean(),
  events: z.array(GoogleCalendarEventSchema),
  error: z.string().optional(),
});

export const GoogleCalendarSchema = z.object({
  id: z.string(),
  summary: z.string(),
  description: z.string().optional(),
  timeZone: z.string().optional(),
  primary: z.boolean().optional(),
});

export const GoogleCalendarSettingSchema = z.object({
  id: z.string(),
  value: z.string(),
});

export const FreeBusyResponseSchema = z.record(
  z.string(),
  z.object({
    busy: z.array(z.object({ start: z.string(), end: z.string() })),
  })
);

// =================== INTERNAL CALENDAR SCHEMAS ===================

export const SyncStatusSchema = z.enum(["SYNCED", "PENDING", "FAILED", "OUT_OF_SYNC"]);

export const InternalCalendarEventSchema = z.object({
  id: z.string(),
  organization_id: z.string().nullable().optional(),
  creator_id: z.string(),
  title: z.string(),
  description: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  start_time: z.string(),
  end_time: z.string(),
  is_all_day: z.boolean(),
  note_id: z.string().nullable().optional(),
  project_id: z.string().nullable().optional(),
  is_from_note: z.boolean(),
  is_from_project: z.boolean(),
  google_event_id: z.string().nullable().optional(),
  google_calendar_id: z.string().nullable().optional(),
  outlook_event_id: z.string().nullable().optional(),
  outlook_calendar_id: z.string().nullable().optional(),
  last_synced_at: z.string().nullable().optional(),
  sync_status: SyncStatusSchema,
  etag: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
  deleted: z.boolean(),
  deleted_at: z.string().nullable().optional(),
});

export const CreateInternalCalendarEventPayloadSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  location: z.string().optional(),
  start_time: z.string(),
  end_time: z.string(),
  is_all_day: z.boolean().optional(),
  create_google_meet: z.boolean().optional(),
  attendees: z.array(z.string()).optional(),
  organization_id: z.string().optional(),
  note_id: z.string().optional(),
  project_id: z.string().optional(),
  is_from_note: z.boolean().optional(),
  is_from_project: z.boolean().optional(),
  sync_with_google: z.boolean().optional(),
  google_calendar_id: z.string().optional(),
});

// =================== CALENDAR INVITE SCHEMAS ===================

export const InviteRoleSchema = z.enum(["ORGANIZER", "REQUIRED", "OPTIONAL", "RESOURCE"]);
export const InviteStatusSchema = z.enum(["PENDING", "ACCEPTED", "DECLINED", "TENTATIVE"]);

export const InternalCalendarEventInviteSchema = z.object({
  id: z.string(),
  event_id: z.string(),
  user_id: z.string().nullable().optional(),
  email: z.string(),
  role: InviteRoleSchema,
  status: InviteStatusSchema,
  external_guest_id: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
  deleted: z.boolean(),
  deleted_at: z.string().nullable().optional(),
});

export const CreateCalendarEventInvitePayloadSchema = z.object({
  email: z.string(),
  role: InviteRoleSchema.optional(),
  status: InviteStatusSchema.optional(),
  userId: z.string().optional(),
  externalGuestId: z.string().optional(),
});

export const UpdateCalendarEventInvitePayloadSchema = z.object({
  role: InviteRoleSchema.optional(),
  status: InviteStatusSchema.optional(),
});

// =================== INFERRED TYPES ===================

export type GoogleCalendarEvent = z.infer<typeof GoogleCalendarEventSchema>;
export type CalendarEventsResponse = z.infer<typeof CalendarEventsResponseSchema>;
export type GoogleCalendar = z.infer<typeof GoogleCalendarSchema>;
export type GoogleCalendarSetting = z.infer<typeof GoogleCalendarSettingSchema>;
export type FreeBusyResponse = z.infer<typeof FreeBusyResponseSchema>;

export type InternalCalendarEvent = z.infer<typeof InternalCalendarEventSchema>;
export type CreateInternalCalendarEventPayload = z.infer<typeof CreateInternalCalendarEventPayloadSchema>;

export type InternalCalendarEventInvite = z.infer<typeof InternalCalendarEventInviteSchema>;
export type CreateCalendarEventInvitePayload = z.infer<typeof CreateCalendarEventInvitePayloadSchema>;
export type UpdateCalendarEventInvitePayload = z.infer<typeof UpdateCalendarEventInvitePayloadSchema>;
