const { fromUnknown } = require("@/errors");
const calendarEventsRepository = require("@/modules/calendar-events/repositories/calendar-events.repository");
const GoogleOauthTokensRepository = require("@/modules/webhooks/repositories/google-oauth-tokens.repository");
const googleService = require("@/hooks/google/google-calendar");

const {
  parseDate,
  extractBoolean,
  normalizeCreatePayload,
  buildGoogleEventBody,
  normalizeUpdateFields,
} = require("../normalizer");
const { resolveNoteIdToUuid } = require("@/utils/note-id-lookup");
const { resolveProjectIdToUuid } = require("@/utils/project-id-lookup");

class CalendarEventsController {
  constructor() {
    this.calendarEventsRepository = calendarEventsRepository;
  }

  _requireAuthentication(req, res) {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ error: "User is not authenticated" });
      return null;
    }

    return userId;
  }

  async _syncEventToGoogle(payload) {
    const tokens = await GoogleOauthTokensRepository.getGoogleTokens(
      payload.creatorId
    );
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
        payload.creatorId,
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

  async createEvent(req, res, next) {
    try {
      const creatorId = this._requireAuthentication(req, res);
      if (!creatorId) return;

      const payload = normalizeCreatePayload(req.body, creatorId);

      if (payload.noteId) {
        const resolvedNoteId = await resolveNoteIdToUuid(payload.noteId);
        if (!resolvedNoteId) {
          return res.status(404).json({ error: "Note not found" });
        }
        payload.noteId = resolvedNoteId;
      }
      if (payload.projectId) {
        const resolvedProjectId = await resolveProjectIdToUuid(
          payload.projectId
        );
        if (!resolvedProjectId) {
          return res.status(404).json({ error: "Project not found" });
        }
        payload.projectId = resolvedProjectId;
      }

      if (payload.syncWithGoogle) {
        try {
          const syncData = await this._syncEventToGoogle(payload);
          payload.googleEventId = syncData.googleEventId;
          payload.googleCalendarId = syncData.googleCalendarId;
          payload.lastSyncedAt = syncData.lastSyncedAt;
          payload.syncStatus = syncData.syncStatus;
          payload.etag = syncData.etag;
        } catch (syncError) {
          return res.status(400).json({
            error:
              syncError.message || "Failed to synchronize with Google Calendar",
          });
        }
      }

      const event = await this.calendarEventsRepository.createEvent(payload);
      return res.status(201).json({ event });
    } catch (error) {
      next(fromUnknown(error));
    }
  }

  async listEvents(req, res, next) {
    try {
      const creatorId = this._requireAuthentication(req, res);
      if (!creatorId) return;

      const organizationId =
        req.query.organization_id || req.query.organizationId;
      const includeDeleted = extractBoolean(req.query.include_deleted, false);
      const from = parseDate(req.query.from);
      const to = parseDate(req.query.to);

      const events = await this.calendarEventsRepository.listEvents({
        creatorId,
        from,
        includeDeleted,
        organizationId,
        to,
      });

      return res.status(200).json({ events });
    } catch (error) {
      next(fromUnknown(error));
    }
  }

  async getEventById(req, res, next) {
    try {
      const creatorId = this._requireAuthentication(req, res);
      if (!creatorId) return;

      const { eventId } = req.params;

      const event = await this.calendarEventsRepository.getEventById({
        creatorId,
        eventId,
      });

      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }

      return res.status(200).json({ event });
    } catch (error) {
      next(fromUnknown(error));
    }
  }

  async updateEvent(req, res, next) {
    try {
      const creatorId = this._requireAuthentication(req, res);
      if (!creatorId) return;

      const { eventId } = req.params;

      const fields = normalizeUpdateFields(req.body || {});

      if (!Object.keys(fields).length) {
        return res.status(400).json({
          error: "No valid fields provided for update",
        });
      }

      if (fields.note_id) {
        const resolvedNoteId = await resolveNoteIdToUuid(fields.note_id);
        if (!resolvedNoteId) {
          return res.status(404).json({ error: "Note not found" });
        }
        fields.note_id = resolvedNoteId;
      }
      if (fields.project_id) {
        const resolvedProjectId = await resolveProjectIdToUuid(
          fields.project_id
        );
        if (!resolvedProjectId) {
          return res.status(404).json({ error: "Project not found" });
        }
        fields.project_id = resolvedProjectId;
      }

      const current = await this.calendarEventsRepository.getEventById({
        creatorId,
        eventId,
      });

      if (!current) {
        return res.status(404).json({ error: "Event not found" });
      }

      if (
        fields.start_time &&
        !fields.end_time &&
        current.end_time <= fields.start_time
      ) {
        return res
          .status(400)
          .json({ error: "end_time must be greater than start_time" });
      }

      if (
        fields.end_time &&
        !fields.start_time &&
        fields.end_time <= current.start_time
      ) {
        return res
          .status(400)
          .json({ error: "end_time must be greater than start_time" });
      }

      const event = await this.calendarEventsRepository.updateEvent({
        creatorId,
        eventId,
        fields,
      });

      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }

      return res.status(200).json({ event });
    } catch (error) {
      next(fromUnknown(error));
    }
  }

  async deleteEvent(req, res, next) {
    try {
      const creatorId = this._requireAuthentication(req, res);
      if (!creatorId) return;

      const { eventId } = req.params;

      const result = await this.calendarEventsRepository.softDeleteEvent({
        creatorId,
        eventId,
      });

      if (!result) {
        return res.status(404).json({ error: "Event not found" });
      }

      return res.status(200).json({ success: true });
    } catch (error) {
      next(fromUnknown(error));
    }
  }

  async getGoogleCalendarSettings(req, res, next) {
    try {
      const creatorId = this._requireAuthentication(req, res);
      if (!creatorId) return;

      const tokens =
        await GoogleOauthTokensRepository.getGoogleTokens(creatorId);
      if (!tokens)
        return res
          .status(400)
          .json({ error: "Google Calendar is not connected" });

      const { calendar } = googleService.getCalendarClientWithAuth({
        access_token: tokens.access_token,
        expiry_date: tokens.expires_at
          ? new Date(tokens.expires_at).getTime()
          : null,
        refresh_token: tokens.refresh_token,
      });

      const { data } = await calendar.settings.list();
      return res.status(200).json({ settings: data.items });
    } catch (error) {
      next(fromUnknown(error));
    }
  }

  async listGoogleCalendars(req, res, next) {
    try {
      const creatorId = this._requireAuthentication(req, res);
      if (!creatorId) return;

      const tokens =
        await GoogleOauthTokensRepository.getGoogleTokens(creatorId);
      if (!tokens)
        return res
          .status(400)
          .json({ error: "Google Calendar is not connected" });

      const { calendar } = googleService.getCalendarClientWithAuth({
        access_token: tokens.access_token,
        expiry_date: tokens.expires_at
          ? new Date(tokens.expires_at).getTime()
          : null,
        refresh_token: tokens.refresh_token,
      });

      const { data } = await calendar.calendarList.list();
      return res.status(200).json({ calendars: data.items });
    } catch (error) {
      next(fromUnknown(error));
    }
  }

  async checkFreeBusy(req, res, next) {
    try {
      const creatorId = this._requireAuthentication(req, res);
      if (!creatorId) return;

      const tokens =
        await GoogleOauthTokensRepository.getGoogleTokens(creatorId);
      if (!tokens)
        return res
          .status(400)
          .json({ error: "Google Calendar is not connected" });

      const { calendar } = googleService.getCalendarClientWithAuth({
        access_token: tokens.access_token,
        expiry_date: tokens.expires_at
          ? new Date(tokens.expires_at).getTime()
          : null,
        refresh_token: tokens.refresh_token,
      });

      const { timeMin, timeMax, items } = req.body;
      const { data } = await calendar.freebusy.query({
        requestBody: {
          timeMin,
          timeMax,
          items: items || [{ id: "primary" }],
        },
      });
      return res.status(200).json({ freebusy: data.calendars });
    } catch (error) {
      next(fromUnknown(error));
    }
  }
}
module.exports = new CalendarEventsController();
