const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const isValidUUID = (value) => {
  return !!value && UUID_REGEX.test(value);
};

const parseDate = (value) => {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
};

const extractBoolean = (value, fallback = false) => {
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
};

const parseSyncStatus = (value) => {
  if (!value) {
    return "PENDING";
  }

  const normalized = String(value).toUpperCase();
  const allowed = ["SYNCED", "PENDING", "FAILED", "OUT_OF_SYNC"];
  return allowed.includes(normalized) ? normalized : null;
};

const normalizeAttendees = (attendees) => {
  if (!Array.isArray(attendees)) {
    return [];
  }

  const unique = new Map();
  attendees
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter(Boolean)
    .forEach((email) => {
      const normalized = email.toLowerCase();
      if (!unique.has(normalized)) {
        unique.set(normalized, email);
      }
    });

  return Array.from(unique.values());
};

const normalizeCreatePayload = (body, creatorId) => {
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const description = typeof body?.description === "string" ? body.description.trim() : null;
  const location = typeof body?.location === "string" ? body.location.trim() : null;

  const organizationId = body?.organization_id || body?.organizationId || null;
  const noteId = body?.note_id || body?.noteId || null;
  const projectId = body?.project_id || body?.projectId || null;

  const startTime = parseDate(body?.start_time || body?.startTime);
  const endTime = parseDate(body?.end_time || body?.endTime);
  const lastSyncedAt = parseDate(body?.last_synced_at || body?.lastSyncedAt);

  const isAllDay = extractBoolean(body?.is_all_day ?? body?.isAllDay, false);
  const isFromNoteRaw = extractBoolean(body?.is_from_note ?? body?.isFromNote, !!noteId);
  const isFromProjectRaw = extractBoolean(
    body?.is_from_project ?? body?.isFromProject,
    !!projectId
  );

  const syncStatus = parseSyncStatus(body?.sync_status || body?.syncStatus);
  const syncWithGoogle = extractBoolean(body?.sync_with_google ?? body?.syncWithGoogle, false);
  const createGoogleMeet = extractBoolean(
    body?.create_google_meet ?? body?.createGoogleMeet,
    false
  );
  const attendees = normalizeAttendees(body?.attendees || body?.guests || []);

  return {
    attendees,
    createGoogleMeet,
    creatorId,
    description,
    endTime,
    etag: body?.etag || null,
    googleCalendarId: body?.google_calendar_id || body?.googleCalendarId || null,
    googleEventId: body?.google_event_id || body?.googleEventId || null,
    isAllDay,
    isFromNote: isFromNoteRaw,
    isFromProject: isFromProjectRaw,
    lastSyncedAt,
    location,
    noteId,
    organizationId,
    outlookCalendarId: body?.outlook_calendar_id || body?.outlookCalendarId || null,
    outlookEventId: body?.outlook_event_id || body?.outlookEventId || null,
    projectId,
    startTime,
    syncStatus,
    syncWithGoogle,
    title,
  };
};

const buildGoogleEventBody = (payload) => {
  const requestBody = {
    description: payload.description || undefined,
    location: payload.location || undefined,
    summary: payload.title,
  };

  if (payload.attendees.length) {
    requestBody.attendees = payload.attendees.map((email) => ({ email }));
  }

  if (payload.createGoogleMeet) {
    requestBody.conferenceData = {
      createRequest: {
        conferenceSolutionKey: { type: "hangoutsMeet" },
        requestId: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      },
    };
  }

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
};

const normalizeUpdateFields = (body) => {
  const fields = {};

  if (body?.title !== undefined) {
    fields.title = typeof body.title === "string" ? body.title.trim() : "";
  }

  if (body?.description !== undefined) {
    fields.description = typeof body.description === "string" ? body.description.trim() : null;
  }

  if (body?.location !== undefined) {
    fields.location = typeof body.location === "string" ? body.location.trim() : null;
  }

  if (body?.start_time !== undefined || body?.startTime !== undefined) {
    const value = body?.start_time || body?.startTime;
    fields.start_time = parseDate(value);
  }

  if (body?.end_time !== undefined || body?.endTime !== undefined) {
    const value = body?.end_time || body?.endTime;
    fields.end_time = parseDate(value);
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
    fields.is_all_day = extractBoolean(body?.is_all_day ?? body?.isAllDay, false);
  }

  if (body?.is_from_note !== undefined || body?.isFromNote !== undefined) {
    fields.is_from_note = extractBoolean(body?.is_from_note ?? body?.isFromNote, false);
  }

  if (body?.is_from_project !== undefined || body?.isFromProject !== undefined) {
    fields.is_from_project = extractBoolean(body?.is_from_project ?? body?.isFromProject, false);
  }

  if (body?.sync_status !== undefined || body?.syncStatus !== undefined) {
    fields.sync_status = parseSyncStatus(body?.sync_status || body?.syncStatus);
  }

  if (body?.last_synced_at !== undefined || body?.lastSyncedAt !== undefined) {
    const parsed = parseDate(body?.last_synced_at || body?.lastSyncedAt);
    fields.last_synced_at = parsed;
  }

  if (body?.etag !== undefined) {
    fields.etag = body.etag || null;
  }

  if (body?.google_event_id !== undefined || body?.googleEventId !== undefined) {
    fields.google_event_id = body?.google_event_id || body?.googleEventId || null;
  }

  if (body?.google_calendar_id !== undefined || body?.googleCalendarId !== undefined) {
    fields.google_calendar_id = body?.google_calendar_id || body?.googleCalendarId || null;
  }

  if (body?.outlook_event_id !== undefined || body?.outlookEventId !== undefined) {
    fields.outlook_event_id = body?.outlook_event_id || body?.outlookEventId || null;
  }

  if (body?.outlook_calendar_id !== undefined || body?.outlookCalendarId !== undefined) {
    fields.outlook_calendar_id = body?.outlook_calendar_id || body?.outlookCalendarId || null;
  }

  return fields;
};

module.exports = {
  buildGoogleEventBody,
  extractBoolean,
  isValidUUID,
  normalizeAttendees,
  normalizeCreatePayload,
  normalizeUpdateFields,
  parseDate,
  parseSyncStatus,
};
