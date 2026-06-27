const { z } = require("zod");

// Reusable schemas
const uuidParamSchema = z.string().uuid("Invalid UUID format");
const publicIdOrUuidSchema = z.string().refine(
  (val) => {
    const isUUID =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        val
      );
    const isPublicId = val.trim().length === 12 && !val.trim().includes("-");
    return isUUID || isPublicId;
  },
  { message: "Invalid ID format (must be UUID or 12-character public ID)" }
);

const syncStatusEnum = z.enum(["SYNCED", "PENDING", "FAILED", "OUT_OF_SYNC"]);

// Event param schemas
const eventIdParamSchema = z.object({
  eventId: uuidParamSchema,
});

const inviteIdParamSchema = z.object({
  eventId: uuidParamSchema,
  inviteId: uuidParamSchema,
});

// Query schemas
const listEventsQuerySchema = z.object({
  organization_id: uuidParamSchema.optional(),
  organizationId: uuidParamSchema.optional(),
  include_deleted: z.string().optional(),
  includeDeleted: z.string().optional(),
  from: z.string().datetime({ offset: true }).or(z.string()).optional(),
  to: z.string().datetime({ offset: true }).or(z.string()).optional(),
});

// Body schemas
const createEventSchema = z
  .object({
    title: z.string().min(1, "title is required"),
    description: z.string().optional().nullable(),
    location: z.string().optional().nullable(),
    organization_id: uuidParamSchema.optional().nullable(),
    organizationId: uuidParamSchema.optional().nullable(),
    note_id: publicIdOrUuidSchema.optional().nullable(),
    noteId: publicIdOrUuidSchema.optional().nullable(),
    project_id: publicIdOrUuidSchema.optional().nullable(),
    projectId: publicIdOrUuidSchema.optional().nullable(),
    start_time: z.string().or(z.date()).optional(),
    startTime: z.string().or(z.date()).optional(),
    end_time: z.string().or(z.date()).optional(),
    endTime: z.string().or(z.date()).optional(),
    is_all_day: z.boolean().optional().nullable(),
    isAllDay: z.boolean().optional().nullable(),
    is_from_note: z.boolean().optional().nullable(),
    isFromNote: z.boolean().optional().nullable(),
    is_from_project: z.boolean().optional().nullable(),
    isFromProject: z.boolean().optional().nullable(),
    sync_status: syncStatusEnum.optional().nullable(),
    syncStatus: syncStatusEnum.optional().nullable(),
    sync_with_google: z.boolean().optional().nullable(),
    syncWithGoogle: z.boolean().optional().nullable(),
    create_google_meet: z.boolean().optional().nullable(),
    createGoogleMeet: z.boolean().optional().nullable(),
    attendees: z
      .array(z.string().email("Invalid email in attendees"))
      .optional(),
    guests: z.array(z.string().email("Invalid email in guests")).optional(),
    google_calendar_id: z.string().optional().nullable(),
    googleCalendarId: z.string().optional().nullable(),
    google_event_id: z.string().optional().nullable(),
    googleEventId: z.string().optional().nullable(),
    outlook_calendar_id: z.string().optional().nullable(),
    outlookCalendarId: z.string().optional().nullable(),
    outlook_event_id: z.string().optional().nullable(),
    outlookEventId: z.string().optional().nullable(),
    etag: z.string().optional().nullable(),
    last_synced_at: z.string().or(z.date()).optional().nullable(),
    lastSyncedAt: z.string().or(z.date()).optional().nullable(),
  })
  .refine((data) => data.start_time || data.startTime, {
    message: "start_time or startTime is required",
    path: ["start_time"],
  })
  .refine((data) => data.end_time || data.endTime, {
    message: "end_time or endTime is required",
    path: ["end_time"],
  });

const updateEventSchema = z.object({
  title: z.string().min(1, "title cannot be empty").optional(),
  description: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  organization_id: uuidParamSchema.optional().nullable(),
  organizationId: uuidParamSchema.optional().nullable(),
  note_id: publicIdOrUuidSchema.optional().nullable(),
  noteId: publicIdOrUuidSchema.optional().nullable(),
  project_id: publicIdOrUuidSchema.optional().nullable(),
  projectId: publicIdOrUuidSchema.optional().nullable(),
  start_time: z.string().or(z.date()).optional(),
  startTime: z.string().or(z.date()).optional(),
  end_time: z.string().or(z.date()).optional(),
  endTime: z.string().or(z.date()).optional(),
  is_all_day: z.boolean().optional().nullable(),
  isAllDay: z.boolean().optional().nullable(),
  is_from_note: z.boolean().optional().nullable(),
  isFromNote: z.boolean().optional().nullable(),
  is_from_project: z.boolean().optional().nullable(),
  isFromProject: z.boolean().optional().nullable(),
  sync_status: syncStatusEnum.optional().nullable(),
  syncStatus: syncStatusEnum.optional().nullable(),
  sync_with_google: z.boolean().optional().nullable(),
  syncWithGoogle: z.boolean().optional().nullable(),
  create_google_meet: z.boolean().optional().nullable(),
  createGoogleMeet: z.boolean().optional().nullable(),
  attendees: z.array(z.string().email("Invalid email in attendees")).optional(),
  guests: z.array(z.string().email("Invalid email in guests")).optional(),
  google_calendar_id: z.string().optional().nullable(),
  googleCalendarId: z.string().optional().nullable(),
  google_event_id: z.string().optional().nullable(),
  googleEventId: z.string().optional().nullable(),
  outlook_calendar_id: z.string().optional().nullable(),
  outlookCalendarId: z.string().optional().nullable(),
  outlook_event_id: z.string().optional().nullable(),
  outlookEventId: z.string().optional().nullable(),
  etag: z.string().optional().nullable(),
  last_synced_at: z.string().or(z.date()).optional().nullable(),
  lastSyncedAt: z.string().or(z.date()).optional().nullable(),
});

// Invites
const createInviteSchema = z.object({
  email: z.string().email("Email is required and must be a valid email"),
  role: z.string().optional(),
  status: z.string().optional(),
  userId: uuidParamSchema.optional().nullable(),
  externalGuestId: uuidParamSchema.optional().nullable(),
});

const updateInviteSchema = z.object({
  role: z.string().optional(),
  status: z.string().optional(),
});

// FreeBusy
const checkFreeBusySchema = z.object({
  timeMin: z.string().min(1, "timeMin is required"),
  timeMax: z.string().min(1, "timeMax is required"),
  items: z
    .array(
      z.object({
        id: z.string(),
      })
    )
    .optional(),
});

module.exports = {
  eventIdParamSchema,
  inviteIdParamSchema,
  listEventsQuerySchema,
  createEventSchema,
  updateEventSchema,
  createInviteSchema,
  updateInviteSchema,
  checkFreeBusySchema,
};
