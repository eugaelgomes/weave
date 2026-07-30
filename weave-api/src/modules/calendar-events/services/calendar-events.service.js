const calendarEventsRepository = require("../repositories/calendar-events.repository");
const GoogleOauthTokensRepository = require("../../webhooks/repositories/google-oauth-tokens.repository");
const googleService = require("../utils/google-calendar.util");
const {
  resolveNoteIdToUuid,
} = require("../../notes/utils/note-id-lookup.util");
const {
  resolveProjectIdToUuid,
} = require("../../projects/utils/project-id-lookup.util");
const {
  normalizeCreatePayload,
  buildGoogleEventBody,
  normalizeUpdateFields,
} = require("../normalizer");
const usersService = require("../../users/services/users.service");
const {
  calendar_invite_receipt,
} = require("../../../services/email/templates/calendar-invite");

class CalendarEventsService {
  async _syncEventToGoogle(payload, creatorId) {
    const tokens = await GoogleOauthTokensRepository.getGoogleTokens(creatorId);
    if (!tokens) {
      throw new Error("Google Calendar is not connected");
    }

    const calendarId = payload.googleCalendarId || "primary";
    const { calendar, auth } = googleService.getCalendarClientWithAuth({
      access_token: tokens.access_token,
      expiry_date: tokens.expires_at
        ? new Date(tokens.expires_at).getTime()
        : null,
      refresh_token: tokens.refresh_token,
    });

    const requestBody = buildGoogleEventBody(payload);
    const { data } = await calendar.events.insert({
      calendarId,
      conferenceDataVersion: payload.createGoogleMeet ? 1 : 0,
      requestBody,
      sendUpdates: payload.attendees.length ? "all" : "none",
    });

    const refreshed = auth.credentials;
    if (
      refreshed.access_token &&
      refreshed.access_token !== tokens.access_token
    ) {
      const newExpiry = refreshed.expiry_date
        ? new Date(refreshed.expiry_date)
        : null;
      await GoogleOauthTokensRepository.updateGoogleAccessToken(
        creatorId,
        refreshed.access_token,
        newExpiry
      );
    }

    return {
      etag: data.etag || null,
      googleCalendarId: calendarId,
      googleEventId: data.id || null,
      lastSyncedAt: new Date(),
      syncStatus: "SYNCED",
    };
  }

  async _fetchGoogleEvents(creatorId, from, to) {
    try {
      const tokens =
        await GoogleOauthTokensRepository.getGoogleTokens(creatorId);
      if (!tokens) return [];

      const { calendar } = googleService.getCalendarClientWithAuth({
        access_token: tokens.access_token,
        expiry_date: tokens.expires_at
          ? new Date(tokens.expires_at).getTime()
          : null,
        refresh_token: tokens.refresh_token,
      });

      // Se from/to não forem passados, define default (1 semana atrás até 6 meses frente)
      const timeMin =
        from || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const timeMax =
        to || new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString();

      const { data } = await calendar.events.list({
        calendarId: "primary",
        orderBy: "startTime",
        singleEvents: true,
        timeMax,
        timeMin,
      });

      return (data.items || []).map((item) => ({
        attendees: (item.attendees || []).map((a) => a.email),
        description: item.description || "",
        end_time: item.end?.dateTime || item.end?.date,
        google_event_id: item.id,
        html_link: item.htmlLink,
        id: item.id,
        is_all_day: !item.start?.dateTime && !!item.start?.date,
        location: item.location || "",
        origin: "google",
        start_time: item.start?.dateTime || item.start?.date,
        title: item.summary || "No Title",
      }));
    } catch (error) {
      console.warn("Failed to fetch Google events:", error.message);
      return [];
    }
  }

  async createEvent(body, creatorId) {
    const payload = normalizeCreatePayload(body, creatorId);

    if (payload.noteId) {
      const resolvedNoteId = await resolveNoteIdToUuid(payload.noteId);
      if (!resolvedNoteId) {
        const error = new Error("Note not found");
        error.status = 404;
        throw error;
      }
      payload.noteId = resolvedNoteId;
    }

    if (payload.projectId) {
      const resolvedProjectId = await resolveProjectIdToUuid(payload.projectId);
      if (!resolvedProjectId) {
        const error = new Error("Project not found");
        error.status = 404;
        throw error;
      }
      payload.projectId = resolvedProjectId;
    }

    if (payload.syncWithGoogle) {
      try {
        const syncData = await this._syncEventToGoogle(payload, creatorId);
        payload.googleEventId = syncData.googleEventId;
        payload.googleCalendarId = syncData.googleCalendarId;
        payload.lastSyncedAt = syncData.lastSyncedAt;
        payload.syncStatus = syncData.syncStatus;
        payload.etag = syncData.etag;
      } catch (syncError) {
        const error = new Error(
          syncError.message || "Failed to synchronize with Google Calendar"
        );
        error.status = 400;
        throw error;
      }
    }

    const createdEvent = await calendarEventsRepository.createEvent(payload);

    // Envio de email de recibo para criador e convidados do Weave
    try {
      const creator = await usersService.getUserById(creatorId);
      if (creator && creator.email) {
        const recipients = new Set([creator.email]);
        if (payload.attendees && payload.attendees.length > 0) {
          payload.attendees.forEach((att) => recipients.add(att));
        }

        const meetLink =
          payload.createGoogleMeet && createdEvent.google_event_id
            ? `https://meet.google.com/${createdEvent.google_event_id}` // Mock if real html_link is missing from insert, real link could be fetched if needed
            : null;

        for (const email of recipients) {
          await calendar_invite_receipt(
            email,
            payload.title,
            payload.startTime ? payload.startTime.toISOString() : "",
            payload.endTime ? payload.endTime.toISOString() : "",
            payload.location,
            payload.description,
            meetLink
          );
        }
      }
    } catch (err) {
      console.warn("Failed to send calendar receipt emails:", err.message);
    }

    return createdEvent;
  }

  async listEvents({
    creatorId,
    organizationId,
    includeDeleted,
    from,
    to,
    includeGoogleEvents,
  }) {
    const weaveEvents = await calendarEventsRepository.listEvents({
      creatorId,
      from,
      includeDeleted,
      organizationId,
      to,
    });

    let results = weaveEvents.map((e) => ({ ...e, origin: "weave" }));

    if (includeGoogleEvents) {
      const googleEvents = await this._fetchGoogleEvents(creatorId, from, to);
      results = results.concat(googleEvents);
    }

    // Sort combined events by start_time
    results.sort((a, b) => {
      const timeA = new Date(a.start_time || 0).getTime();
      const timeB = new Date(b.start_time || 0).getTime();
      return timeA - timeB;
    });

    return results;
  }

  async getEventById(eventId, creatorId) {
    const event = await calendarEventsRepository.getEventById({
      creatorId,
      eventId,
    });

    if (!event) {
      const error = new Error("Event not found");
      error.status = 404;
      throw error;
    }
    return event;
  }

  async updateEvent(eventId, body, creatorId) {
    const fields = normalizeUpdateFields(body || {});

    if (!Object.keys(fields).length) {
      const error = new Error("No valid fields provided for update");
      error.status = 400;
      throw error;
    }

    if (fields.note_id) {
      const resolvedNoteId = await resolveNoteIdToUuid(fields.note_id);
      if (!resolvedNoteId) {
        const error = new Error("Note not found");
        error.status = 404;
        throw error;
      }
      fields.note_id = resolvedNoteId;
    }

    if (fields.project_id) {
      const resolvedProjectId = await resolveProjectIdToUuid(fields.project_id);
      if (!resolvedProjectId) {
        const error = new Error("Project not found");
        error.status = 404;
        throw error;
      }
      fields.project_id = resolvedProjectId;
    }

    const current = await calendarEventsRepository.getEventById({
      creatorId,
      eventId,
    });

    if (!current) {
      const error = new Error("Event not found");
      error.status = 404;
      throw error;
    }

    if (
      fields.start_time &&
      !fields.end_time &&
      current.end_time <= fields.start_time
    ) {
      const error = new Error("end_time must be greater than start_time");
      error.status = 400;
      throw error;
    }

    if (
      fields.end_time &&
      !fields.start_time &&
      fields.end_time <= current.start_time
    ) {
      const error = new Error("end_time must be greater than start_time");
      error.status = 400;
      throw error;
    }

    const event = await calendarEventsRepository.updateEvent({
      creatorId,
      eventId,
      fields,
    });

    if (!event) {
      const error = new Error("Event not found");
      error.status = 404;
      throw error;
    }

    return event;
  }

  async deleteEvent(eventId, creatorId) {
    const result = await calendarEventsRepository.softDeleteEvent({
      creatorId,
      eventId,
    });

    if (!result) {
      const error = new Error("Event not found");
      error.status = 404;
      throw error;
    }
    return true;
  }

  async getGoogleCalendarSettings(creatorId) {
    const tokens = await GoogleOauthTokensRepository.getGoogleTokens(creatorId);
    if (!tokens) {
      const error = new Error("Google Calendar is not connected");
      error.status = 400;
      throw error;
    }

    const { calendar } = googleService.getCalendarClientWithAuth({
      access_token: tokens.access_token,
      expiry_date: tokens.expires_at
        ? new Date(tokens.expires_at).getTime()
        : null,
      refresh_token: tokens.refresh_token,
    });

    const { data } = await calendar.settings.list();
    return data.items;
  }

  async listGoogleCalendars(creatorId) {
    const tokens = await GoogleOauthTokensRepository.getGoogleTokens(creatorId);
    if (!tokens) {
      const error = new Error("Google Calendar is not connected");
      error.status = 400;
      throw error;
    }

    const { calendar } = googleService.getCalendarClientWithAuth({
      access_token: tokens.access_token,
      expiry_date: tokens.expires_at
        ? new Date(tokens.expires_at).getTime()
        : null,
      refresh_token: tokens.refresh_token,
    });

    const { data } = await calendar.calendarList.list();
    return data.items;
  }

  async checkFreeBusy(creatorId, { timeMin, timeMax, items }) {
    const tokens = await GoogleOauthTokensRepository.getGoogleTokens(creatorId);
    if (!tokens) {
      const error = new Error("Google Calendar is not connected");
      error.status = 400;
      throw error;
    }

    const { calendar } = googleService.getCalendarClientWithAuth({
      access_token: tokens.access_token,
      expiry_date: tokens.expires_at
        ? new Date(tokens.expires_at).getTime()
        : null,
      refresh_token: tokens.refresh_token,
    });

    const { data } = await calendar.freebusy.query({
      requestBody: {
        items: items || [{ id: "primary" }],
        timeMax,
        timeMin,
      },
    });
    return data.calendars;
  }
}

module.exports = new CalendarEventsService();
