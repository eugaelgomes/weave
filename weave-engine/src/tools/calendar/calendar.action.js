const { pool } = require("../../services/database/postgres.client");
const axios = require("axios");

async function _syncToGoogle(userId, method, url, data = null) {
  try {
    const tokenRes = await pool.query(
      "SELECT access_token FROM user_oauth_tokens WHERE user_id = $1 AND provider = 'GOOGLE' AND deleted = false LIMIT 1",
      [userId]
    );
    if (tokenRes.rows.length === 0) return null;
    const accessToken = tokenRes.rows[0].access_token;

    const config = {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      method,
      url: `https://www.googleapis.com/calendar/v3/calendars/primary/events${url}`,
    };
    if (data) config.data = data;

    const response = await axios(config);
    return response.data || true;
  } catch (err) {
    console.error(`Google API Error: ${err.message}`, err.response?.data);
    return null;
  }
}

async function listCalendarEvents(args) {
  if (!args.userId)
    return { error: "No userId provided in execution context." };

  try {
    let query = `
      SELECT id, title, description, location, start_time, end_time, is_all_day, project_id, note_id
      FROM calendar_events
      WHERE deleted = false AND creator_id = $1::uuid
    `;
    const queryArgs = [args.userId];
    let paramIndex = 2;

    if (args.projectId) {
      query += ` AND project_id = $${paramIndex++}::uuid`;
      queryArgs.push(args.projectId);
    }

    if (args.startDate) {
      query += ` AND start_time >= $${paramIndex++}::timestamptz`;
      queryArgs.push(args.startDate);
    }

    if (args.endDate) {
      query += ` AND start_time <= $${paramIndex++}::timestamptz`;
      queryArgs.push(args.endDate);
    }

    query += ` ORDER BY start_time ASC LIMIT 100`;

    const result = await pool.query(query, queryArgs);
    return {
      events: result.rows,
      success: true,
    };
  } catch (error) {
    console.error("Error in listCalendarEvents tool:", error);
    return { error: `Database error: ${error.message}` };
  }
}

async function createCalendarEvent(args) {
  if (!args.userId)
    return { error: "No userId provided in execution context." };

  try {
    const query = `
      INSERT INTO calendar_events (
        organization_id, creator_id, project_id, note_id, 
        title, description, location, start_time, end_time, is_all_day,
        is_from_note, is_from_project
      )
      VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, $5, $6, $7, $8::timestamptz, $9::timestamptz, $10, $11, $12)
      RETURNING id, title, start_time, end_time
    `;
    const queryArgs = [
      args.organizationId || null,
      args.userId,
      args.projectId || null,
      args.noteId || null,
      args.title,
      args.description || null,
      args.location || null,
      args.startTime,
      args.endTime,
      args.isAllDay || false,
      !!args.noteId,
      !!args.projectId,
    ];

    const result = await pool.query(query, queryArgs);
    const event = result.rows[0];

    // Sync with Google Calendar
    const googleEventBody = {
      description: args.description || undefined,
      location: args.location || undefined,
      summary: args.title,
    };

    if (args.isAllDay) {
      googleEventBody.start = {
        date: new Date(args.startTime).toISOString().slice(0, 10),
      };
      const endExclusive = new Date(args.endTime);
      endExclusive.setDate(endExclusive.getDate() + 1);
      googleEventBody.end = { date: endExclusive.toISOString().slice(0, 10) };
    } else {
      googleEventBody.start = {
        dateTime: new Date(args.startTime).toISOString(),
      };
      googleEventBody.end = { dateTime: new Date(args.endTime).toISOString() };
    }

    const gData = await _syncToGoogle(args.userId, "POST", "", googleEventBody);
    if (gData && gData.id) {
      await pool.query(
        "UPDATE calendar_events SET google_event_id = $1, google_calendar_id = 'primary', sync_status = 'SYNCED', last_synced_at = now() WHERE id = $2",
        [gData.id, event.id]
      );
    }

    return {
      event,
      message: "Calendar event created successfully.",
      success: true,
    };
  } catch (error) {
    console.error("Error in createCalendarEvent tool:", error);
    return { error: `Database error: ${error.message}` };
  }
}

async function updateCalendarEvent(args) {
  if (!args.userId)
    return { error: "No userId provided in execution context." };

  try {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (args.title) {
      fields.push(`title = $${paramIndex++}`);
      values.push(args.title);
    }
    if (args.description !== undefined) {
      fields.push(`description = $${paramIndex++}`);
      values.push(args.description);
    }
    if (args.location !== undefined) {
      fields.push(`location = $${paramIndex++}`);
      values.push(args.location);
    }
    if (args.startTime) {
      fields.push(`start_time = $${paramIndex++}::timestamptz`);
      values.push(args.startTime);
    }
    if (args.endTime) {
      fields.push(`end_time = $${paramIndex++}::timestamptz`);
      values.push(args.endTime);
    }
    if (args.isAllDay !== undefined) {
      fields.push(`is_all_day = $${paramIndex++}`);
      values.push(args.isAllDay);
    }

    if (fields.length === 0) {
      return { error: "No fields to update." };
    }

    fields.push(`updated_at = now()`);
    fields.push(`sync_status = 'PENDING'`);

    values.push(args.eventId);
    values.push(args.userId);

    const query = `
      UPDATE calendar_events
      SET ${fields.join(", ")}
      WHERE id = $${paramIndex - 2}::uuid AND creator_id = $${paramIndex - 1}::uuid AND deleted = false
      RETURNING id, title, start_time, end_time, google_event_id, is_all_day, description, location
    `;

    const result = await pool.query(query, values);
    if (result.rowCount === 0) {
      return {
        error: "Event not found or you do not have permission to edit it.",
      };
    }
    const event = result.rows[0];

    // Sync with Google Calendar
    if (event.google_event_id) {
      const googleEventBody = {
        description: event.description || undefined,
        location: event.location || undefined,
        summary: event.title,
      };

      if (event.is_all_day) {
        googleEventBody.start = {
          date: new Date(event.start_time).toISOString().slice(0, 10),
        };
        const endExclusive = new Date(event.end_time);
        endExclusive.setDate(endExclusive.getDate() + 1);
        googleEventBody.end = { date: endExclusive.toISOString().slice(0, 10) };
      } else {
        googleEventBody.start = {
          dateTime: new Date(event.start_time).toISOString(),
        };
        googleEventBody.end = {
          dateTime: new Date(event.end_time).toISOString(),
        };
      }

      const gData = await _syncToGoogle(
        args.userId,
        "PUT",
        `/${event.google_event_id}`,
        googleEventBody
      );
      if (gData !== null) {
        await pool.query(
          "UPDATE calendar_events SET sync_status = 'SYNCED', last_synced_at = now() WHERE id = $1",
          [event.id]
        );
      }
    }

    return {
      event,
      message: "Calendar event updated successfully.",
      success: true,
    };
  } catch (error) {
    console.error("Error in updateCalendarEvent tool:", error);
    return { error: `Database error: ${error.message}` };
  }
}

async function deleteCalendarEvent(args) {
  if (!args.userId)
    return { error: "No userId provided in execution context." };

  try {
    const query = `
      UPDATE calendar_events
      SET deleted = true, deleted_at = now(), sync_status = 'PENDING'
      WHERE id = $1::uuid AND creator_id = $2::uuid AND deleted = false
      RETURNING id, google_event_id
    `;
    const result = await pool.query(query, [args.eventId, args.userId]);

    if (result.rowCount === 0) {
      return {
        error: "Event not found or you do not have permission to delete it.",
      };
    }
    const event = result.rows[0];

    // Sync with Google Calendar
    if (event.google_event_id) {
      const gData = await _syncToGoogle(
        args.userId,
        "DELETE",
        `/${event.google_event_id}`
      );
      if (gData !== null) {
        await pool.query(
          "UPDATE calendar_events SET sync_status = 'SYNCED', last_synced_at = now() WHERE id = $1",
          [event.id]
        );
      }
    }

    return {
      message: "Event canceled/deleted successfully.",
      success: true,
    };
  } catch (error) {
    console.error("Error in deleteCalendarEvent tool:", error);
    return { error: `Database error: ${error.message}` };
  }
}

module.exports = {
  createCalendarEvent,
  deleteCalendarEvent,
  listCalendarEvents,
  updateCalendarEvent,
};
