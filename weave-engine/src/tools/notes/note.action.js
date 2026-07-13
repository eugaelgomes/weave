/**
 * @module weave-engine/modules/core/tools/actions/note.action
 * @description Implementation logic for the note.action AI tool.
 */
const { pool } = require("../../services/database/postgres.client");

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

/**
 * Fetches the exact content blocks of a note accessible by the user.
 * @param {object} args
 * @param {string} args.noteId - UUID or public_note_id
 * @param {string} args.userId - Injected securely via executionContext
 * @returns {Promise<object>}
 */
async function readNoteContent(args) {
  if (!args.userId) {
    return { error: "No userId provided in execution context." };
  }
  if (!args.noteId) {
    return { error: "noteId is required." };
  }

  try {
    const idParam = args.noteId;
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        idParam
      );

    const whereClause = isUuid ? "n.id = $1::uuid" : "n.public_note_id = $1";

    const noteRes = await pool.query(
      `SELECT n.id
       FROM notes n
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

    if (noteRes.rows.length === 0) {
      return {
        error: "Note not found or you don't have permission to view it.",
      };
    }

    const internalNoteId = noteRes.rows[0].id;

    const blocksRes = await pool.query(
      `SELECT
        id::text,
        COALESCE(parent_id::text, '__root__') AS parent_id,
        type,
        properties,
        position
      FROM note_blocks
      WHERE note_id = $1 AND deleted = false
      ORDER BY position ASC`,
      [internalNoteId]
    );

    const rows = blocksRes.rows;

    const byParent = {};
    for (const r of rows) {
      const pid = r.parent_id;
      if (!byParent[pid]) byParent[pid] = [];
      byParent[pid].push(r);
    }

    const walk = (parentKey, depth) => {
      const siblings = byParent[parentKey] || [];
      return siblings.map((r) => {
        const props =
          r.properties && typeof r.properties === "object" ? r.properties : {};
        const text = typeof props.text === "string" ? props.text : "";
        const node = {
          id: String(r.id),
          properties: props,
          text,
          type: r.type,
        };
        if (r.type === "todo") {
          node.done = props.attrs?.checked === true;
        }
        if (r.type === "list") {
          node.children = walk(String(r.id), depth + 1);
        } else {
          node.children = [];
        }
        return node;
      });
    };

    const tree = walk("__root__", 0);

    return {
      blocks: tree,
      raw_blocks_if_empty: tree.length === 0 ? rows : undefined,
    };
  } catch (error) {
    return {
      error: "Database error fetching note content: " + error.message,
    };
  }
}

/**
 * Lists the user's notes with structured filtering and sorting.
 * @param {object} args
 * @returns {Promise<object>}
 */
async function listMyNotes(args) {
  if (!args.userId) {
    return { error: "No userId provided in execution context." };
  }

  try {
    const limit = Math.min(Math.max(1, args.limit || 10), 50);

    const allowedSortFields = ["updated_at", "created_at", "due_date"];
    const sortField = allowedSortFields.includes(args.orderBy)
      ? args.orderBy
      : "updated_at";

    const sortDir = args.orderDirection === "asc" ? "ASC" : "DESC";

    const queryParams = [args.userId, limit];
    let whereClause = `
      n.deleted = false
      AND (
        n.user_id = $1::uuid
        OR EXISTS (
          SELECT 1 FROM note_collaborators nc2
          WHERE nc2.note_id = n.id AND nc2.user_id = $1::uuid
        )
      )
    `;

    if (args.status) {
      queryParams.push(args.status);
      whereClause += ` AND n.status = $${queryParams.length}`;
    }

    if (args.projectId) {
      const pId = args.projectId;
      const isUuid =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          pId
        );
      queryParams.push(pId);
      if (isUuid) {
        whereClause += ` AND n.project_id = $${queryParams.length}::uuid`;
      } else {
        whereClause += ` AND p.public_project_id = $${queryParams.length}`;
      }
    }

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
        n.project_id::text,
        p.title AS project_name,
        n.project_stage_id::text,
        pst.name AS project_stage_name,
        tp.name AS priority_name
       FROM notes n
       LEFT JOIN projects p ON n.project_id = p.id AND p.deleted = false
       LEFT JOIN project_stages pst ON pst.id = n.project_stage_id AND pst.project_id = n.project_id
       LEFT JOIN task_priorities tp ON n.priority_id = tp.id AND tp.deleted = false
       WHERE ${whereClause}
       ORDER BY n.${sortField} ${sortDir} NULLS LAST
       LIMIT $2`,
      queryParams
    );

    if (rows.length === 0) {
      return { message: "No notes found matching the criteria." };
    }

    return { notes: rows };
  } catch (error) {
    return {
      error: "Database error listing notes: " + error.message,
    };
  }
}

async function resolveNoteId(noteId, userId) {
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      noteId
    );
  const whereClause = isUuid ? "id = $1::uuid" : "public_note_id = $1";
  const res = await pool.query(
    `
    SELECT id FROM notes 
    WHERE ${whereClause} AND deleted = false
    AND (
      user_id = $2::uuid OR EXISTS (
        SELECT 1 FROM note_collaborators nc WHERE nc.note_id = notes.id AND nc.user_id = $2::uuid
      )
    )
  `,
    [noteId, userId]
  );
  return res.rows[0]?.id;
}

function genId() {
  return "note_" + Math.random().toString(36).substr(2, 9);
}

async function createCompleteNote(args) {
  if (!args.userId) return { error: "No userId provided." };
  try {
    const publicId = genId();
    const result = await pool.query(
      `
      INSERT INTO notes (organization_id, user_id, title, description, tags, status, project_id, public_note_id, properties)
      VALUES ($1::uuid, $2::uuid, $3, $4, $5::uuid[], $6, $7::uuid, $8, '{}'::jsonb)
      RETURNING id, public_note_id
    `,
      [
        args.organizationId || null,
        args.userId,
        args.title,
        args.description || null,
        args.tags || [],
        args.status || "VISIBLE",
        args.project_id || null,
        publicId,
      ]
    );
    const note = result.rows[0];
    if (args.initialBlockContent) {
      await pool.query(
        `
        INSERT INTO note_blocks (note_id, type, properties, position, version, created_by)
        VALUES ($1::uuid, 'paragraph', $2::jsonb, 0, 1, $3::uuid)
      `,
        [
          note.id,
          JSON.stringify({ text: args.initialBlockContent }),
          args.userId,
        ]
      );
    }
    return { internalId: note.id, noteId: note.public_note_id, success: true };
  } catch (error) {
    return { error: error.message };
  }
}

async function updateNote(args) {
  if (!args.userId) return { error: "No userId provided." };
  try {
    const internalId = await resolveNoteId(args.noteId, args.userId);
    if (!internalId) return { error: "Note not found or permission denied." };

    const updates = [];
    const queryArgs = [internalId];
    let idx = 2;
    if (args.title !== undefined) {
      updates.push(`title = $${idx++}`);
      queryArgs.push(args.title);
    }
    if (args.description !== undefined) {
      updates.push(`description = $${idx++}`);
      queryArgs.push(args.description);
    }
    if (args.tags !== undefined) {
      updates.push(`tags = $${idx++}::uuid[]`);
      queryArgs.push(args.tags);
    }
    if (args.status !== undefined) {
      updates.push(`status = $${idx++}`);
      queryArgs.push(args.status);
    }
    if (args.project_id !== undefined) {
      updates.push(`project_id = $${idx++}::uuid`);
      queryArgs.push(args.project_id);
    }
    if (args.deleted !== undefined) {
      updates.push(`deleted = $${idx++}`);
      queryArgs.push(args.deleted);
    }

    if (updates.length === 0)
      return { message: "No changes requested.", success: true };
    updates.push(`updated_at = NOW()`, `revision = revision + 1`);

    await pool.query(
      `UPDATE notes SET ${updates.join(", ")} WHERE id = $1::uuid`,
      queryArgs
    );
    return { message: "Note updated.", success: true };
  } catch (error) {
    return { error: error.message };
  }
}

async function createNoteBlock(args) {
  if (!args.userId) return { error: "No userId provided." };
  try {
    const internalId = await resolveNoteId(args.noteId, args.userId);
    if (!internalId) return { error: "Note not found or permission denied." };

    const type = args.type || "paragraph";
    const props = args.properties || {};
    if (args.text !== undefined) props.text = args.text;

    const resPos = await pool.query(
      `SELECT COALESCE(MAX(position), -1) + 1 AS pos FROM note_blocks WHERE note_id = $1::uuid AND deleted = false AND parent_id ${args.parent_id ? "= $2::uuid" : "IS NULL"}`,
      args.parent_id ? [internalId, args.parent_id] : [internalId]
    );
    const pos = resPos.rows[0].pos;

    const res = await pool.query(
      `
      INSERT INTO note_blocks (note_id, parent_id, type, properties, position, version, created_by)
      VALUES ($1::uuid, $2::uuid, $3, $4::jsonb, $5, 1, $6::uuid) RETURNING id
    `,
      [
        internalId,
        args.parent_id || null,
        type,
        JSON.stringify(props),
        pos,
        args.userId,
      ]
    );

    return { blockId: res.rows[0].id, success: true };
  } catch (error) {
    return { error: error.message };
  }
}

async function updateNoteBlock(args) {
  if (!args.userId) return { error: "No userId provided." };
  try {
    const internalId = await resolveNoteId(args.noteId, args.userId);
    if (!internalId) return { error: "Note not found or permission denied." };

    const blockRes = await pool.query(
      `SELECT properties FROM note_blocks WHERE id = $1::uuid AND note_id = $2::uuid AND deleted = false`,
      [args.blockId, internalId]
    );
    if (blockRes.rows.length === 0) return { error: "Block not found." };

    let props = blockRes.rows[0].properties || {};
    if (args.properties) props = { ...props, ...args.properties };
    if (args.text !== undefined) props.text = args.text;

    const updates = [
      `properties = $3::jsonb`,
      `version = version + 1`,
      `updated_at = NOW()`,
    ];
    const queryArgs = [args.blockId, internalId, JSON.stringify(props)];
    if (args.type !== undefined) {
      updates.push(`type = $4`);
      queryArgs.push(args.type);
    }

    await pool.query(
      `UPDATE note_blocks SET ${updates.join(", ")} WHERE id = $1::uuid AND note_id = $2::uuid`,
      queryArgs
    );
    return { success: true };
  } catch (error) {
    return { error: error.message };
  }
}

async function deleteNoteBlock(args) {
  if (!args.userId) return { error: "No userId provided." };
  try {
    const internalId = await resolveNoteId(args.noteId, args.userId);
    if (!internalId) return { error: "Note not found or permission denied." };
    await pool.query(
      `UPDATE note_blocks SET deleted = true WHERE id = $1::uuid AND note_id = $2::uuid`,
      [args.blockId, internalId]
    );
    return { success: true };
  } catch (error) {
    return { error: error.message };
  }
}

async function reorderNoteBlocks(args) {
  if (!args.userId) return { error: "No userId provided." };
  try {
    const internalId = await resolveNoteId(args.noteId, args.userId);
    if (!internalId) return { error: "Note not found." };
    for (let i = 0; i < args.ordered_ids.length; i++) {
      await pool.query(
        `
        UPDATE note_blocks SET position = $1, parent_id = $2::uuid, version = version + 1
        WHERE id = $3::uuid AND note_id = $4::uuid AND deleted = false
      `,
        [i, args.parent_id || null, args.ordered_ids[i], internalId]
      );
    }
    return { success: true };
  } catch (error) {
    return { error: error.message };
  }
}

async function getNoteCollaborators(args) {
  if (!args.userId) return { error: "No userId provided." };
  try {
    const internalId = await resolveNoteId(args.noteId, args.userId);
    if (!internalId) return { error: "Note not found." };
    const res = await pool.query(
      `
      SELECT u.user_id as id, u.name, u.username, u.email FROM note_collaborators nc
      JOIN users u ON nc.user_id = u.user_id WHERE nc.note_id = $1::uuid
    `,
      [internalId]
    );
    return { collaborators: res.rows };
  } catch (error) {
    return { error: error.message };
  }
}

async function addNoteCollaborator(args) {
  if (!args.userId) return { error: "No userId provided." };
  try {
    const internalId = await resolveNoteId(args.noteId, args.userId);
    if (!internalId) return { error: "Note not found." };
    await pool.query(
      `
      INSERT INTO note_collaborators (note_id, user_id) VALUES ($1::uuid, $2::uuid) ON CONFLICT DO NOTHING
    `,
      [internalId, args.collaboratorUserId]
    );
    return { success: true };
  } catch (error) {
    return { error: error.message };
  }
}

async function createTaskInStage(args) {
  if (!args.userId) return { error: "No userId provided." };
  try {
    const publicId = genId();
    const res = await pool.query(
      `
      INSERT INTO notes (organization_id, user_id, title, description, project_id, project_stage_id, priority_id, due_date, public_note_id, status, properties)
      VALUES ($1::uuid, $2::uuid, $3, $4, $5::uuid, $6::uuid, $7::uuid, $8, $9, 'VISIBLE', '{}'::jsonb)
      RETURNING id, public_note_id
    `,
      [
        args.organizationId || null,
        args.userId,
        args.title,
        args.description || null,
        args.project_id,
        args.project_stage_id || null,
        args.priority_id || null,
        args.due_date || null,
        publicId,
      ]
    );
    const note = res.rows[0];
    if (args.initialBlockContent) {
      await pool.query(
        `
        INSERT INTO note_blocks (note_id, type, properties, position, version, created_by)
        VALUES ($1::uuid, 'paragraph', $2::jsonb, 0, 1, $3::uuid)
      `,
        [
          note.id,
          JSON.stringify({ text: args.initialBlockContent }),
          args.userId,
        ]
      );
    }
    return { internalId: note.id, success: true, taskId: note.public_note_id };
  } catch (error) {
    return { error: error.message };
  }
}

async function updateTaskInProject(args) {
  if (!args.userId) return { error: "No userId provided." };
  try {
    const internalId = await resolveNoteId(args.noteId, args.userId);
    if (!internalId) return { error: "Note not found." };
    const updates = [];
    const queryArgs = [internalId];
    let idx = 2;
    if (args.title !== undefined) {
      updates.push(`title = $${idx++}`);
      queryArgs.push(args.title);
    }
    if (args.description !== undefined) {
      updates.push(`description = $${idx++}`);
      queryArgs.push(args.description);
    }
    if (args.project_id !== undefined) {
      updates.push(`project_id = $${idx++}::uuid`);
      queryArgs.push(args.project_id);
    }
    if (args.project_stage_id !== undefined) {
      updates.push(`project_stage_id = $${idx++}::uuid`);
      queryArgs.push(args.project_stage_id);
    }
    if (args.priority_id !== undefined) {
      updates.push(`priority_id = $${idx++}::uuid`);
      queryArgs.push(args.priority_id);
    }
    if (args.due_date !== undefined) {
      updates.push(`due_date = $${idx++}`);
      queryArgs.push(args.due_date);
    }
    if (args.status !== undefined) {
      updates.push(`status = $${idx++}`);
      queryArgs.push(args.status);
    }
    if (updates.length === 0) return { success: true };
    updates.push(`updated_at = NOW()`, `revision = revision + 1`);
    await pool.query(
      `UPDATE notes SET ${updates.join(", ")} WHERE id = $1::uuid`,
      queryArgs
    );
    return { success: true };
  } catch (error) {
    return { error: error.message };
  }
}

module.exports = {
  addNoteCollaborator,
  createCompleteNote,
  createNoteBlock,
  createTaskInStage,
  deleteNoteBlock,
  getNoteCollaborators,
  getNoteDetails,
  listMyNotes,
  readNoteContent,
  reorderNoteBlocks,
  updateNote,
  updateNoteBlock,
  updateTaskInProject,
};
