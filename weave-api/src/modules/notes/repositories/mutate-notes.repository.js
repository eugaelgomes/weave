const BaseRepository = require("./base.repository");
const { enqueueNoteEmbeddingJob } = require("../../../services/queue/queue-controller");
const {
  buildNoteIdWhereClause,
  buildNotesBulkDeleteWhere,
} = require("@/utils/note-id-lookup");

/**
 * Atualização e exclusão lógica de notas.
 */
class MutateNotesRepository extends BaseRepository {
  async updateNoteById(noteId, updateData, baseRevision = null) {
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
      "parent_id",
      "properties",
    ];

    const updates = [];
    const values = [];
    let paramIndex = 1;

    allowedFields.forEach((field) => {
      if (updateData[field] !== undefined) {
        if (field === "properties") {
          updates.push(
            `properties = COALESCE(properties, '{}'::jsonb) || $${paramIndex}::jsonb`
          );
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
    updates.push("revision = revision + 1");

    values.push(noteId);
    if (baseRevision !== null && baseRevision !== undefined) {
      values.push(Number(baseRevision));
    }

    const noteIdWhere = buildNoteIdWhereClause("notes", paramIndex, noteId);
    const whereClause =
      baseRevision !== null && baseRevision !== undefined
        ? `${noteIdWhere} AND revision = $${paramIndex + 1}`
        : noteIdWhere;

    const query = `
      UPDATE notes
      SET ${updates.join(", ")}
      WHERE ${whereClause}
      RETURNING *;
    `;

    const results = await this.executeQuery(query, values);
    const updatedNote = results[0];

    console.log("[MutateNotesRepository] Note updated", {
      noteId: updatedNote?.id,
    });

    if (updatedNote) {
      console.log("[MutateNotesRepository] Enqueueing embedding job for", updatedNote.id);
      await enqueueNoteEmbeddingJob(updatedNote.id).catch(err => {
        console.error("[MutateNotesRepository] Failed to enqueue embedding job", err);
      });
    }

    return updatedNote;
  }

  async bumpRevisionById(noteId, baseRevision = null) {
    const values = [noteId];
    let revisionFilter = "";
    let revisionParamIndex = 2;
    if (baseRevision !== null && baseRevision !== undefined) {
      values.push(Number(baseRevision));
      revisionFilter = `AND revision = $${revisionParamIndex}`;
      revisionParamIndex += 1;
    }

    const noteIdWhere = buildNoteIdWhereClause("notes", 1, noteId);

    const query = `
      UPDATE notes
      SET revision = revision + 1, updated_at = NOW()
      WHERE ${noteIdWhere}
      ${revisionFilter}
      RETURNING id, revision, updated_at
    `;
    const results = await this.executeQuery(query, values);
    return results[0] || null;
  }

  async deleteNoteById(noteIds) {
    const idsArray = Array.isArray(noteIds) ? noteIds : [noteIds];
    const { sql: whereSql, params } = buildNotesBulkDeleteWhere(idsArray);

    const query = `
    UPDATE notes
    SET deleted = true
    WHERE ${whereSql};
  `;

    const result = await this.executeQuery(query, params);

    if (result.rowCount === 0) {
      throw new Error("Nenhuma nota encontrada para deleção.");
    }

    return result.rowCount;
  }
}

module.exports = new MutateNotesRepository();
