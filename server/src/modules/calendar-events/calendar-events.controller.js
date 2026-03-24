const calendarEventsRepository = require("@/modules/calendar-events/calendar-events.repository");
const webhooksRepository = require("@/modules/webhooks/webhooks.repository");
const googleService = require("@/hooks/google/google-calendar");

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

  _isValidUUID(value) {
    return !!value && UUID_REGEX.test(value);
  }

  _parseDate(value) {
    if (!value) {
      return null;
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return null;
    }

    return date;
  }

  _extractBoolean(value, fallback = false) {
    if (value === undefined || value === null) {
      return fallback;
    }

    if (typeof value === "boolean") {
      return value;
    }

    if (typeof value === "string") {
      if (["true", "1"].includes(value.toLowerCase())) {
        return true;
      }

      if (["false", "0"].includes(value.toLowerCase())) {
        return false;
      }
    }

    return null;
  }

  _parseSyncStatus(value) {
    if (!value) {
      return "PENDING";
    }

    const normalized = String(value).toUpperCase();
    const allowed = ["SYNCED", "PENDING", "FAILED", "OUT_OF_SYNC"];
    return allowed.includes(normalized) ? normalized : null;
  }

  _normalizeCreatePayload(body, creatorId) {
    const title = typeof body?.title === "string" ? body.title.trim() : "";
    const description =
      typeof body?.description === "string" ? body.description.trim() : null;
    const location =
      typeof body?.location === "string" ? body.location.trim() : null;

    const organizationId = body?.organization_id || body?.organizationId || null;
    const noteId = body?.note_id || body?.noteId || null;
    const projectId = body?.project_id || body?.projectId || null;

    const startTime = this._parseDate(body?.start_time || body?.startTime);
    const endTime = this._parseDate(body?.end_time || body?.endTime);
    const lastSyncedAt = this._parseDate(
      body?.last_synced_at || body?.lastSyncedAt
    );

    const isAllDay = this._extractBoolean(
      body?.is_all_day ?? body?.isAllDay,
      false
    );
    const isFromNoteRaw = this._extractBoolean(
      body?.is_from_note ?? body?.isFromNote,
      !!noteId
    );
    const isFromProjectRaw = this._extractBoolean(
      body?.is_from_project ?? body?.isFromProject,
      !!projectId
    );

    const syncStatus = this._parseSyncStatus(body?.sync_status || body?.syncStatus);
    const syncWithGoogle = this._extractBoolean(
      body?.sync_with_google ?? body?.syncWithGoogle,
      false
    );

    return {
      creatorId,
      description,
      endTime,
      etag: body?.etag || null,
      googleCalendarId:
        body?.google_calendar_id || body?.googleCalendarId || null,
      googleEventId: body?.google_event_id || body?.googleEventId || null,
      isAllDay,
      isFromNote: isFromNoteRaw,
      isFromProject: isFromProjectRaw,
      lastSyncedAt,
      location,
      noteId,
      organizationId,
      outlookCalendarId:
        body?.outlook_calendar_id || body?.outlookCalendarId || null,
      outlookEventId: body?.outlook_event_id || body?.outlookEventId || null,
      projectId,
      startTime,
      syncStatus,
      syncWithGoogle,
      title,
    };
  }

  _validateCreatePayload(payload) {
    if (!payload.title) {
      return "Campo obrigatorio: title";
    }

    if (!payload.startTime || !payload.endTime) {
      return "Campos obrigatorios: start_time e end_time";
    }

    if (payload.endTime <= payload.startTime) {
      return "end_time deve ser maior que start_time";
    }

    if (payload.organizationId && !this._isValidUUID(payload.organizationId)) {
      return "organization_id invalido";
    }

    if (payload.noteId && !this._isValidUUID(payload.noteId)) {
      return "note_id invalido";
    }

    if (payload.projectId && !this._isValidUUID(payload.projectId)) {
      return "project_id invalido";
    }

    if (payload.isAllDay === null) {
      return "is_all_day deve ser booleano";
    }

    if (payload.isFromNote === null) {
      return "is_from_note deve ser booleano";
    }

    if (payload.isFromProject === null) {
      return "is_from_project deve ser booleano";
    }

    if (!payload.syncStatus) {
      return "sync_status invalido";
    }

    if (payload.syncWithGoogle === null) {
      return "sync_with_google deve ser booleano";
    }

    return null;
  }

  _buildGoogleEventBody(payload) {
    const requestBody = {
      description: payload.description || undefined,
      location: payload.location || undefined,
      summary: payload.title,
    };

    if (payload.isAllDay) {
      const startDate = payload.startTime.toISOString().slice(0, 10);
      const endExclusive = new Date(payload.endTime);
      endExclusive.setDate(endExclusive.getDate() + 1);
      const endDate = endExclusive.toISOString().slice(0, 10);

      requestBody.start = { date: startDate };
      requestBody.end = { date: endDate };
      return requestBody;
    }

    requestBody.start = { dateTime: payload.startTime.toISOString() };
    requestBody.end = { dateTime: payload.endTime.toISOString() };
    return requestBody;
  }

  async _syncEventToGoogle(payload) {
    const tokens = await webhooksRepository.getGoogleTokens(payload.creatorId);
    if (!tokens) {
      throw new Error("Google Calendar nao conectado");
    }

    const calendarId = payload.googleCalendarId || "primary";
    const { calendar, auth } = googleService.getCalendarClientWithAuth({
      access_token: tokens.access_token,
      expiry_date: tokens.expires_at ? new Date(tokens.expires_at).getTime() : null,
      refresh_token: tokens.refresh_token,
    });

    const requestBody = this._buildGoogleEventBody(payload);
    const { data } = await calendar.events.insert({
      calendarId,
      requestBody,
    });

    const refreshed = auth.credentials;
    if (refreshed.access_token && refreshed.access_token !== tokens.access_token) {
      const newExpiry = refreshed.expiry_date ? new Date(refreshed.expiry_date) : null;
      await webhooksRepository.updateGoogleAccessToken(
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

  _normalizeUpdateFields(body) {
    const fields = {};

    if (body?.title !== undefined) {
      fields.title = typeof body.title === "string" ? body.title.trim() : "";
    }

    if (body?.description !== undefined) {
      fields.description =
        typeof body.description === "string" ? body.description.trim() : null;
    }

    if (body?.location !== undefined) {
      fields.location =
        typeof body.location === "string" ? body.location.trim() : null;
    }

    if (body?.start_time !== undefined || body?.startTime !== undefined) {
      const value = body?.start_time || body?.startTime;
      fields.start_time = this._parseDate(value);
    }

    if (body?.end_time !== undefined || body?.endTime !== undefined) {
      const value = body?.end_time || body?.endTime;
      fields.end_time = this._parseDate(value);
    }

    if (body?.organization_id !== undefined || body?.organizationId !== undefined) {
      fields.organization_id = body?.organization_id || body?.organizationId || null;
    }

    if (body?.note_id !== undefined || body?.noteId !== undefined) {
      fields.note_id = body?.note_id || body?.noteId || null;
    }

    if (body?.project_id !== undefined || body?.projectId !== undefined) {
      fields.project_id = body?.project_id || body?.projectId || null;
    }

    if (body?.is_all_day !== undefined || body?.isAllDay !== undefined) {
      fields.is_all_day = this._extractBoolean(
        body?.is_all_day ?? body?.isAllDay,
        false
      );
    }

    if (body?.is_from_note !== undefined || body?.isFromNote !== undefined) {
      fields.is_from_note = this._extractBoolean(
        body?.is_from_note ?? body?.isFromNote,
        false
      );
    }

    if (body?.is_from_project !== undefined || body?.isFromProject !== undefined) {
      fields.is_from_project = this._extractBoolean(
        body?.is_from_project ?? body?.isFromProject,
        false
      );
    }

    if (body?.sync_status !== undefined || body?.syncStatus !== undefined) {
      fields.sync_status = this._parseSyncStatus(body?.sync_status || body?.syncStatus);
    }

    if (
      body?.last_synced_at !== undefined ||
      body?.lastSyncedAt !== undefined
    ) {
      const parsed = this._parseDate(body?.last_synced_at || body?.lastSyncedAt);
      fields.last_synced_at = parsed;
    }

    if (body?.etag !== undefined) {
      fields.etag = body.etag || null;
    }

    if (body?.google_event_id !== undefined || body?.googleEventId !== undefined) {
      fields.google_event_id = body?.google_event_id || body?.googleEventId || null;
    }

    if (
      body?.google_calendar_id !== undefined ||
      body?.googleCalendarId !== undefined
    ) {
      fields.google_calendar_id =
        body?.google_calendar_id || body?.googleCalendarId || null;
    }

    if (body?.outlook_event_id !== undefined || body?.outlookEventId !== undefined) {
      fields.outlook_event_id = body?.outlook_event_id || body?.outlookEventId || null;
    }

    if (
      body?.outlook_calendar_id !== undefined ||
      body?.outlookCalendarId !== undefined
    ) {
      fields.outlook_calendar_id =
        body?.outlook_calendar_id || body?.outlookCalendarId || null;
    }

    return fields;
  }

  _validateUpdateFields(fields) {
    if (fields.title !== undefined && !fields.title) {
      return "title nao pode ser vazio";
    }

    if (fields.start_time !== undefined && !fields.start_time) {
      return "start_time invalido";
    }

    if (fields.end_time !== undefined && !fields.end_time) {
      return "end_time invalido";
    }

    if (
      fields.start_time &&
      fields.end_time &&
      fields.end_time <= fields.start_time
    ) {
      return "end_time deve ser maior que start_time";
    }

    if (fields.organization_id && !this._isValidUUID(fields.organization_id)) {
      return "organization_id invalido";
    }

    if (fields.note_id && !this._isValidUUID(fields.note_id)) {
      return "note_id invalido";
    }

    if (fields.project_id && !this._isValidUUID(fields.project_id)) {
      return "project_id invalido";
    }

    if (fields.is_all_day === null) {
      return "is_all_day deve ser booleano";
    }

    if (fields.is_from_note === null) {
      return "is_from_note deve ser booleano";
    }

    if (fields.is_from_project === null) {
      return "is_from_project deve ser booleano";
    }

    if (fields.sync_status === null) {
      return "sync_status invalido";
    }

    return null;
  }

  async createEvent(req, res, next) {
    try {
      const creatorId = this._requireAuthentication(req, res);
      if (!creatorId) return;

      const payload = this._normalizeCreatePayload(req.body, creatorId);
      const error = this._validateCreatePayload(payload);
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
            error: syncError.message || "Falha ao sincronizar com Google Calendar",
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

      const organizationId = req.query.organization_id || req.query.organizationId;
      const includeDeleted = this._extractBoolean(req.query.include_deleted, false);
      const from = this._parseDate(req.query.from);
      const to = this._parseDate(req.query.to);

      if (organizationId && !this._isValidUUID(organizationId)) {
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
      if (!this._isValidUUID(eventId)) {
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
      if (!this._isValidUUID(eventId)) {
        return res.status(400).json({ error: "eventId invalido" });
      }

      const fields = this._normalizeUpdateFields(req.body || {});
      const validationError = this._validateUpdateFields(fields);
      if (validationError) {
        return res.status(400).json({ error: validationError });
      }

      if (!Object.keys(fields).length) {
        return res
          .status(400)
          .json({ error: "Nenhum campo valido foi informado para atualizacao" });
      }

      const current = await this.calendarEventsRepository.getEventById({
        creatorId,
        eventId,
      });

      if (!current) {
        return res.status(404).json({ error: "Evento nao encontrado" });
      }

      if (fields.start_time && !fields.end_time && current.end_time <= fields.start_time) {
        return res.status(400).json({ error: "end_time deve ser maior que start_time" });
      }

      if (fields.end_time && !fields.start_time && fields.end_time <= current.start_time) {
        return res.status(400).json({ error: "end_time deve ser maior que start_time" });
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
      if (!this._isValidUUID(eventId)) {
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
}

module.exports = new CalendarEventsController();
