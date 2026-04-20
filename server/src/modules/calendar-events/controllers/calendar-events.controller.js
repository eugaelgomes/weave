const calendarEventsRepository = require("@/modules/calendar-events/repositories/calendar-events.repository");
const GoogleOauthTokensRepository = require("@/modules/webhooks/repositories/google-oauth-tokens.repository");
const googleService = require("@/hooks/google/google-calendar");

const {
  isValidUUID,
  parseDate,
  extractBoolean,
  normalizeCreatePayload,
  validateCreatePayload,
  buildGoogleEventBody,
  normalizeUpdateFields,
  validateUpdateFields,
} = require("../normalizer");

class CalendarEventsController {
  constructor() {
    this.calendarEventsRepository = calendarEventsRepository;
  }

  _requireAuthentication(req, res) {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ error: "Usuario nao autenticado" });
      return null;
    }

    return userId;
  }

  async _syncEventToGoogle(payload) {
    const tokens = await GoogleOauthTokensRepository.getGoogleTokens(
      payload.creatorId
    );
    if (!tokens) {
      throw new Error("Google Calendar nao conectado");
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
      const error = validateCreatePayload(payload);
      if (error) {
        return res.status(400).json({ error });
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
              syncError.message || "Falha ao sincronizar com Google Calendar",
          });
        }
      }

      const event = await this.calendarEventsRepository.createEvent(payload);
      return res.status(201).json({ event });
    } catch (error) {
      next(error);
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

      if (organizationId && !isValidUUID(organizationId)) {
        return res.status(400).json({ error: "organization_id invalido" });
      }

      if (includeDeleted === null) {
        return res
          .status(400)
          .json({ error: "include_deleted deve ser booleano" });
      }

      if (req.query.from && !from) {
        return res.status(400).json({ error: "from invalido" });
      }

      if (req.query.to && !to) {
        return res.status(400).json({ error: "to invalido" });
      }

      const events = await this.calendarEventsRepository.listEvents({
        creatorId,
        from,
        includeDeleted,
        organizationId,
        to,
      });

      return res.status(200).json({ events });
    } catch (error) {
      next(error);
    }
  }

  async getEventById(req, res, next) {
    try {
      const creatorId = this._requireAuthentication(req, res);
      if (!creatorId) return;

      const { eventId } = req.params;
      if (!isValidUUID(eventId)) {
        return res.status(400).json({ error: "eventId invalido" });
      }

      const event = await this.calendarEventsRepository.getEventById({
        creatorId,
        eventId,
      });

      if (!event) {
        return res.status(404).json({ error: "Evento nao encontrado" });
      }

      return res.status(200).json({ event });
    } catch (error) {
      next(error);
    }
  }

  async updateEvent(req, res, next) {
    try {
      const creatorId = this._requireAuthentication(req, res);
      if (!creatorId) return;

      const { eventId } = req.params;
      if (!isValidUUID(eventId)) {
        return res.status(400).json({ error: "eventId invalido" });
      }

      const fields = normalizeUpdateFields(req.body || {});
      const validationError = validateUpdateFields(fields);
      if (validationError) {
        return res.status(400).json({ error: validationError });
      }

      if (!Object.keys(fields).length) {
        return res.status(400).json({
          error: "Nenhum campo valido foi informado para atualizacao",
        });
      }

      const current = await this.calendarEventsRepository.getEventById({
        creatorId,
        eventId,
      });

      if (!current) {
        return res.status(404).json({ error: "Evento nao encontrado" });
      }

      if (
        fields.start_time &&
        !fields.end_time &&
        current.end_time <= fields.start_time
      ) {
        return res
          .status(400)
          .json({ error: "end_time deve ser maior que start_time" });
      }

      if (
        fields.end_time &&
        !fields.start_time &&
        fields.end_time <= current.start_time
      ) {
        return res
          .status(400)
          .json({ error: "end_time deve ser maior que start_time" });
      }

      const event = await this.calendarEventsRepository.updateEvent({
        creatorId,
        eventId,
        fields,
      });

      if (!event) {
        return res.status(404).json({ error: "Evento nao encontrado" });
      }

      return res.status(200).json({ event });
    } catch (error) {
      next(error);
    }
  }

  async deleteEvent(req, res, next) {
    try {
      const creatorId = this._requireAuthentication(req, res);
      if (!creatorId) return;

      const { eventId } = req.params;
      if (!isValidUUID(eventId)) {
        return res.status(400).json({ error: "eventId invalido" });
      }

      const result = await this.calendarEventsRepository.softDeleteEvent({
        creatorId,
        eventId,
      });

      if (!result) {
        return res.status(404).json({ error: "Evento nao encontrado" });
      }

      return res.status(200).json({ success: true });
    } catch (error) {
      next(error);
    }
  }

  async getGoogleCalendarSettings(req, res, next) {
    try {
      const creatorId = this._requireAuthentication(req, res);
      if (!creatorId) return;

      const tokens =
        await GoogleOauthTokensRepository.getGoogleTokens(creatorId);
      if (!tokens)
        return res.status(400).json({ error: "Google Calendar não conectado" });

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
      next(error);
    }
  }

  async listGoogleCalendars(req, res, next) {
    try {
      const creatorId = this._requireAuthentication(req, res);
      if (!creatorId) return;

      const tokens =
        await GoogleOauthTokensRepository.getGoogleTokens(creatorId);
      if (!tokens)
        return res.status(400).json({ error: "Google Calendar não conectado" });

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
      next(error);
    }
  }

  async checkFreeBusy(req, res, next) {
    try {
      const creatorId = this._requireAuthentication(req, res);
      if (!creatorId) return;

      const tokens =
        await GoogleOauthTokensRepository.getGoogleTokens(creatorId);
      if (!tokens)
        return res.status(400).json({ error: "Google Calendar não conectado" });

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
      next(error);
    }
  }
}
module.exports = new CalendarEventsController();
