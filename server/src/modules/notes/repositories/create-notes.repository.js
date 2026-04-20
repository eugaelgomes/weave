const BaseRepository = require("./base.repository");
const { cloneDefaultNoteDocumentState } = require("../document-normalizer");

const DEFAULT_NOTE_PROPERTIES = {
  icon: { path: "", name: "", type: "" },
  urls: [],
  color: "",
  files: [],
  banner: { path: "", name: "", type: "" },
  relations: [],
};

/**
 * Criação de notas.
 */
class CreateNotesRepository extends BaseRepository {
  async createNotesQuery(
    userId,
    title,
    content,
    tags = [],
    status = "visible",
    projectId = null,
    priorityId = null,
    assignedTo = null,
    noteDocument = null
  ) {
    const persistedDocument = noteDocument || cloneDefaultNoteDocumentState();

    const query = `
      INSERT INTO notes (user_id, title, description, tags, status, project_id, properties, priority_id, document)
      VALUES ($1, $2, $3, $4::uuid[], $5, $6, $7, $8, $9)
      RETURNING *; 
    `;
    const results = await this.executeQuery(query, [
      userId,
      title,
      content,
      tags,
      status,
      projectId,
      JSON.stringify(DEFAULT_NOTE_PROPERTIES),
      priorityId,
      JSON.stringify(persistedDocument),
    ]);
    return results[0];
  }

  async createCompleteNote(
    userId,
    title,
    description,
    tags = [],
    initialBlockContent = "",
    status = "visible",
    projectId = null,
    noteDocument = null
  ) {
    const persistedDocument = noteDocument || cloneDefaultNoteDocumentState();

    const query = `
      WITH new_note AS (
        INSERT INTO notes (user_id, title, description, tags, status, project_id, properties, document)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      )
      SELECT 
        new_note.id AS note_id,
        new_note.project_id,
        new_note.title,
        new_note.description,
        new_note.properties,
        new_note.document,
        new_note.tags,
        new_note.status,
        new_note.created_at AS note_created_at,
        new_note.updated_at AS note_updated_at,
        new_note.user_id,

        u.name AS user_name,
        u.username AS user_username,
        u.email AS user_email,
        u.avatar_url AS user_avatar_url
      FROM new_note
      INNER JOIN users u ON new_note.user_id = u.user_id
      LIMIT 1;
    `;
    const results = await this.executeQuery(query, [
      userId,
      title,
      description,
      tags,
      status,
      projectId,
      JSON.stringify(DEFAULT_NOTE_PROPERTIES),
      JSON.stringify(persistedDocument),
    ]);
    return results[0];
  }
}

module.exports = new CreateNotesRepository();
