const BaseRepository = require("./base.repository");

/**
 * Comentários em notas (`notes_comments`).
 */
class NotesCommentsRepository extends BaseRepository {
  /**
   * @param {string} commentId
   * @returns {Promise<Record<string, unknown> | null>}
   */
  async getById(commentId) {
    const query = `
      SELECT 
        nc.id::text,
        nc.note_id::text,
        nc.user_id::text,
        nc.org_id::text,
        nc.content,
        nc.files,
        nc.parent_id::text,
        nc.created_at,
        nc.updated_at,
        nc.deleted,
        nc.deleted_at
      FROM notes_comments nc
      WHERE nc.id = $1
        AND nc.deleted = false
        AND nc.deleted_at IS NULL
    `;
    const rows = await this.executeQuery(query, [commentId]);
    return rows[0] || null;
  }

  /**
   * @param {string} noteId
   * @returns {Promise<Record<string, unknown>[]>}
   */
  async listByNoteId(noteId) {
    const query = `
      SELECT 
        nc.id::text,
        nc.note_id::text,
        nc.user_id::text,
        nc.org_id::text,
        nc.content,
        nc.files,
        nc.parent_id::text,
        nc.created_at,
        nc.updated_at,
        u.name AS user_name,
        u.username AS user_username,
        u.avatar_url AS user_avatar_url
      FROM notes_comments nc
      INNER JOIN users u ON nc.user_id = u.user_id
      WHERE nc.note_id = $1
        AND nc.deleted = false
        AND nc.deleted_at IS NULL
      ORDER BY nc.created_at ASC
    `;
    return await this.executeQuery(query, [noteId]);
  }

  /**
   * @param {Object} data
   * @param {string} data.noteId
   * @param {string} data.userId
   * @param {string | null} data.orgId
   * @param {Record<string, unknown>} data.content
   * @param {unknown[]} data.files
   * @param {string | null} data.parentId
   * @returns {Promise<Record<string, unknown>>}
   */
  async create(data) {
    const { noteId, userId, orgId, content, files, parentId } = data;
    const query = `
      INSERT INTO notes_comments (
        note_id,
        user_id,
        org_id,
        content,
        files,
        parent_id
      )
      VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6)
      RETURNING
        id::text,
        note_id::text,
        user_id::text,
        org_id::text,
        content,
        files,
        parent_id::text,
        created_at,
        updated_at
    `;
    const rows = await this.executeQuery(query, [
      noteId,
      userId,
      orgId || null,
      JSON.stringify(content),
      JSON.stringify(files),
      parentId || null,
    ]);
    return rows[0];
  }

  /**
   * @param {string} commentId
   * @param {string} userId
   * @param {Record<string, unknown>} patch
   * @returns {Promise<Record<string, unknown> | null>}
   */
  async update(commentId, userId, patch) {
    const sets = [];
    const values = [];
    let i = 1;

    if (patch.content !== undefined) {
      sets.push(`content = $${i++}::jsonb`);
      values.push(JSON.stringify(patch.content));
    }
    if (patch.files !== undefined) {
      sets.push(`files = $${i++}::jsonb`);
      values.push(JSON.stringify(patch.files));
    }

    if (sets.length === 0) {
      return this.getById(commentId);
    }

    sets.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(commentId, userId);

    const query = `
      UPDATE notes_comments
      SET ${sets.join(", ")}
      WHERE id = $${i++}
        AND user_id = $${i++}
        AND deleted = false
        AND deleted_at IS NULL
      RETURNING
        id::text,
        note_id::text,
        user_id::text,
        org_id::text,
        content,
        files,
        parent_id::text,
        created_at,
        updated_at
    `;
    const rows = await this.executeQuery(query, values);
    return rows[0] || null;
  }

  /**
   * @param {string} commentId
   * @param {string} userId
   * @returns {Promise<boolean>}
   */
  async softDelete(commentId, userId) {
    const query = `
      UPDATE notes_comments
      SET
        deleted = true,
        deleted_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
        AND user_id = $2
        AND deleted = false
        AND deleted_at IS NULL
    `;
    const n = await this.rowCount(query, [commentId, userId]);
    return n > 0;
  }
}

module.exports = new NotesCommentsRepository();
