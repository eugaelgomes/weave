const { z } = require("zod");
const { uuidSchema } = require("@/utils/mcp-schemas.util");

// Reusable schemas
const publicIdOrUuidSchema = z.string().refine(
  (val) => {
    const isUUID =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val);
    const isPublicId = val.trim().length === 12 && !val.trim().includes("-");
    return isUUID || isPublicId;
  },
  { message: "Invalid ID format (must be UUID or 12-character public ID)" }
);

const syncStatusEnum = z.enum(["SYNCED", "PENDING", "FAILED", "OUT_OF_SYNC"]);

// Event param schemas
const eventIdParamSchema = z.object({
  event_id: uuidSchema,
});

const inviteIdParamSchema = z.object({
  event_id: uuidSchema,
  invite_id: uuidSchema,
});

// Full Entity Schema (matching repository output)
const calendarEventSchema = z.object({
  created_at: z.date().optional().describe("Timestamp of when the event was created"),
  creator_id: uuidSchema.optional().describe("ID of the user who created the event"),
  deleted: z.boolean().optional().describe("Whether the event has been soft-deleted"),
  deleted_at: z
    .date()
    .nullable()
    .optional()
    .describe("Timestamp of when the event was deleted, if applicable"),
  description: z.string().nullable().optional().describe("Description or notes for the event"),
  end_time: z.string().optional().describe("End time of the event"),
  etag: z.string().nullable().optional().describe("ETag for the event, used for synchronization"),
  google_calendar_id: z
    .string()
    .nullable()
    .optional()
    .describe("ID of the associated Google Calendar"),
  google_event_id: z.string().nullable().optional().describe("ID of the event in Google Calendar"),
  id: uuidSchema.optional().describe("Unique identifier of the calendar event"),
  is_all_day: z.boolean().nullable().optional().describe("Whether the event lasts all day"),
  is_from_note: z
    .boolean()
    .nullable()
    .optional()
    .describe("Whether the event was created from a note"),
  is_from_project: z
    .boolean()
    .nullable()
    .optional()
    .describe("Whether the event was created from a project"),
  last_synced_at: z
    .date()
    .nullable()
    .optional()
    .describe("Timestamp of the last synchronization with external calendars"),
  location: z.string().nullable().optional().describe("Location of the event"),
  note_id: publicIdOrUuidSchema
    .nullable()
    .optional()
    .describe("ID of the note associated with the event"),
  organization_id: uuidSchema
    .nullable()
    .optional()
    .describe("ID of the organization the event belongs to"),
  outlook_calendar_id: z
    .string()
    .nullable()
    .optional()
    .describe("ID of the associated Outlook Calendar"),
  outlook_event_id: z
    .string()
    .nullable()
    .optional()
    .describe("ID of the event in Outlook Calendar"),
  project_id: publicIdOrUuidSchema
    .nullable()
    .optional()
    .describe("ID of the project associated with the event"),
  start_time: z.string().optional().describe("Start time of the event"),
  sync_status: syncStatusEnum
    .nullable()
    .optional()
    .describe("Current synchronization status of the event"),
  title: z.string().optional().describe("Title of the event"),
  updated_at: z.date().optional().describe("Timestamp of when the event was last updated"),
});

// Query schemas
const listEventsQuerySchema = z.object({
  from: z
    .string()
    .datetime({ offset: true })
    .or(z.string())
    .optional()
    .describe("Start date/time to filter events from (ISO 8601)"),
  include_deleted: z
    .boolean()
    .optional()
    .describe("Whether to include soft-deleted events in the list"),
  organization_id: uuidSchema.optional().describe("Organization ID to filter events by"),
  to: z
    .string()
    .datetime({ offset: true })
    .or(z.string())
    .optional()
    .describe("End date/time to filter events to (ISO 8601)"),
});

// Body schemas
const createEventSchema = z
  .object({
    attendees: z
      .array(z.string().email("Invalid email in attendees"))
      .optional()
      .describe(
        "List of attendee/guest emails. All entries are deduplicated and invited via Google Calendar if sync is enabled."
      ),
    create_google_meet: z
      .boolean()
      .optional()
      .nullable()
      .describe(
        "Set to true to automatically generate a Google Meet conference link for this event. Requires Google Calendar to be connected."
      ),
    description: z.string().optional().nullable().describe("Description or notes for the event"),
    end_time: z
      .string()
      .optional()
      .describe("End time of the event (ISO 8601, e.g. '2025-08-01T18:00:00Z')"),
    google_calendar_id: z
      .string()
      .optional()
      .nullable()
      .describe(
        "ID of the Google Calendar to sync this event to. Defaults to 'primary' when sync_with_google is true."
      ),
    is_all_day: z.boolean().optional().nullable().describe("Whether the event lasts all day"),
    location: z.string().optional().nullable().describe("Location of the event"),
    note_id: publicIdOrUuidSchema
      .optional()
      .nullable()
      .describe("ID of the note associated with the event"),
    organization_id: uuidSchema
      .optional()
      .nullable()
      .describe("ID of the organization the event belongs to"),
    project_id: publicIdOrUuidSchema
      .optional()
      .nullable()
      .describe("ID of the project associated with the event"),
    start_time: z
      .string()
      .optional()
      .describe("Start time of the event (ISO 8601, e.g. '2025-08-01T16:00:00Z')"),
    sync_with_google: z
      .boolean()
      .optional()
      .nullable()
      .describe(
        "Set to true to push this event to the user's Google Calendar. Requires Google Calendar to be connected."
      ),
    title: z.string().min(1, "title is required").describe("Title of the event"),
  })
  .refine((data) => data.start_time, {
    message: "start_time is required",
    path: ["start_time"],
  })
  .refine((data) => data.end_time, {
    message: "end_time is required",
    path: ["end_time"],
  });

const updateEventSchema = z.object({
  attendees: z
    .array(z.string().email("Invalid email in attendees"))
    .optional()
    .describe("Updated list of attendee/guest emails"),
  create_google_meet: z
    .boolean()
    .optional()
    .nullable()
    .describe("Set to true to add a Google Meet link to this event"),
  description: z
    .string()
    .optional()
    .nullable()
    .describe("Updated description or notes for the event"),
  end_time: z.string().optional().describe("Updated end time (ISO 8601)"),
  is_all_day: z.boolean().optional().nullable().describe("Whether the event lasts all day"),
  location: z.string().optional().nullable().describe("Updated location"),
  note_id: publicIdOrUuidSchema.optional().nullable().describe("Updated note association ID"),
  organization_id: uuidSchema.optional().nullable().describe("Updated organization ID"),
  project_id: publicIdOrUuidSchema.optional().nullable().describe("Updated project association ID"),
  start_time: z.string().optional().describe("Updated start time (ISO 8601)"),
  sync_with_google: z
    .boolean()
    .optional()
    .nullable()
    .describe("Set to true to push updated event to Google Calendar"),
  title: z
    .string()
    .min(1, "title cannot be empty")
    .optional()
    .describe("Updated title of the event"),
});

// Invites
const createInviteSchema = z.object({
  email: z
    .string()
    .email("Email is required and must be a valid email")
    .describe("Email address of the invitee"),
  external_guest_id: uuidSchema
    .optional()
    .nullable()
    .describe("ID of an external guest, if applicable"),
  role: z.string().optional().describe("Role of the invited user"),
  status: z.string().optional().describe("Status of the invitation"),
  user_id: uuidSchema.optional().nullable().describe("ID of the user, if registered in the system"),
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
  time_max: z
    .string()
    .min(1, "time_max is required")
    .describe("End time for the free/busy check window (ISO 8601)"),
  time_min: z
    .string()
    .min(1, "time_min is required")
    .describe("Start time for the free/busy check window (ISO 8601)"),
});

// Full Entity Schema for Invites (matching repository output)
const calendarEventInviteSchema = z.object({
  created_at: z.date().optional().describe("Timestamp of when the invite was created"),
  deleted: z.boolean().optional().describe("Whether the invite has been soft-deleted"),
  deleted_at: z
    .date()
    .nullable()
    .optional()
    .describe("Timestamp of when the invite was deleted, if applicable"),
  email: z.string().email().optional().describe("Email address of the invitee"),
  event_id: uuidSchema.optional().describe("ID of the calendar event this invite belongs to"),
  external_guest_id: z
    .string()
    .nullable()
    .optional()
    .describe("ID of an external guest, if applicable"),
  id: uuidSchema.optional().describe("Unique identifier of the event invite"),
  role: z.string().optional().describe("Role of the invited user (e.g., REQUIRED, OPTIONAL)"),
  status: z
    .string()
    .optional()
    .describe("Status of the invitation (e.g., PENDING, ACCEPTED, DECLINED)"),
  updated_at: z.date().optional().describe("Timestamp of when the invite was last updated"),
  user_id: uuidSchema.nullable().optional().describe("ID of the user, if registered in the system"),
});

module.exports = {
  calendarEventInviteSchema,
  calendarEventSchema,
  checkFreeBusySchema,
  createEventSchema,
  createInviteSchema,
  eventIdParamSchema,
  inviteIdParamSchema,
  listEventsQuerySchema,
  updateEventSchema,
  updateInviteSchema,
};
