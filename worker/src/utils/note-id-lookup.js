const { executeQuery } = require("../database/connection");

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * @param {unknown} value
 * @returns {boolean}
 */
function isUuidNoteId(value) {
  return typeof value === "string" && UUID_RE.test(value);
}

/**
 * @param {unknown} value
 * @returns {boolean}
 */
function isPublicNoteId(value) {
  return typeof value === "string" && value.length === 12 && !value.includes("-");
}

/**
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

module.exports = {
  isPublicNoteId,
  isUuidNoteId,
  resolveNoteIdToUuid,
};
