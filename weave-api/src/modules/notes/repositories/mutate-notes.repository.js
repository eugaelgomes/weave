const BaseRepository = require("./base.repository");
const { enqueueNoteEmbeddingJob } = require("../../../services/queue/queue-controller");

/**
 * Atualização e exclusão lógica de notas.
 */
class MutateNotesRepository extends BaseRepository {
  async updateNoteById(noteId, updateData) {
    const allowedFields = [
      "title",
      "description",
      "tags",
      "status",
      "priority_id",
      "due_date",
      "deleted_by",
      "deleted",
      "project_id",
      "project_stage_id",
      "properties",
      "document",
    ];

    const updates = [];
    const values = [];
    let paramIndex = 1;

    allowedFields.forEach((field) => {
      if (updateData[field] !== undefined) {
        if (field === "properties" || field === "document") {
          // Merge parcial: atualiza apenas as chaves enviadas dentro de properties
          if (field === "properties") {
            updates.push(
              `properties = COALESCE(properties, '{}'::jsonb) || $${paramIndex}::jsonb`
            );
          } else {
            updates.push(`document = $${paramIndex}::jsonb`);
          }
          values.push(JSON.stringify(updateData[field]));
        } else {
          updates.push(`${field} = $${paramIndex}`);
          values.push(updateData[field]);
        }
        paramIndex++;
      }
    });

    if (updates.length === 0) {
      return null;
    }

    updates.push("updated_at = NOW()");

    values.push(noteId);

    const query = `
      UPDATE notes
      SET ${updates.join(", ")}
      WHERE id = $${paramIndex}
      RETURNING *;
    `;

    const results = await this.executeQuery(query, values);
    const updatedNote = results[0];

    if (updatedNote) {
      await enqueueNoteEmbeddingJob(updatedNote.id).catch(err => {
        console.error("[MutateNotesRepository] Failed to enqueue embedding job", err);
      });
    }

    return updatedNote;
  }

  async deleteNoteById(noteIds) {
    const idsArray = Array.isArray(noteIds) ? noteIds : [noteIds];

    const query = `
    UPDATE notes
    SET deleted = true
    WHERE id = ANY($1);
  `;

    const result = await this.executeQuery(query, [idsArray]);

    if (result.rowCount === 0) {
      throw new Error("Nenhuma nota encontrada para deleção.");
    }

    return result.rowCount;
  }
}

module.exports = new MutateNotesRepository();
