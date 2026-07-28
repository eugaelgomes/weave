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
  z.object({ action: z.literal("create") }).extend(createEventSchema.shape),
  z.object({ action: z.literal("get") }).extend(eventIdParamSchema.shape),
  z
    .object({ action: z.literal("update") })
    .extend(eventIdParamSchema.shape)
    .extend(updateEventSchema.shape),
  z.object({ action: z.literal("delete") }).extend(eventIdParamSchema.shape),
  z.object({ action: z.literal("list") }).extend(listEventsQuerySchema.shape),
  z.object({ action: z.literal("list_google_calendars") }),
  z.object({ action: z.literal("get_google_settings") }),
  z
    .object({ action: z.literal("check_free_busy") })
    .extend(checkFreeBusySchema.shape),
]);

const createCalendarEventsTools = (user) => ({
  manage_calendar_events: {
    description: "Manage calendar events (create, get, update, delete, list).",
    handler: async (args) => {
      try {
        const { action, eventId, from, to, items, timeMax, timeMin } = args;
        const userId = user?.userId || user?.id;

        if (action === "create") {
          const event = await calendarEventsService.createEvent(args, userId);
          return {
            content: [{ text: JSON.stringify(event, null, 2), type: "text" }],
          };
        }

        if (action === "get") {
          if (!eventId) throw new Error("eventId is required for get action.");
          const event = await calendarEventsService.getEventById(
            eventId,
            userId
          );
          return {
            content: [{ text: JSON.stringify(event, null, 2), type: "text" }],
          };
        }

        if (action === "update") {
          if (!eventId)
            throw new Error("eventId is required for update action.");
          const event = await calendarEventsService.updateEvent(
            eventId,
            args,
            userId
          );
          return {
            content: [{ text: JSON.stringify(event, null, 2), type: "text" }],
          };
        }

        if (action === "delete") {
          if (!eventId)
            throw new Error("eventId is required for delete action.");
          await calendarEventsService.deleteEvent(eventId, userId);
          return {
            content: [
              {
                text: JSON.stringify({ eventId, success: true }, null, 2),
                type: "text",
              },
            ],
          };
        }

        if (action === "list") {
          const events = await calendarEventsService.listEvents({
            creatorId: userId,
            from,
            includeDeleted: args.includeDeleted || args.include_deleted,
            organizationId: args.organizationId || args.organization_id,
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
            timeMax,
            timeMin,
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
