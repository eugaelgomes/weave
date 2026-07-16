const { executeQuery } = require("@/database/connection");

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * @param {unknown} value
 * @returns {boolean}
 */
function isUuidProjectId(value) {
  return typeof value === "string" && UUID_RE.test(value);
}

/**
 * Public project id: 12-char alphanumeric (text).
 *
 * @param {unknown} value
 * @returns {boolean}
 */
function isPublicProjectId(value) {
  return (
    typeof value === "string" && value.length === 12 && !value.includes("-")
  );
}

/**
 * Resolves a project route/body identifier to the internal UUID string.
 *
 * @param {unknown} projectId
 * @returns {Promise<string|null>}
 */
async function resolveProjectIdToUuid(projectId) {
  if (projectId === undefined || projectId === null || projectId === "") {
    return null;
  }
  const id = String(projectId).trim();
  if (!id) return null;
  if (isUuidProjectId(id)) return id;
  if (!isPublicProjectId(id)) return null;

  const rows = await executeQuery(
    `
      SELECT id::text
      FROM projects
      WHERE public_project_id = $1 AND deleted = false
      LIMIT 1
    `,
    [id]
  );
  return rows[0]?.id ? String(rows[0].id) : null;
}

/**
 * @param {unknown} identifiers
 * @returns {Promise<string[]>}
 */
async function resolveProjectIdsToUuids(identifiers) {
  if (!Array.isArray(identifiers) || identifiers.length === 0) {
    return [];
  }

  const uuidIds = [];
  const publicIds = [];
  for (const raw of identifiers) {
    const id = String(raw).trim();
    if (!id) continue;
    if (isUuidProjectId(id)) uuidIds.push(id);
    else if (isPublicProjectId(id)) publicIds.push(id);
  }

  const resolved = new Set(uuidIds);
  if (publicIds.length > 0) {
    const rows = await executeQuery(
      `
        SELECT id::text
        FROM projects
        WHERE public_project_id = ANY($1::varchar[])
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
  isPublicProjectId,
  isUuidProjectId,
  resolveProjectIdsToUuids,
  resolveProjectIdToUuid,
};
