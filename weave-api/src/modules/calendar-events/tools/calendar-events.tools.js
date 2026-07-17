const CalendarEventsRepository = require("../repositories/calendar-events.repository");
const {
  listEventsQuerySchema,
  createEventSchema,
  updateEventSchema,
  eventIdParamSchema,
} = require("../schemas/calendar-events.schema");

/**
 * Creates the CalendarEvents tools registry bound to a specific user context.
 *
 * @param {Object} user - The authenticated user object.
 * @returns {Record<string, Object>} The calendar-events tools definition map.
 */
const createCalendarEventsTools = (user) => ({
  create_calendar_event: {
    description: "Create a new calendar event",
    handler: async (args) => {
      try {
        const payload = {
          ...args,
          creatorId: user.id,
        };
        const event = await CalendarEventsRepository.createEvent(payload);
        return {
          content: [{ text: JSON.stringify(event, null, 2), type: "text" }],
        };
      } catch (error) {
        return {
          content: [{ text: `Error: ${error.message}`, type: "text" }],
          isError: true,
        };
      }
    },
    schema: createEventSchema,
  },
  delete_calendar_event: {
    description: "Delete a calendar event",
    handler: async (args) => {
      try {
        const result = await CalendarEventsRepository.softDeleteEvent({
          creatorId: user.id,
          eventId: args.eventId,
        });
        if (!result) {
          return {
            content: [
              { text: "Event not found or already deleted", type: "text" },
            ],
            isError: true,
          };
        }
        return {
          content: [
            {
              text: JSON.stringify(
                { eventId: args.eventId, success: true },
                null,
                2
              ),
              type: "text",
            },
          ],
        };
      } catch (error) {
        return {
          content: [{ text: `Error: ${error.message}`, type: "text" }],
          isError: true,
        };
      }
    },
    schema: eventIdParamSchema,
  },
  get_calendar_event: {
    description: "Get a specific calendar event by ID",
    handler: async (args) => {
      try {
        const event = await CalendarEventsRepository.getEventById({
          creatorId: user.id,
          eventId: args.eventId,
        });
        if (!event) {
          return {
            content: [{ text: "Event not found", type: "text" }],
            isError: true,
          };
        }
        return {
          content: [{ text: JSON.stringify(event, null, 2), type: "text" }],
        };
      } catch (error) {
        return {
          content: [{ text: `Error: ${error.message}`, type: "text" }],
          isError: true,
        };
      }
    },
    schema: eventIdParamSchema,
  },
  list_calendar_events: {
    description: "List calendar events for the user",
    handler: async (args) => {
      try {
        const events = await CalendarEventsRepository.listEvents({
          creatorId: user.id,
          ...args,
        });
        return {
          content: [{ text: JSON.stringify(events, null, 2), type: "text" }],
        };
      } catch (error) {
        return {
          content: [{ text: `Error: ${error.message}`, type: "text" }],
          isError: true,
        };
      }
    },
    schema: listEventsQuerySchema,
  },
  update_calendar_event: {
    description: "Update an existing calendar event",
    handler: async (args) => {
      try {
        const { eventId, ...fields } = args;
        const event = await CalendarEventsRepository.updateEvent({
          creatorId: user.id,
          eventId,
          fields,
        });
        if (!event) {
          return {
            content: [{ text: "Event not found or not updated", type: "text" }],
            isError: true,
          };
        }
        return {
          content: [{ text: JSON.stringify(event, null, 2), type: "text" }],
        };
      } catch (error) {
        return {
          content: [{ text: `Error: ${error.message}`, type: "text" }],
          isError: true,
        };
      }
    },
    schema: eventIdParamSchema.merge(updateEventSchema),
  },
});

module.exports = {
  createCalendarEventsTools,
};
