const { executeQuery } = require("@/database/connection");

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * @param {unknown} value
 * @returns {boolean}
 */
function isUuidNoteId(value) {
  return typeof value === "string" && UUID_RE.test(value);
}

/**
 * Public note id: 12-char alphanumeric (text), same shape as projects.
 *
 * @param {unknown} value
 * @returns {boolean}
 */
function isPublicNoteId(value) {
  return (
    typeof value === "string" && value.length === 12 && !value.includes("-")
  );
}

/**
 * Builds a WHERE fragment: UUID column for internal id, text column for public id.
 *
 * @param {string} tableAlias
 * @param {number} paramIndex
 * @param {string} noteId
 * @returns {string}
 */
function buildNoteIdWhereClause(tableAlias, paramIndex, noteId) {
  if (isUuidNoteId(noteId)) {
    return `${tableAlias}.id = $${paramIndex}::uuid`;
  }
  return `${tableAlias}.public_note_id = $${paramIndex}`;
}

/**
 * @param {string[]} identifiers
 * @returns {{ uuidIds: string[], publicIds: string[] }}
 */
function splitNoteIdentifiers(identifiers) {
  const uuidIds = [];
  const publicIds = [];
  for (const id of identifiers) {
    if (isUuidNoteId(id)) {
      uuidIds.push(id);
    } else if (isPublicNoteId(id)) {
      publicIds.push(id);
    }
  }
  return { uuidIds, publicIds };
}

/**
 * @param {string[]} identifiers
 * @returns {{ sql: string, params: unknown[] }}
 */
function buildNotesBulkDeleteWhere(identifiers) {
  const { uuidIds, publicIds } = splitNoteIdentifiers(identifiers);
  const parts = [];
  const params = [];
  let paramIndex = 1;

  if (uuidIds.length > 0) {
    parts.push(`id = ANY($${paramIndex}::uuid[])`);
    params.push(uuidIds);
    paramIndex += 1;
  }
  if (publicIds.length > 0) {
    parts.push(`public_note_id = ANY($${paramIndex}::varchar[])`);
    params.push(publicIds);
  }

  if (parts.length === 0) {
    throw new Error("Nenhum identificador de nota válido recebido.");
  }

  return { sql: parts.join(" OR "), params };
}

/**
 * Resolves a note route/body identifier to the internal UUID string.
 *
 * @param {unknown} noteId
 * @returns {Promise<string|null>}
 */
async function resolveNoteIdToUuid(noteId) {
  if (noteId === undefined || noteId === null || noteId === "") {
    return null;
  }
  const id = String(noteId).trim();
  if (!id) return null;
  if (isUuidNoteId(id)) return id;
  if (!isPublicNoteId(id)) return null;

  const rows = await executeQuery(
    `
      SELECT id::text
      FROM notes
      WHERE public_note_id = $1 AND deleted = false
      LIMIT 1
    `,
    [id]
  );
  return rows[0]?.id ? String(rows[0].id) : null;
}

/**
 * Resolves mixed UUID / public_note_id identifiers to unique internal UUIDs.
 *
 * @param {unknown} identifiers
 * @returns {Promise<string[]>}
 */
async function resolveNoteIdsToUuids(identifiers) {
  if (!Array.isArray(identifiers) || identifiers.length === 0) {
    return [];
  }

  const { uuidIds, publicIds } = splitNoteIdentifiers(
    identifiers.map((v) => String(v).trim()).filter(Boolean)
  );
  const resolved = new Set(uuidIds);

  if (publicIds.length > 0) {
    const rows = await executeQuery(
      `
        SELECT id::text
        FROM notes
        WHERE public_note_id = ANY($1::varchar[])
          AND deleted = false
      `,
      [publicIds]
    );
    for (const row of rows) {
      if (row?.id) resolved.add(String(row.id));
    }
  }

  return [...resolved];
}

module.exports = {
  buildNoteIdWhereClause,
  buildNotesBulkDeleteWhere,
  isPublicNoteId,
  isUuidNoteId,
  resolveNoteIdToUuid,
  resolveNoteIdsToUuids,
  splitNoteIdentifiers,
};
