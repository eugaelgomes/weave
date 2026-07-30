const { z } = require("zod");
const calendarEventsService = require("../services/calendar-events.service");
const {
  createEventSchema,
  updateEventSchema,
  listEventsQuerySchema,
  eventIdParamSchema,
  checkFreeBusySchema,
} = require("../schemas/calendar-events.schema");

const manageCalendarEventsSchema = z.discriminatedUnion("action", [
  z
    .object({ action: z.literal("create") })
    .extend(createEventSchema.shape)
    .describe(
      "Create a new event in Weave. Business Rule: Set sync_with_google=true to automatically push to connected Google Calendar. Use create_google_meet=true to attach a Meet link. You can link events to notes (note_id) or projects (project_id)."
    ),
  z
    .object({ action: z.literal("get") })
    .extend(eventIdParamSchema.shape)
    .describe("Retrieve details of a specific event by its event_id."),
  z
    .object({ action: z.literal("update") })
    .extend(eventIdParamSchema.shape)
    .extend(updateEventSchema.shape)
    .describe(
      "Update an existing event. Only provide the fields you want to change. If sync_with_google is true, updates are pushed to Google."
    ),
  z
    .object({ action: z.literal("delete") })
    .extend(eventIdParamSchema.shape)
    .describe(
      "Delete an event. This is a soft-delete in Weave. If it was synced, it may not automatically delete from Google Calendar unless handled by webhooks."
    ),
  z
    .object({ action: z.literal("list") })
    .extend(listEventsQuerySchema.shape)
    .describe(
      "List events. By default, retrieves BOTH internal Weave events and connected Google Calendar events. Checks the 'origin' ('weave' or 'google') for each."
    ),
  z
    .object({ action: z.literal("list_google_calendars") })
    .describe(
      "Fetch all Google Calendars connected to the user's account. Use this to find a specific google_calendar_id to use when creating an event."
    ),
  z
    .object({ action: z.literal("get_google_settings") })
    .describe(
      "Retrieve user's Google Calendar settings (e.g. default timezone)."
    ),
  z
    .object({ action: z.literal("check_free_busy") })
    .extend(checkFreeBusySchema.shape)
    .describe(
      "Check availability (free/busy time slots) for specific Google Calendars before scheduling an event to avoid conflicts."
    ),
]);

const createCalendarEventsTools = (user) => ({
  manage_calendar_events: {
    description: `Manage Weave Calendar events and Google Calendar synchronization.

FUNCTIONALITIES (Actions):
1. 'create': Creates a new event.
   - How to use: Provide 'title', 'start_time', and 'end_time' (ISO 8601). You can also provide 'description', 'location', 'is_all_day', and an array of 'attendees' emails. Optionally link to a 'note_id' or 'project_id'.
   - What it does: Saves the event to Weave. If 'sync_with_google=true', it automatically pushes the event to Google Calendar, invites users in the 'attendees' array, and generates a Meet video conference link if 'create_google_meet=true'.
2. 'update': Updates an existing event.
   - How to use: Provide the 'event_id' and only the fields you wish to change (e.g. 'title', 'start_time', 'end_time', 'description', 'location', 'attendees', 'is_all_day').
   - What it does: Modifies the event in Weave and syncs changes to Google if applicable.
3. 'get' & 'delete': Retrieves or removes an event.
   - How to use: Provide the 'event_id'.
   - What it does: Fetches details or soft-deletes the event in the Weave database.
4. 'list': Retrieves all events.
   - How to use: Optionally provide 'from', 'to' (ISO 8601), or 'organization_id' filters.
   - What it does: Returns a unified list of events. Merges internal Weave events and the user's connected Google Calendar events. Look at the 'origin' field ('weave' or 'google') on each event.
5. 'list_google_calendars': Finds connected calendars.
   - How to use: Call with no extra arguments.
   - What it does: Returns the list of Google Calendars (and their IDs) available to the user.
6. 'check_free_busy': Avoids scheduling conflicts.
   - How to use: Provide 'time_min', 'time_max', and 'items' (calendar IDs).
   - What it does: Checks Google Calendar availability for the specified time ranges and returns busy slots.
7. 'get_google_settings': Gets Google configuration.
   - How to use: Call with no extra arguments.
   - What it does: Returns the user's Google Calendar settings (e.g. timezone).`,
    handler: async (args) => {
      try {
        const { action, event_id, from, to, items, time_max, time_min } = args;
        const userId = user?.userId || user?.id;

        if (action === "create") {
          const event = await calendarEventsService.createEvent(args, userId);
          return {
            content: [{ text: JSON.stringify(event, null, 2), type: "text" }],
          };
        }

        if (action === "get") {
          if (!event_id)
            throw new Error("event_id is required for get action.");
          const event = await calendarEventsService.getEventById(
            event_id,
            userId
          );
          return {
            content: [{ text: JSON.stringify(event, null, 2), type: "text" }],
          };
        }

        if (action === "update") {
          if (!event_id)
            throw new Error("event_id is required for update action.");
          const event = await calendarEventsService.updateEvent(
            event_id,
            args,
            userId
          );
          return {
            content: [{ text: JSON.stringify(event, null, 2), type: "text" }],
          };
        }

        if (action === "delete") {
          if (!event_id)
            throw new Error("event_id is required for delete action.");
          await calendarEventsService.deleteEvent(event_id, userId);
          return {
            content: [
              {
                text: JSON.stringify({ event_id, success: true }, null, 2),
                type: "text",
              },
            ],
          };
        }

        if (action === "list") {
          const events = await calendarEventsService.listEvents({
            creatorId: userId,
            from,
            includeDeleted: args.include_deleted,
            includeGoogleEvents: true,
            organizationId: args.organization_id,
            to,
          });
          return {
            content: [{ text: JSON.stringify(events, null, 2), type: "text" }],
          };
        }

        if (action === "list_google_calendars") {
          const calendars =
            await calendarEventsService.listGoogleCalendars(userId);
          return {
            content: [
              { text: JSON.stringify(calendars, null, 2), type: "text" },
            ],
          };
        }

        if (action === "get_google_settings") {
          const settings =
            await calendarEventsService.getGoogleCalendarSettings(userId);
          return {
            content: [
              { text: JSON.stringify(settings, null, 2), type: "text" },
            ],
          };
        }

        if (action === "check_free_busy") {
          const freebusy = await calendarEventsService.checkFreeBusy(userId, {
            items,
            timeMax: time_max,
            timeMin: time_min,
          });
          return {
            content: [
              { text: JSON.stringify(freebusy, null, 2), type: "text" },
            ],
          };
        }

        throw new Error(`Invalid action: ${action}`);
      } catch (error) {
        return {
          content: [
            {
              text: `Error managing calendar events: ${error.message}`,
              type: "text",
            },
          ],
          isError: true,
        };
      }
    },
    name: "manage_calendar_events",
    schema: manageCalendarEventsSchema,
  },
});

module.exports = {
  createCalendarEventsTools,
};
