const { executeQuery } = require("@/database/connection");

class EventInvitesRepository {
  _mapInviteRow(row) {
    if (!row) {
      return null;
    }

    return {
      id: row.id,
      event_id: row.event_id,
      user_id: row.user_id,
      email: row.email,
      role: row.role,
      status: row.status,
      external_guest_id: row.external_guest_id,
      created_at: row.created_at,
      updated_at: row.updated_at,
      deleted: row.deleted,
      deleted_at: row.deleted_at,
    };
  }

  async createInvite(payload) {
    const query = `
      INSERT INTO calendar_event_invites (
        event_id,
        user_id,
        email,
        role,
        status,
        external_guest_id
      )
      VALUES (
        $1::uuid,
        $2::uuid,
        $3,
        $4::invite_role,
        $5::invite_status,
        $6
      )
      RETURNING
        id::text,
        event_id::text,
        user_id::text,
        email,
        role,
        status,
        external_guest_id,
        created_at,
        updated_at,
        deleted,
        deleted_at;
    `;

    const rows = await executeQuery(query, [
      payload.eventId,
      payload.userId || null,
      payload.email,
      payload.role || "REQUIRED",
      payload.status || "PENDING",
      payload.externalGuestId || null,
    ]);

    return rows.length ? this._mapInviteRow(rows[0]) : null;
  }

  async getInviteById(inviteId) {
    const query = `
      SELECT
        id::text,
        event_id::text,
        user_id::text,
        email,
        role,
        status,
        external_guest_id,
        created_at,
        updated_at,
        deleted,
        deleted_at
      FROM calendar_event_invites
      WHERE id = $1::uuid AND deleted = false;
    `;

    const rows = await executeQuery(query, [inviteId]);
    return rows.length ? this._mapInviteRow(rows[0]) : null;
  }

  async listInvitesByEvent(eventId) {
    const query = `
      SELECT
        id::text,
        event_id::text,
        user_id::text,
        email,
        role,
        status,
        external_guest_id,
        created_at,
        updated_at,
        deleted,
        deleted_at
      FROM calendar_event_invites
      WHERE event_id = $1::uuid AND deleted = false
      ORDER BY created_at ASC;
    `;

    const rows = await executeQuery(query, [eventId]);
    return rows.map((row) => this._mapInviteRow(row));
  }

  async updateInvite({ id, role, status }) {
    const updates = [];
    const params = [id];
    let paramIndex = 2;

    if (role !== undefined) {
      updates.push(`role = $${paramIndex}::invite_role`);
      params.push(role);
      paramIndex += 1;
    }

    if (status !== undefined) {
      updates.push(`status = $${paramIndex}::invite_status`);
      params.push(status);
      paramIndex += 1;
    }

    if (updates.length === 0) return this.getInviteById(id);

    updates.push("updated_at = now()");

    const query = `
      UPDATE calendar_event_invites
      SET ${updates.join(", ")}
      WHERE id = $1::uuid AND deleted = false
      RETURNING
        id::text,
        event_id::text,
        user_id::text,
        email,
        role,
        status,
        external_guest_id,
        created_at,
        updated_at,
        deleted,
        deleted_at;
    `;

    const rows = await executeQuery(query, params);
    return rows.length ? this._mapInviteRow(rows[0]) : null;
  }

  async deleteInvite(id) {
    const query = `
      UPDATE calendar_event_invites
      SET deleted = true, deleted_at = now()
      WHERE id = $1::uuid AND deleted = false
      RETURNING id::text;
    `;
    const rows = await executeQuery(query, [id]);
    return rows.length > 0;
  }
}

module.exports = new EventInvitesRepository();
