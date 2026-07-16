const { executeQuery } = require("@/database/connection");

class CalendarEventsRepository {
  _mapEventRow(row) {
    if (!row) {
      return null;
    }

    return {
      created_at: row.created_at,
      creator_id: row.creator_id,
      deleted: row.deleted,
      deleted_at: row.deleted_at,
      description: row.description,
      end_time: row.end_time,
      etag: row.etag,
      google_calendar_id: row.google_calendar_id,
      google_event_id: row.google_event_id,
      id: row.id,
      is_all_day: row.is_all_day,
      is_from_note: row.is_from_note,
      is_from_project: row.is_from_project,
      last_synced_at: row.last_synced_at,
      location: row.location,
      note_id: row.note_id,
      organization_id: row.organization_id,
      outlook_calendar_id: row.outlook_calendar_id,
      outlook_event_id: row.outlook_event_id,
      project_id: row.project_id,
      start_time: row.start_time,
      sync_status: row.sync_status,
      title: row.title,
      updated_at: row.updated_at,
    };
  }

  async createEvent(payload) {
    const query = `
      INSERT INTO calendar_events (
        organization_id,
        creator_id,
        title,
        description,
        location,
        start_time,
        end_time,
        is_all_day,
        note_id,
        project_id,
        is_from_note,
        is_from_project,
        google_event_id,
        google_calendar_id,
        outlook_event_id,
        outlook_calendar_id,
        last_synced_at,
        sync_status,
        etag,
        updated_at
      )
      VALUES (
        $1::uuid,
        $2::uuid,
        $3,
        $4,
        $5,
        $6::timestamptz,
        $7::timestamptz,
        $8,
        $9::uuid,
        $10::uuid,
        $11,
        $12,
        $13,
        $14,
        $15,
        $16,
        $17::timestamptz,
        $18::sync_status,
        $19,
        NOW()
      )
      RETURNING
        id::text,
        organization_id::text,
        creator_id::text,
        title,
        description,
        location,
        start_time,
        end_time,
        is_all_day,
        note_id::text,
        project_id::text,
        is_from_note,
        is_from_project,
        google_event_id,
        google_calendar_id,
        outlook_event_id,
        outlook_calendar_id,
        last_synced_at,
        sync_status,
        etag,
        created_at,
        updated_at,
        deleted,
        deleted_at;
    `;

    const rows = await executeQuery(query, [
      payload.organizationId,
      payload.creatorId,
      payload.title,
      payload.description,
      payload.location,
      payload.startTime,
      payload.endTime,
      payload.isAllDay,
      payload.noteId,
      payload.projectId,
      payload.isFromNote,
      payload.isFromProject,
      payload.googleEventId,
      payload.googleCalendarId,
      payload.outlookEventId,
      payload.outlookCalendarId,
      payload.lastSyncedAt,
      payload.syncStatus,
      payload.etag,
    ]);

    return rows.length ? this._mapEventRow(rows[0]) : null;
  }

  async listEvents({ creatorId, organizationId, from, to, includeDeleted }) {
    const filters = ["creator_id = $1::uuid"];
    const params = [creatorId];
    let paramIndex = 1;

    if (!includeDeleted) {
      filters.push("deleted = false");
    }

    if (organizationId) {
      paramIndex += 1;
      filters.push(`organization_id = $${paramIndex}::uuid`);
      params.push(organizationId);
    }

    if (from) {
      paramIndex += 1;
      filters.push(`end_time >= $${paramIndex}::timestamptz`);
      params.push(from);
    }

    if (to) {
      paramIndex += 1;
      filters.push(`start_time <= $${paramIndex}::timestamptz`);
      params.push(to);
    }

    const query = `
      SELECT
        id::text,
        organization_id::text,
        creator_id::text,
        title,
        description,
        location,
        start_time,
        end_time,
        is_all_day,
        note_id::text,
        project_id::text,
        is_from_note,
        is_from_project,
        google_event_id,
        google_calendar_id,
        outlook_event_id,
        outlook_calendar_id,
        last_synced_at,
        sync_status,
        etag,
        created_at,
        updated_at,
        deleted,
        deleted_at
      FROM calendar_events
      WHERE ${filters.join(" AND ")}
      ORDER BY start_time ASC;
    `;

    const rows = await executeQuery(query, params);
    return rows.map((row) => this._mapEventRow(row));
  }

  async getEventById({ eventId, creatorId, includeDeleted = false }) {
    const query = `
      SELECT
        id::text,
        organization_id::text,
        creator_id::text,
        title,
        description,
        location,
        start_time,
        end_time,
        is_all_day,
        note_id::text,
        project_id::text,
        is_from_note,
        is_from_project,
        google_event_id,
        google_calendar_id,
        outlook_event_id,
        outlook_calendar_id,
        last_synced_at,
        sync_status,
        etag,
        created_at,
        updated_at,
        deleted,
        deleted_at
      FROM calendar_events
      WHERE id = $1::uuid
        AND creator_id = $2::uuid
        ${includeDeleted ? "" : "AND deleted = false"}
      LIMIT 1;
    `;

    const rows = await executeQuery(query, [eventId, creatorId]);
    return rows.length ? this._mapEventRow(rows[0]) : null;
  }

  async updateEvent({ eventId, creatorId, fields }) {
    const entries = Object.entries(fields);

    if (!entries.length) {
      return this.getEventById({ creatorId, eventId, includeDeleted: false });
    }

    const setFragments = [];
    const params = [eventId, creatorId];

    entries.forEach(([column, value], index) => {
      const position = index + 3;
      setFragments.push(`${column} = $${position}`);
      params.push(value);
    });

    setFragments.push("updated_at = NOW()");

    const query = `
      UPDATE calendar_events
      SET ${setFragments.join(", ")}
      WHERE id = $1::uuid
        AND creator_id = $2::uuid
        AND deleted = false
      RETURNING
        id::text,
        organization_id::text,
        creator_id::text,
        title,
        description,
        location,
        start_time,
        end_time,
        is_all_day,
        note_id::text,
        project_id::text,
        is_from_note,
        is_from_project,
        google_event_id,
        google_calendar_id,
        outlook_event_id,
        outlook_calendar_id,
        last_synced_at,
        sync_status,
        etag,
        created_at,
        updated_at,
        deleted,
        deleted_at;
    `;

    const rows = await executeQuery(query, params);
    return rows.length ? this._mapEventRow(rows[0]) : null;
  }

  async softDeleteEvent({ eventId, creatorId }) {
    const query = `
      UPDATE calendar_events
      SET
        deleted = true,
        deleted_at = NOW(),
        updated_at = NOW(),
        sync_status = 'OUT_OF_SYNC'
      WHERE id = $1::uuid
        AND creator_id = $2::uuid
        AND deleted = false
      RETURNING id::text;
    `;

    const rows = await executeQuery(query, [eventId, creatorId]);
    return rows.length ? rows[0] : null;
  }
}

module.exports = new CalendarEventsRepository();
