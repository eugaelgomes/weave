/**
 * @module weave-engine/modules/core/tools/actions/note-comments.action
 * @description Implementation logic for the note-comments.action AI tool.
 */
const { pool } = require("../../services/database/postgres.client");

/**
 * Wraps a plain text string into a minimal TipTap-compatible JSONB document.
 * @param {string} text
 * @returns {object}
 */
function wrapTextAsDoc(text) {
  return {
    content: [
      {
        content: [{ text: String(text), type: "text" }],
        type: "paragraph",
      },
    ],
    type: "doc",
  };
}

/**
 * Checks if a user has access to a note (owner or collaborator).
 * Returns { noteId, orgId } if accessible, or null.
 * @param {object} pool
 * @param {string} noteId
 * @param {string} userId
 * @returns {Promise<{ noteId: string, orgId: string|null } | null>}
 */
async function _resolveNoteAccess(pool, noteId, userId) {
  const { rows } = await pool.query(
    `SELECT n.id::text, COALESCE(n.organization_id, p.organization_id)::text AS org_id
     FROM notes n
     LEFT JOIN projects p ON n.project_id = p.id AND p.deleted = false
     WHERE n.id = $1::uuid
       AND n.deleted = false
       AND (
         n.user_id = $2::uuid
         OR EXISTS (
           SELECT 1 FROM note_collaborators nc
           WHERE nc.note_id = n.id AND nc.user_id = $2::uuid
         )
       )
     LIMIT 1`,
    [noteId, userId]
  );
  return rows[0] || null;
}

/**
 * Lists comments for a note accessible by the user.
 * @param {object} args
 * @param {string} args.noteId
 * @param {string} args.userId - Injected via executionContext
 * @returns {Promise<object>}
 */
async function listNoteComments(args) {
  if (!args.userId) {
    return { error: "No userId provided in execution context." };
  }
  if (!args.noteId) {
    return { error: "noteId is required." };
  }

  try {
    const access = await _resolveNoteAccess(pool, args.noteId, args.userId);
    if (!access) {
      return {
        error: "Note not found or you don't have permission to view it.",
      };
    }

    const { rows } = await pool.query(
      `SELECT
        nc.id::text,
        nc.note_id::text,
        nc.user_id::text,
        nc.parent_id::text,
        nc.content,
        nc.created_at,
        nc.updated_at,
        u.name AS user_name,
        u.username AS user_username,
        u.avatar_url AS user_avatar_url
       FROM notes_comments nc
       INNER JOIN users u ON nc.user_id = u.user_id
       WHERE nc.note_id = $1::uuid
         AND nc.deleted = false
         AND nc.deleted_at IS NULL
       ORDER BY nc.created_at ASC`,
      [access.noteId]
    );

    return { comments: rows, count: rows.length };
  } catch (error) {
    return {
      error: "Database error listing comments: " + error.message,
    };
  }
}

/**
 * Creates a new comment on a note.
 * @param {object} args
 * @param {string} args.noteId
 * @param {string} args.text
 * @param {string} [args.parentId]
 * @param {string} args.userId - Injected via executionContext
 * @returns {Promise<object>}
 */
async function createNoteComment(args) {
  if (!args.userId) {
    return { error: "No userId provided in execution context." };
  }
  if (!args.noteId) {
    return { error: "noteId is required." };
  }
  if (!args.text || !String(args.text).trim()) {
    return { error: "text is required and cannot be empty." };
  }

  try {
    const access = await _resolveNoteAccess(pool, args.noteId, args.userId);
    if (!access) {
      return {
        error: "Note not found or you don't have permission to comment on it.",
      };
    }

    // Validate parent comment if provided
    if (args.parentId) {
      const { rows: parentRows } = await pool.query(
        `SELECT id FROM notes_comments
         WHERE id = $1::uuid AND note_id = $2::uuid AND deleted = false LIMIT 1`,
        [args.parentId, access.noteId]
      );
      if (parentRows.length === 0) {
        return { error: "Parent comment not found on this note." };
      }
    }

    const contentDoc = wrapTextAsDoc(args.text.trim());

    const { rows } = await pool.query(
      `INSERT INTO notes_comments (note_id, user_id, organization_id, content, files, parent_id)
       VALUES ($1::uuid, $2::uuid, $3::uuid, $4::jsonb, '[]'::jsonb, $5)
       RETURNING
         id::text,
         note_id::text,
         user_id::text,
         parent_id::text,
         content,
         created_at,
         updated_at`,
      [
        access.noteId,
        args.userId,
        access.orgId || null,
        JSON.stringify(contentDoc),
        args.parentId || null,
      ]
    );

    return { comment: rows[0], message: "Comment created successfully." };
  } catch (error) {
    return {
      error: "Database error creating comment: " + error.message,
    };
  }
}

/**
 * Updates the text content of a comment. Only the author can update.
 * @param {object} args
 * @param {string} args.noteId
 * @param {string} args.commentId
 * @param {string} args.text
 * @param {string} args.userId - Injected via executionContext
 * @returns {Promise<object>}
 */
async function updateNoteComment(args) {
  if (!args.userId) {
    return { error: "No userId provided in execution context." };
  }
  if (!args.noteId || !args.commentId) {
    return { error: "noteId and commentId are required." };
  }
  if (!args.text || !String(args.text).trim()) {
    return { error: "text is required and cannot be empty." };
  }

  try {
    const access = await _resolveNoteAccess(pool, args.noteId, args.userId);
    if (!access) {
      return {
        error: "Note not found or you don't have permission to access it.",
      };
    }

    const contentDoc = wrapTextAsDoc(args.text.trim());

    const { rows } = await pool.query(
      `UPDATE notes_comments
       SET content = $1::jsonb,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2::uuid
         AND note_id = $3::uuid
         AND user_id = $4::uuid
         AND deleted = false
         AND deleted_at IS NULL
       RETURNING
         id::text,
         note_id::text,
         user_id::text,
         content,
         updated_at`,
      [JSON.stringify(contentDoc), args.commentId, access.noteId, args.userId]
    );

    if (rows.length === 0) {
      return {
        error: "Comment not found, already deleted, or you are not the author.",
      };
    }

    return { comment: rows[0], message: "Comment updated successfully." };
  } catch (error) {
    return {
      error: "Database error updating comment: " + error.message,
    };
  }
}

/**
 * Soft-deletes a comment. Only the author can delete.
 * @param {object} args
 * @param {string} args.noteId
 * @param {string} args.commentId
 * @param {string} args.userId - Injected via executionContext
 * @returns {Promise<object>}
 */
async function deleteNoteComment(args) {
  if (!args.userId) {
    return { error: "No userId provided in execution context." };
  }
  if (!args.noteId || !args.commentId) {
    return { error: "noteId and commentId are required." };
  }

  try {
    const access = await _resolveNoteAccess(pool, args.noteId, args.userId);
    if (!access) {
      return {
        error: "Note not found or you don't have permission to access it.",
      };
    }

    const { rowCount } = await pool.query(
      `UPDATE notes_comments
       SET deleted = true,
           deleted_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1::uuid
         AND note_id = $2::uuid
         AND user_id = $3::uuid
         AND deleted = false
         AND deleted_at IS NULL`,
      [args.commentId, access.noteId, args.userId]
    );

    if (rowCount === 0) {
      return {
        error: "Comment not found, already deleted, or you are not the author.",
      };
    }

    return {
      commentId: args.commentId,
      message: "Comment deleted successfully.",
    };
  } catch (error) {
    return {
      error: "Database error deleting comment: " + error.message,
    };
  }
}

module.exports = {
  createNoteComment,
  deleteNoteComment,
  listNoteComments,
  updateNoteComment,
};
