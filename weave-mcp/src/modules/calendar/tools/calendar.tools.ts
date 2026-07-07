import { McpToolDefinition } from "../../../types/mcp";
import { AxiosInstance } from "axios";
import {
  listEventsSchema,
  getEventSchema,
  createEventSchema,
  updateEventSchema,
  deleteEventSchema,
  listEventInvitesSchema,
  createEventInviteSchema,
  deleteEventInviteSchema,
  checkFreeBusySchema,
} from "../schemas/calendar.schema";
import { z } from "zod";

export const createCalendarTools = (apiClient: AxiosInstance): Record<string, McpToolDefinition<any>> => ({
  list_calendar_events: {
    name: "list_calendar_events",
    description: "List calendar events",
    schema: listEventsSchema,
    handler: async (args: z.infer<typeof listEventsSchema>) => {
      try {
        const response = await apiClient.get("/calendar-events", { params: args });
        return { content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }] };
      } catch (error: any) {
        return { isError: true, content: [{ type: "text", text: `Error: ${error.message}` }] };
      }
    },
  },
  get_calendar_event: {
    name: "get_calendar_event",
    description: "Get details for a specific calendar event",
    schema: getEventSchema,
    handler: async (args: z.infer<typeof getEventSchema>) => {
      try {
        const response = await apiClient.get(`/calendar-events/${args.eventId}`);
        return { content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }] };
      } catch (error: any) {
        return { isError: true, content: [{ type: "text", text: `Error: ${error.message}` }] };
      }
    },
  },
  create_calendar_event: {
    name: "create_calendar_event",
    description: "Create a new calendar event",
    schema: createEventSchema,
    handler: async (args: z.infer<typeof createEventSchema>) => {
      try {
        const response = await apiClient.post("/calendar-events", args);
        return { content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }] };
      } catch (error: any) {
        return { isError: true, content: [{ type: "text", text: `Error: ${error.message}` }] };
      }
    },
  },
  update_calendar_event: {
    name: "update_calendar_event",
    description: "Update an existing calendar event",
    schema: updateEventSchema,
    handler: async (args: z.infer<typeof updateEventSchema>) => {
      try {
        const { eventId, ...payload } = args;
        const response = await apiClient.patch(`/calendar-events/${eventId}`, payload);
        return { content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }] };
      } catch (error: any) {
        return { isError: true, content: [{ type: "text", text: `Error: ${error.message}` }] };
      }
    },
  },
  delete_calendar_event: {
    name: "delete_calendar_event",
    description: "Delete a calendar event",
    schema: deleteEventSchema,
    handler: async (args: z.infer<typeof deleteEventSchema>) => {
      try {
        const response = await apiClient.delete(`/calendar-events/${args.eventId}`);
        return { content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }] };
      } catch (error: any) {
        return { isError: true, content: [{ type: "text", text: `Error: ${error.message}` }] };
      }
    },
  },
  list_event_invites: {
    name: "list_event_invites",
    description: "List invites for an event",
    schema: listEventInvitesSchema,
    handler: async (args: z.infer<typeof listEventInvitesSchema>) => {
      try {
        const response = await apiClient.get(`/calendar-events/${args.eventId}/invites`);
        return { content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }] };
      } catch (error: any) {
        return { isError: true, content: [{ type: "text", text: `Error: ${error.message}` }] };
      }
    },
  },
  create_event_invite: {
    name: "create_event_invite",
    description: "Invite a user to an event",
    schema: createEventInviteSchema,
    handler: async (args: z.infer<typeof createEventInviteSchema>) => {
      try {
        const { eventId, ...payload } = args;
        const response = await apiClient.post(`/calendar-events/${eventId}/invites`, payload);
        return { content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }] };
      } catch (error: any) {
        return { isError: true, content: [{ type: "text", text: `Error: ${error.message}` }] };
      }
    },
  },
  delete_event_invite: {
    name: "delete_event_invite",
    description: "Remove an invite from an event",
    schema: deleteEventInviteSchema,
    handler: async (args: z.infer<typeof deleteEventInviteSchema>) => {
      try {
        const response = await apiClient.delete(`/calendar-events/${args.eventId}/invites/${args.inviteId}`);
        return { content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }] };
      } catch (error: any) {
        return { isError: true, content: [{ type: "text", text: `Error: ${error.message}` }] };
      }
    },
  },
  check_free_busy: {
    name: "check_free_busy",
    description: "Check free/busy status using Google Calendar integration",
    schema: checkFreeBusySchema,
    handler: async (args: z.infer<typeof checkFreeBusySchema>) => {
      try {
        const response = await apiClient.post("/calendar-events/google/freebusy", args);
        return { content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }] };
      } catch (error: any) {
        return { isError: true, content: [{ type: "text", text: `Error: ${error.message}` }] };
      }
    },
  },
});
