import { z } from "zod";

export const listEventsSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.number().optional(),
  limit: z.number().optional(),
});

export const getEventSchema = z.object({
  eventId: z.string().uuid(),
});

export const createEventSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  startAt: z.string(),
  endAt: z.string(),
  allDay: z.boolean().optional(),
  location: z.string().optional(),
});

export const updateEventSchema = z.object({
  eventId: z.string().uuid(),
  title: z.string().optional(),
  description: z.string().optional(),
  startAt: z.string().optional(),
  endAt: z.string().optional(),
});

export const deleteEventSchema = z.object({
  eventId: z.string().uuid(),
});

export const listEventInvitesSchema = z.object({
  eventId: z.string().uuid(),
});

export const createEventInviteSchema = z.object({
  eventId: z.string().uuid(),
  userId: z.string().uuid(),
});

export const deleteEventInviteSchema = z.object({
  eventId: z.string().uuid(),
  inviteId: z.string().uuid(),
});

export const checkFreeBusySchema = z.object({
  timeMin: z.string(),
  timeMax: z.string(),
  userIds: z.array(z.string().uuid()).optional(),
});
