/**
 * @module weave-engine/modules/core/tools/actions/note.action
 * @description Implementation logic for the note.action AI tool.
 */
const { pool } = require("../../../../services/postgres.client");

/**
 * Fetches the header/metadata of a note accessible by the user.
 * Does NOT include content blocks for performance reasons.
 * @param {object} args
 * @param {string} args.noteId - UUID or public_note_id
 * @param {string} args.userId - Injected securely via executionContext
 * @returns {Promise<object>}
 */
async function getNoteDetails(args) {
  if (!args.userId) {
    return { error: "No userId provided in execution context." };
  }
  if (!args.noteId) {
    return { error: "noteId is required." };
  }

  try {
    // Support both internal UUID and public_note_id
    const idParam = args.noteId;
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        idParam
      );

    const whereClause = isUuid ? "n.id = $1::uuid" : "n.public_note_id = $1";

    const { rows } = await pool.query(
      `SELECT
        n.id::text,
        n.public_note_id,
        n.title,
        n.description,
        n.status,
        n.due_date,
        n.created_at,
        n.updated_at,
        n.revision,
        n.user_id::text,
        u.name AS author_name,
        u.username AS author_username,
        u.avatar_url AS author_avatar_url,
        n.project_id::text,
        p.title AS project_name,
        n.project_stage_id::text,
        pst.name AS project_stage_name,
        tp.id::text AS priority_id,
        tp.name AS priority_name,
        tp.color_hex AS priority_color,
        COALESCE(
          (SELECT json_agg(
            json_build_object('id', t.id::text, 'name', t.name, 'color', t.color_hex)
          )
          FROM tags t WHERE t.id = ANY(n.tags)),
          '[]'::json
        ) AS resolved_tags,
        COALESCE(
          (SELECT json_agg(
            json_build_object(
              'id', c.user_id::text,
              'name', c.name,
              'username', c.username,
              'avatar_url', c.avatar_url
            )
          )
          FROM note_collaborators nc
          INNER JOIN users c ON nc.user_id = c.user_id
          WHERE nc.note_id = n.id),
          '[]'::json
        ) AS collaborators,
        n.properties->'files' AS files,
        n.properties->'relations' AS relations,
        n.properties->'urls' AS urls
       FROM notes n
       INNER JOIN users u ON n.user_id = u.user_id
       LEFT JOIN projects p ON n.project_id = p.id AND p.deleted = false
       LEFT JOIN project_stages pst
         ON pst.id = n.project_stage_id AND pst.project_id = n.project_id
       LEFT JOIN task_priorities tp ON n.priority_id = tp.id AND tp.deleted = false
       WHERE ${whereClause}
         AND n.deleted = false
         AND (
           n.user_id = $2::uuid
           OR EXISTS (
             SELECT 1 FROM note_collaborators nc2
             WHERE nc2.note_id = n.id AND nc2.user_id = $2::uuid
           )
         )
       LIMIT 1`,
      [idParam, args.userId]
    );

    if (rows.length === 0) {
      return {
        error: "Note not found or you don't have permission to view it.",
      };
    }

    return { note: rows[0] };
  } catch (error) {
    return {
      error: "Database error fetching note details: " + error.message,
    };
  }
}

module.exports = {
  getNoteDetails,
};
