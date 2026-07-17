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
  from: z
    .string()
    .datetime({ offset: true })
    .or(z.string())
    .optional()
    .describe("Start date/time to filter events from"),
  include_deleted: z
    .string()
    .optional()
    .describe("Whether to include deleted events in the list"),
  includeDeleted: z
    .string()
    .optional()
    .describe("Whether to include deleted events in the list (camelCase)"),
  organization_id: uuidParamSchema
    .optional()
    .describe("Organization ID to filter events by"),
  organizationId: uuidParamSchema
    .optional()
    .describe("Organization ID to filter events by (camelCase)"),
  to: z
    .string()
    .datetime({ offset: true })
    .or(z.string())
    .optional()
    .describe("End date/time to filter events to"),
});

// Body schemas
const createEventSchema = z
  .object({
    attendees: z
      .array(z.string().email("Invalid email in attendees"))
      .optional()
      .describe("List of attendee emails for the event"),
    create_google_meet: z
      .boolean()
      .optional()
      .nullable()
      .describe("Whether to create a Google Meet link for this event"),
    createGoogleMeet: z
      .boolean()
      .optional()
      .nullable()
      .describe(
        "Whether to create a Google Meet link for this event (camelCase)"
      ),
    description: z
      .string()
      .optional()
      .nullable()
      .describe("Description or notes for the event"),
    end_time: z
      .string()
      .or(z.date())
      .optional()
      .describe("End time of the event"),
    endTime: z
      .string()
      .or(z.date())
      .optional()
      .describe("End time of the event (camelCase)"),
    etag: z
      .string()
      .optional()
      .nullable()
      .describe("ETag for the event, used for synchronization"),
    google_calendar_id: z
      .string()
      .optional()
      .nullable()
      .describe("ID of the associated Google Calendar"),
    google_event_id: z
      .string()
      .optional()
      .nullable()
      .describe("ID of the event in Google Calendar"),
    googleCalendarId: z
      .string()
      .optional()
      .nullable()
      .describe("ID of the associated Google Calendar (camelCase)"),
    googleEventId: z
      .string()
      .optional()
      .nullable()
      .describe("ID of the event in Google Calendar (camelCase)"),
    guests: z
      .array(z.string().email("Invalid email in guests"))
      .optional()
      .describe("List of guest emails for the event"),
    is_all_day: z
      .boolean()
      .optional()
      .nullable()
      .describe("Whether the event lasts all day"),
    is_from_note: z
      .boolean()
      .optional()
      .nullable()
      .describe("Whether the event was created from a note"),
    is_from_project: z
      .boolean()
      .optional()
      .nullable()
      .describe("Whether the event was created from a project"),
    isAllDay: z
      .boolean()
      .optional()
      .nullable()
      .describe("Whether the event lasts all day (camelCase)"),
    isFromNote: z
      .boolean()
      .optional()
      .nullable()
      .describe("Whether the event was created from a note (camelCase)"),
    isFromProject: z
      .boolean()
      .optional()
      .nullable()
      .describe("Whether the event was created from a project (camelCase)"),
    last_synced_at: z
      .string()
      .or(z.date())
      .optional()
      .nullable()
      .describe("Timestamp of the last synchronization"),
    lastSyncedAt: z
      .string()
      .or(z.date())
      .optional()
      .nullable()
      .describe("Timestamp of the last synchronization (camelCase)"),
    location: z
      .string()
      .optional()
      .nullable()
      .describe("Location of the event"),
    note_id: publicIdOrUuidSchema
      .optional()
      .nullable()
      .describe("ID of the note associated with the event"),
    noteId: publicIdOrUuidSchema
      .optional()
      .nullable()
      .describe("ID of the note associated with the event (camelCase)"),
    organization_id: uuidParamSchema
      .optional()
      .nullable()
      .describe("ID of the organization the event belongs to"),
    organizationId: uuidParamSchema
      .optional()
      .nullable()
      .describe("ID of the organization the event belongs to (camelCase)"),
    outlook_calendar_id: z
      .string()
      .optional()
      .nullable()
      .describe("ID of the associated Outlook Calendar"),
    outlook_event_id: z
      .string()
      .optional()
      .nullable()
      .describe("ID of the event in Outlook Calendar"),
    outlookCalendarId: z
      .string()
      .optional()
      .nullable()
      .describe("ID of the associated Outlook Calendar (camelCase)"),
    outlookEventId: z
      .string()
      .optional()
      .nullable()
      .describe("ID of the event in Outlook Calendar (camelCase)"),
    project_id: publicIdOrUuidSchema
      .optional()
      .nullable()
      .describe("ID of the project associated with the event"),
    projectId: publicIdOrUuidSchema
      .optional()
      .nullable()
      .describe("ID of the project associated with the event (camelCase)"),
    start_time: z
      .string()
      .or(z.date())
      .optional()
      .describe("Start time of the event"),
    startTime: z
      .string()
      .or(z.date())
      .optional()
      .describe("Start time of the event (camelCase)"),
    sync_status: syncStatusEnum
      .optional()
      .nullable()
      .describe("Current synchronization status of the event"),
    sync_with_google: z
      .boolean()
      .optional()
      .nullable()
      .describe(
        "Whether the event should be synchronized with Google Calendar"
      ),
    syncStatus: syncStatusEnum
      .optional()
      .nullable()
      .describe("Current synchronization status of the event (camelCase)"),
    syncWithGoogle: z
      .boolean()
      .optional()
      .nullable()
      .describe(
        "Whether the event should be synchronized with Google Calendar (camelCase)"
      ),
    title: z
      .string()
      .min(1, "title is required")
      .describe("Title of the event"),
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
  attendees: z
    .array(z.string().email("Invalid email in attendees"))
    .optional()
    .describe("List of attendee emails for the event"),
  create_google_meet: z
    .boolean()
    .optional()
    .nullable()
    .describe("Whether to create a Google Meet link for this event"),
  createGoogleMeet: z
    .boolean()
    .optional()
    .nullable()
    .describe(
      "Whether to create a Google Meet link for this event (camelCase)"
    ),
  description: z
    .string()
    .optional()
    .nullable()
    .describe("Description or notes for the event"),
  end_time: z
    .string()
    .or(z.date())
    .optional()
    .describe("End time of the event"),
  endTime: z
    .string()
    .or(z.date())
    .optional()
    .describe("End time of the event (camelCase)"),
  etag: z
    .string()
    .optional()
    .nullable()
    .describe("ETag for the event, used for synchronization"),
  google_calendar_id: z
    .string()
    .optional()
    .nullable()
    .describe("ID of the associated Google Calendar"),
  google_event_id: z
    .string()
    .optional()
    .nullable()
    .describe("ID of the event in Google Calendar"),
  googleCalendarId: z
    .string()
    .optional()
    .nullable()
    .describe("ID of the associated Google Calendar (camelCase)"),
  googleEventId: z
    .string()
    .optional()
    .nullable()
    .describe("ID of the event in Google Calendar (camelCase)"),
  guests: z
    .array(z.string().email("Invalid email in guests"))
    .optional()
    .describe("List of guest emails for the event"),
  is_all_day: z
    .boolean()
    .optional()
    .nullable()
    .describe("Whether the event lasts all day"),
  is_from_note: z
    .boolean()
    .optional()
    .nullable()
    .describe("Whether the event was created from a note"),
  is_from_project: z
    .boolean()
    .optional()
    .nullable()
    .describe("Whether the event was created from a project"),
  isAllDay: z
    .boolean()
    .optional()
    .nullable()
    .describe("Whether the event lasts all day (camelCase)"),
  isFromNote: z
    .boolean()
    .optional()
    .nullable()
    .describe("Whether the event was created from a note (camelCase)"),
  isFromProject: z
    .boolean()
    .optional()
    .nullable()
    .describe("Whether the event was created from a project (camelCase)"),
  last_synced_at: z
    .string()
    .or(z.date())
    .optional()
    .nullable()
    .describe("Timestamp of the last synchronization"),
  lastSyncedAt: z
    .string()
    .or(z.date())
    .optional()
    .nullable()
    .describe("Timestamp of the last synchronization (camelCase)"),
  location: z.string().optional().nullable().describe("Location of the event"),
  note_id: publicIdOrUuidSchema
    .optional()
    .nullable()
    .describe("ID of the note associated with the event"),
  noteId: publicIdOrUuidSchema
    .optional()
    .nullable()
    .describe("ID of the note associated with the event (camelCase)"),
  organization_id: uuidParamSchema
    .optional()
    .nullable()
    .describe("ID of the organization the event belongs to"),
  organizationId: uuidParamSchema
    .optional()
    .nullable()
    .describe("ID of the organization the event belongs to (camelCase)"),
  outlook_calendar_id: z
    .string()
    .optional()
    .nullable()
    .describe("ID of the associated Outlook Calendar"),
  outlook_event_id: z
    .string()
    .optional()
    .nullable()
    .describe("ID of the event in Outlook Calendar"),
  outlookCalendarId: z
    .string()
    .optional()
    .nullable()
    .describe("ID of the associated Outlook Calendar (camelCase)"),
  outlookEventId: z
    .string()
    .optional()
    .nullable()
    .describe("ID of the event in Outlook Calendar (camelCase)"),
  project_id: publicIdOrUuidSchema
    .optional()
    .nullable()
    .describe("ID of the project associated with the event"),
  projectId: publicIdOrUuidSchema
    .optional()
    .nullable()
    .describe("ID of the project associated with the event (camelCase)"),
  start_time: z
    .string()
    .or(z.date())
    .optional()
    .describe("Start time of the event"),
  startTime: z
    .string()
    .or(z.date())
    .optional()
    .describe("Start time of the event (camelCase)"),
  sync_status: syncStatusEnum
    .optional()
    .nullable()
    .describe("Current synchronization status of the event"),
  sync_with_google: z
    .boolean()
    .optional()
    .nullable()
    .describe("Whether the event should be synchronized with Google Calendar"),
  syncStatus: syncStatusEnum
    .optional()
    .nullable()
    .describe("Current synchronization status of the event (camelCase)"),
  syncWithGoogle: z
    .boolean()
    .optional()
    .nullable()
    .describe(
      "Whether the event should be synchronized with Google Calendar (camelCase)"
    ),
  title: z
    .string()
    .min(1, "title cannot be empty")
    .optional()
    .describe("Title of the event"),
});

// Invites
const createInviteSchema = z.object({
  email: z
    .string()
    .email("Email is required and must be a valid email")
    .describe("Email address of the invitee"),
  externalGuestId: uuidParamSchema
    .optional()
    .nullable()
    .describe("ID of an external guest, if applicable"),
  role: z.string().optional().describe("Role of the invited user"),
  status: z.string().optional().describe("Status of the invitation"),
  userId: uuidParamSchema
    .optional()
    .nullable()
    .describe("ID of the user, if registered in the system"),
});

const updateInviteSchema = z.object({
  role: z.string().optional().describe("Role of the invited user"),
  status: z.string().optional().describe("Status of the invitation"),
});

// FreeBusy
const checkFreeBusySchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().describe("ID of the calendar or user to check"),
      })
    )
    .optional()
    .describe("List of calendars or users to check for free/busy time"),
  timeMax: z
    .string()
    .min(1, "timeMax is required")
    .describe("End time for the free/busy check window"),
  timeMin: z
    .string()
    .min(1, "timeMin is required")
    .describe("Start time for the free/busy check window"),
});

module.exports = {
  checkFreeBusySchema,
  createEventSchema,
  createInviteSchema,
  eventIdParamSchema,
  inviteIdParamSchema,
  listEventsQuerySchema,
  updateEventSchema,
  updateInviteSchema,
};
