const { z } = require("zod");
const CalendarEventsRepository = require("../repositories/calendar-events.repository");

const manageCalendarEventsSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create"),
    description: z.string().optional().describe("Description of the event"),
    endTime: z.string().optional().describe("End time in ISO format"),
    isAllDay: z.boolean().optional().describe("Whether the event is all day"),
    location: z.string().optional().describe("Location of the event"),
    startTime: z.string().optional().describe("Start time in ISO format"),
    timezone: z.string().optional().describe("Timezone of the event"),
    title: z.string().optional().describe("Title of the event"),
  }),
  z.object({
    action: z.literal("get"),
    eventId: z.string().uuid().describe("ID of the event"),
  }),
  z.object({
    action: z.literal("update"),
    description: z.string().optional().describe("Description of the event"),
    endTime: z.string().optional().describe("End time in ISO format"),
    eventId: z.string().uuid().describe("ID of the event"),
    isAllDay: z.boolean().optional().describe("Whether the event is all day"),
    location: z.string().optional().describe("Location of the event"),
    startTime: z.string().optional().describe("Start time in ISO format"),
    timezone: z.string().optional().describe("Timezone of the event"),
    title: z.string().optional().describe("Title of the event"),
  }),
  z.object({
    action: z.literal("delete"),
    eventId: z.string().uuid().describe("ID of the event"),
  }),
  z.object({
    action: z.literal("list"),
    endDate: z.string().optional().describe("End date for list filter"),
    startDate: z.string().optional().describe("Start date for list filter"),
  }),
]);

const createCalendarEventsTools = (user) => ({
  manage_calendar_events: {
    description: "Manage calendar events (create, get, update, delete, list).",
    handler: async (args) => {
      try {
        const {
          action,
          eventId,
          title,
          description,
          startTime,
          endTime,
          startDate,
          endDate,
          timezone,
          isAllDay,
          location,
        } = args;

        if (action === "create") {
          const payload = {
            creatorId: user.id,
            description,
            endTime,
            isAllDay,
            location,
            startTime,
            timezone,
            title,
          };
          const event = await CalendarEventsRepository.createEvent(payload);
          return {
            content: [{ text: JSON.stringify(event, null, 2), type: "text" }],
          };
        }

        if (action === "get") {
          if (!eventId) throw new Error("eventId is required for get action.");
          const event = await CalendarEventsRepository.getEventById({
            creatorId: user.id,
            eventId,
          });
          if (!event) throw new Error("Event not found");
          return {
            content: [{ text: JSON.stringify(event, null, 2), type: "text" }],
          };
        }

        if (action === "update") {
          if (!eventId)
            throw new Error("eventId is required for update action.");
          const fields = {
            description,
            endTime,
            isAllDay,
            location,
            startTime,
            timezone,
            title,
          };
          // Remove undefined fields
          Object.keys(fields).forEach(
            (key) => fields[key] === undefined && delete fields[key]
          );
          const event = await CalendarEventsRepository.updateEvent({
            creatorId: user.id,
            eventId,
            fields,
          });
          if (!event) throw new Error("Event not found or not updated");
          return {
            content: [{ text: JSON.stringify(event, null, 2), type: "text" }],
          };
        }

        if (action === "delete") {
          if (!eventId)
            throw new Error("eventId is required for delete action.");
          const result = await CalendarEventsRepository.softDeleteEvent({
            creatorId: user.id,
            eventId,
          });
          if (!result) throw new Error("Event not found or already deleted");
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
          const events = await CalendarEventsRepository.listEvents({
            creatorId: user.id,
            endDate,
            startDate,
          });
          return {
            content: [{ text: JSON.stringify(events, null, 2), type: "text" }],
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
