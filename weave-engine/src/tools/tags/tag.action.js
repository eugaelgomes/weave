const { pool } = require("../../services/database/postgres.client");

async function listTags(args) {
  if (!args.userId)
    return { error: "No userId provided in execution context." };

  try {
    let query = `
      SELECT id, name, color_hex, project_id, created_at
      FROM tags
      WHERE deleted = false AND user_id = $1::uuid
    `;
    const queryArgs = [args.userId];

    if (args.projectId) {
      query += ` AND project_id = $2::uuid`;
      queryArgs.push(args.projectId);
    } else if (args.organizationId) {
      query += ` AND organization_id = $2::uuid`;
      queryArgs.push(args.organizationId);
    }

    query += ` ORDER BY name ASC LIMIT 100`;

    const result = await pool.query(query, queryArgs);
    return {
      success: true,
      tags: result.rows,
    };
  } catch (error) {
    console.error("Error in listTags tool:", error);
    return { error: `Database error: ${error.message}` };
  }
}

async function createTag(args) {
  if (!args.userId)
    return { error: "No userId provided in execution context." };
  if (!args.organizationId)
    return { error: "No organizationId provided in execution context." };

  try {
    const query = `
      INSERT INTO tags (organization_id, user_id, project_id, name, color_hex)
      VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5)
      RETURNING id, name, color_hex, project_id
    `;
    const queryArgs = [
      args.organizationId,
      args.userId,
      args.projectId || null,
      args.name,
      args.colorHex || "#E2E8F0",
    ];

    const result = await pool.query(query, queryArgs);
    return {
      message: "Tag criada successfully.",
      success: true,
      tag: result.rows[0],
    };
  } catch (error) {
    console.error("Error in createTag tool:", error);
    return { error: `Database error: ${error.message}` };
  }
}

async function updateTag(args) {
  if (!args.userId)
    return { error: "No userId provided in execution context." };

  try {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (args.name) {
      fields.push(`name = $${paramIndex++}`);
      values.push(args.name);
    }

    if (args.colorHex) {
      fields.push(`color_hex = $${paramIndex++}`);
      values.push(args.colorHex);
    }

    if (fields.length === 0) {
      return { error: "No fields to update." };
    }

    fields.push(`updated_at = now()`);
    values.push(args.tagId);
    values.push(args.userId);

    const query = `
      UPDATE tags
      SET ${fields.join(", ")}
      WHERE id = $${paramIndex - 2}::uuid AND user_id = $${paramIndex - 1}::uuid AND deleted = false
      RETURNING id, name, color_hex
    `;

    const result = await pool.query(query, values);
    if (result.rowCount === 0) {
      return { error: "Tag not found ou você não tem permission to edit it." };
    }

    return {
      message: "Tag atualizada successfully.",
      success: true,
      tag: result.rows[0],
    };
  } catch (error) {
    console.error("Error in updateTag tool:", error);
    return { error: `Database error: ${error.message}` };
  }
}

async function deleteTag(args) {
  if (!args.userId)
    return { error: "No userId provided in execution context." };

  try {
    const query = `
      UPDATE tags
      SET deleted = true, deleted_at = now(), deleted_by = $1::uuid
      WHERE id = $2::uuid AND user_id = $1::uuid AND deleted = false
      RETURNING id
    `;
    const result = await pool.query(query, [args.userId, args.tagId]);

    if (result.rowCount === 0) {
      return {
        error: "Tag not found ou você não tem permission to delete it.",
      };
    }

    // Opcionalmente remover a tag de todas as notas, mas o sistema pode tratar soft deletes via código.
    // Para limpar o array tags nas notas:
    const updateNotesQuery = `
      UPDATE notes
      SET tags = array_remove(tags, $1::uuid)
      WHERE $1::uuid = ANY(tags) AND user_id = $2::uuid
    `;
    await pool.query(updateNotesQuery, [args.tagId, args.userId]);

    return {
      message: "Tag excluída successfully.",
      success: true,
    };
  } catch (error) {
    console.error("Error in deleteTag tool:", error);
    return { error: `Database error: ${error.message}` };
  }
}

async function assignTag(args) {
  if (!args.userId)
    return { error: "No userId provided in execution context." };

  try {
    // 1. Check if tag exists
    const tagQuery = `SELECT id FROM tags WHERE id = $1::uuid AND user_id = $2::uuid AND deleted = false`;
    const tagRes = await pool.query(tagQuery, [args.tagId, args.userId]);
    if (tagRes.rowCount === 0) {
      return { error: "Tag not found." };
    }

    // 2. Add tag to note
    const query = `
      UPDATE notes
      SET tags = array_append(array_remove(tags, $1::uuid), $1::uuid), updated_at = now()
      WHERE id = $2::uuid AND user_id = $3::uuid AND deleted = false
      RETURNING id, tags
    `;
    const result = await pool.query(query, [
      args.tagId,
      args.noteId,
      args.userId,
    ]);

    if (result.rowCount === 0) {
      return {
        error: "Note not found or you do not have permission to edit it.",
      };
    }

    return {
      message: "Tag vinculada à nota successfully.",
      success: true,
    };
  } catch (error) {
    console.error("Error in assignTag tool:", error);
    return { error: `Database error: ${error.message}` };
  }
}

async function removeTag(args) {
  if (!args.userId)
    return { error: "No userId provided in execution context." };

  try {
    const query = `
      UPDATE notes
      SET tags = array_remove(tags, $1::uuid), updated_at = now()
      WHERE id = $2::uuid AND user_id = $3::uuid AND deleted = false
      RETURNING id, tags
    `;
    const result = await pool.query(query, [
      args.tagId,
      args.noteId,
      args.userId,
    ]);

    if (result.rowCount === 0) {
      return {
        error: "Note not found or you do not have permission to edit it.",
      };
    }

    return {
      message: "Tag desvinculada da nota successfully.",
      success: true,
    };
  } catch (error) {
    console.error("Error in removeTag tool:", error);
    return { error: `Database error: ${error.message}` };
  }
}

module.exports = {
  assignTag,
  createTag,
  deleteTag,
  listTags,
  removeTag,
  updateTag,
};
