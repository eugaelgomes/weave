const BaseRepository = require("./base.repository");
const { NOTE_STATUS } = require("@/utils/patterns/product-patterns");
const { generatePublicId } = require("@/utils/generate-public-id");
const { enqueueNoteEmbeddingJob } = require("../../../services/queue/queue-controller");

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
    status = NOTE_STATUS.VISIBLE,
    projectId = null,
    priorityId = null,
    assignedTo = null
  ) {
    const query = `
      INSERT INTO notes (
        user_id,
        title,
        description,
        tags,
        status,
        project_id,
        properties,
        priority_id,
        public_note_id
      )
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
      generatePublicId(),
    ]);
    const createdNote = results[0];

    if (createdNote) {
      await enqueueNoteEmbeddingJob(createdNote.id).catch((err) => {
        console.error("[CreateNotesRepository] Failed to enqueue embedding job", err);
      });
    }

    return createdNote;
  }

  async createCompleteNote(
    userId,
    title,
    description,
    tags = [],
    initialBlockContent = "",
    status = NOTE_STATUS.VISIBLE,
    projectId = null
  ) {
    const query = `
      WITH new_note AS (
        INSERT INTO notes (
          user_id,
          title,
          description,
          tags,
          status,
          project_id,
          properties,
          public_note_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      )
      SELECT 
        new_note.id AS note_id,
        new_note.public_note_id,
        new_note.project_id,
        new_note.title,
        new_note.description,
        new_note.properties,
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
      generatePublicId(),
    ]);
    const createdNote = results[0];

    console.log("[CreateNotesRepository] Note created", { noteId: createdNote?.note_id });

    if (createdNote) {
      console.log("[CreateNotesRepository] Enqueueing embedding job for", createdNote.note_id);
      await enqueueNoteEmbeddingJob(createdNote.note_id).catch(err => {
        console.error("[CreateNotesRepository] Failed to enqueue embedding job", err);
      });
    }

    return createdNote;
  }
}

module.exports = new CreateNotesRepository();
