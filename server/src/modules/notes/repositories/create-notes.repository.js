const BaseRepository = require("./base.repository");

const DEFAULT_NOTE_PROPERTIES = {
  icon: { path: "", name: "", type: "" },
  urls: [],
  color: "",
  files: [],
  banner: { path: "", name: "", type: "" },
  relations: [],
};

/**
 * Criação de notas (query simples e nota completa com bloco).
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
    assignedTo = null
  ) {
    const query = `
      INSERT INTO notes (user_id, title, description, tags, status, project_id, properties, priority_id, assigned_to)
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
      assignedTo,
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
    projectId = null
  ) {
    const query = `
      WITH new_note AS (
        INSERT INTO notes (user_id, title, description, tags, status, project_id, properties)
        VALUES ($1, $2, $3, $4, $5, $6, $8)
        RETURNING *
      ),
      new_block AS (
        INSERT INTO blocks (note_id, user_id, text)
        SELECT id, $1, $7
        FROM new_note
        RETURNING *
      )
      SELECT 
        -- Seleciona colunas da nota criada
        new_note.id AS note_id,
        new_note.project_id,
        new_note.title,
        new_note.description,
        new_note.properties,
        new_note.tags,
        new_note.status,
        new_note.created_at AS note_created_at,
        new_note.updated_at AS note_updated_at,
        new_note.user_id,
        
        -- Seleciona colunas do bloco criado
        new_block.id AS block_id,
        new_block.text AS block_text,
        new_block.type AS block_type,
        new_block.properties AS block_properties,
        new_block.done AS block_done,
        new_block.position AS block_position,
        new_block.created_at AS block_created_at,
        new_block.updated_at AS block_updated_at,
        
        -- Dados do usuário
        u.name AS user_name,
        u.username AS user_username,
        u.email AS user_email,
        u.avatar_url AS user_avatar_url
      FROM new_note, new_block
      INNER JOIN users u ON new_note.user_id = u.user_id;
    `;
    const results = await this.executeQuery(query, [
      userId,
      title,
      description,
      tags,
      status,
      projectId,
      initialBlockContent,
      JSON.stringify(DEFAULT_NOTE_PROPERTIES),
    ]);
    return results[0];
  }
}

module.exports = new CreateNotesRepository();
