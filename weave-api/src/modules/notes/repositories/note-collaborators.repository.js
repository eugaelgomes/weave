const BaseRepository = require("./base.repository");
const { resolveNoteIdToUuid } = require("@/utils/note-id-lookup");

/**
 * Colaboradores em notas.
 */
class NoteCollaboratorsRepository extends BaseRepository {
  /**
   * @param {string} noteId
   * @returns {Promise<string|null>}
   */
  async _resolveInternalNoteId(noteId) {
    return resolveNoteIdToUuid(noteId);
  }

  async addCollaborator(noteId, userId) {
    const internalNoteId = await this._resolveInternalNoteId(noteId);
    if (!internalNoteId) return null;

    const checkQuery = `
      SELECT removed FROM note_collaborators
      WHERE note_id = $1::uuid AND user_id = $2::uuid
      LIMIT 1;
    `;
    const existing = await this.executeQuery(checkQuery, [
      internalNoteId,
      userId,
    ]);

    if (existing.length > 0) {
      if (existing[0].removed) {
        const reactivateQuery = `
          UPDATE note_collaborators
          SET removed = false, removed_at = NULL, removed_by = NULL, added_at = NOW()
          WHERE note_id = $1::uuid AND user_id = $2::uuid
          RETURNING *;
        `;
        const results = await this.executeQuery(reactivateQuery, [
          internalNoteId,
          userId,
        ]);
        return results[0];
      }
      return null;
    }

    const insertQuery = `
      INSERT INTO note_collaborators (note_id, user_id)
      VALUES ($1::uuid, $2::uuid)
      RETURNING *;
    `;
    const results = await this.executeQuery(insertQuery, [
      internalNoteId,
      userId,
    ]);
    return results[0];
  }

  /**
   * Remove um colaborador da nota
   * @param {string} noteId - ID da nota
   * @param {string} userId - ID do usuário colaborador
   * @returns {Object} - Resultado da operação
   */
  async removeCollaborator(noteId, userId) {
    const internalNoteId = await this._resolveInternalNoteId(noteId);
    if (!internalNoteId) return { rowCount: 0 };

    const query = `
      UPDATE note_collaborators 
      SET removed_at = NOW(), removed = true, removed_by = 'owner'
      WHERE note_id = $1::uuid AND user_id = $2::uuid AND removed = false;
    `;
    const count = await this.rowCount(query, [internalNoteId, userId]);
    return { rowCount: count };
  }

  /**
   * Recusa a colaboração de um usuário em uma nota
   * @param {string} noteId - ID da nota
   * @param {string} userId - ID do usuário colaborador
   * @returns {Object} - Objeto com rowCount para checar operação
   */
  async recuseCollaboration(noteId, userId) {
    const internalNoteId = await this._resolveInternalNoteId(noteId);
    if (!internalNoteId) return { rowCount: 0 };

    const query = `
    UPDATE note_collaborators
    SET removed_at = NOW(),
        removed = true,
        removed_by = 'itself'
    WHERE note_id = $1::uuid
      AND user_id = $2::uuid
      AND removed = false
      AND user_id <> (SELECT user_id FROM notes WHERE id = $1::uuid);
  `;
    const count = await this.rowCount(query, [internalNoteId, userId]);
    return { rowCount: count };
  }

  /**
   * Lista todos os colaboradores de uma nota
   * @param {string} noteId - ID da nota
   * @returns {Array} - Lista de colaboradores
   */
  async getCollaboratorsByNoteId(noteId) {
    const internalNoteId = await this._resolveInternalNoteId(noteId);
    if (!internalNoteId) return [];

    const query = `
    SELECT 
      nc.user_id::text,
      nc.added_at,
      u.username,
      u.email,
      u.avatar_url,
      nc.removed,
      nc.removed_by,
      nc.removed_at
    FROM note_collaborators nc
    INNER JOIN notes n ON nc.note_id = n.id
    INNER JOIN users u ON nc.user_id = u.user_id
    WHERE nc.note_id = $1::uuid
    ORDER BY nc.added_at ASC;
    `;
    const results = await this.executeQuery(query, [internalNoteId]);
    return results;
  }

  /**
   * Verifica se um usuário é colaborador de uma nota
   * @param {string} noteId - ID da nota
   * @param {string} userId - ID do usuário
   * @returns {boolean} - True se for colaborador
   */
  async isCollaborator(noteId, userId) {
    const internalNoteId = await resolveNoteIdToUuid(noteId);
    if (!internalNoteId) return false;

    const query = `
      SELECT 1 FROM note_collaborators
      WHERE note_id = $1::uuid AND user_id = $2::uuid AND removed = false
      LIMIT 1;
    `;
    const results = await this.executeQuery(query, [internalNoteId, userId]);
    return results.length > 0;
  }

  /**
   * Context Lookup: Get membership for multiple users in a note.
   * @param {string[]} userIds
   * @param {string} noteId
   * @returns {Promise<Array<{ user_id: string, role: string }>>}
   */
  async getCollaboratorsByUserIds(userIds, noteId) {
    if (!userIds || userIds.length === 0) return [];
    const internalNoteId = await this._resolveInternalNoteId(noteId);
    if (!internalNoteId) return [];

    const query = `
      SELECT user_id::text, 'COLLABORATOR' as role
      FROM note_collaborators
      WHERE note_id = $1::uuid
        AND user_id = ANY($2::uuid[])
        AND removed = false
    `;
    return await executeQuery(query, [internalNoteId, userIds]);
  }

  /**
   * E-mails de colaboradores ativos (para lembretes de prazo).
   *
   * @param {string} noteId
   * @returns {Promise<Array<{ email: string; name: string | null }>>}
   */
  async getActiveCollaboratorEmails(noteId) {
    const internalNoteId = await this._resolveInternalNoteId(noteId);
    if (!internalNoteId) return [];

    const query = `
      SELECT DISTINCT u.email, u.name
      FROM note_collaborators nc
      INNER JOIN users u ON nc.user_id = u.user_id
      WHERE nc.note_id = $1::uuid
        AND nc.removed = false
        AND u.email IS NOT NULL
        AND btrim(u.email) <> '';
    `;
    return await this.executeQuery(query, [internalNoteId]);
  }
}

module.exports = new NoteCollaboratorsRepository();
