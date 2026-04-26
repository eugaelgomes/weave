const { pool } = require("../../services/postgres.client");

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * @param {unknown} value
 * @returns {string[]}
 */
function normalizeUuidList(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  const uniqueValues = new Set();
  for (const item of value) {
    if (typeof item !== "string") {
      continue;
    }
    const normalized = item.trim();
    if (!UUID_REGEX.test(normalized)) {
      continue;
    }
    uniqueValues.add(normalized);
  }

  return [...uniqueValues];
}

/**
 * @param {unknown} value
 * @returns {string|null}
 */
function normalizeOptionalUuid(value) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  if (!UUID_REGEX.test(normalized)) {
    return null;
  }

  return normalized;
}

/**
 * Loads accessible notes for the given IDs.
 *
 * @param {string[]} noteIds
 * @param {string} userId
 * @param {string|null} organizationId
 * @returns {Promise<object[]>}
 */
async function loadAccessibleNotes(noteIds, userId, organizationId = null) {
  if (noteIds.length === 0 || !UUID_REGEX.test(String(userId || ""))) {
    return [];
  }

  const query = `
    SELECT
      n.id::text,
      n.project_id::text,
      n.title,
      n.description,
      n.tags,
      n.status,
      n.document,
      n.project_stage_id::text,
      pst.name AS project_stage_name,
      n.priority_id::text,
      tp.name AS priority_name,
      tp.color_hex AS priority_color,
      n.updated_at
    FROM notes n
    LEFT JOIN project_stages pst
      ON pst.id = n.project_stage_id
      AND pst.project_id = n.project_id
    LEFT JOIN task_priorities tp
      ON tp.id = n.priority_id
      AND tp.deleted = false
    WHERE n.id = ANY($1::uuid[])
      AND n.deleted = false
      AND (
        n.user_id = $2::uuid
        OR EXISTS (
          SELECT 1
          FROM note_collaborators nc
          WHERE nc.note_id = n.id
            AND nc.user_id = $2::uuid
        )
        OR (
          $3::uuid IS NOT NULL
          AND n.project_id IS NOT NULL
          AND EXISTS (
            SELECT 1
            FROM projects p_org
            WHERE p_org.id = n.project_id
              AND p_org.organization_id = $3::uuid
              AND p_org.deleted = false
          )
        )
      )
    ORDER BY n.updated_at DESC;
  `;

  const { rows } = await pool.query(query, [noteIds, userId, organizationId]);
  return rows;
}

/**
 * Loads accessible projects for the given IDs.
 *
 * @param {string[]} projectIds
 * @param {string} userId
 * @param {string|null} organizationId
 * @returns {Promise<object[]>}
 */
async function loadAccessibleProjects(projectIds, userId, organizationId = null) {
  if (projectIds.length === 0 || !UUID_REGEX.test(String(userId || ""))) {
    return [];
  }

  const query = `
    SELECT
      p.id::text,
      p.parent_project_id::text,
      p.title,
      p.description,
      p.status,
      p.properties,
      COALESCE(
        (
          SELECT jsonb_agg(
            jsonb_build_object(
              'id', ps.id::text,
              'name', ps.name,
              'position', ps."position",
              'color', ps.color,
              'properties', ps.properties,
              'created_at', ps.created_at,
              'updated_at', ps.updated_at
            )
            ORDER BY ps."position" ASC
          )
          FROM project_stages ps
          WHERE ps.project_id = p.id
        ),
        '[]'::jsonb
      ) AS stages,
      COALESCE(
        (
          SELECT jsonb_agg(
            jsonb_build_object(
              'id', n.id::text,
              'title', n.title,
              'description', n.description,
              'tags', n.tags,
              'status', n.status,
              'document', n.document,
              'project_stage_id', n.project_stage_id::text,
              'project_stage_name', pst.name,
              'priority_id', n.priority_id::text,
              'priority_name', tp.name,
              'priority_color', tp.color_hex,
              'updated_at', n.updated_at
            )
            ORDER BY n.updated_at DESC
          )
          FROM notes n
          LEFT JOIN project_stages pst
            ON pst.id = n.project_stage_id
            AND pst.project_id = n.project_id
          LEFT JOIN task_priorities tp
            ON tp.id = n.priority_id
            AND tp.deleted = false
          WHERE n.project_id = p.id
            AND n.deleted = false
        ),
        '[]'::jsonb
      ) AS associated_notes,
      p.updated_at
    FROM projects p
    WHERE p.id = ANY($1::uuid[])
      AND p.deleted = false
      AND (
        p.user_id = $2::uuid
        OR EXISTS (
          SELECT 1
          FROM project_members pm
          WHERE pm.project_id = p.id
            AND pm.user_id = $2::uuid
            AND pm.deleted = false
            AND pm.suspended = false
        )
        OR (
          $3::uuid IS NOT NULL
          AND p.organization_id = $3::uuid
        )
      )
    ORDER BY p.updated_at DESC;
  `;

  const { rows } = await pool.query(query, [projectIds, userId, organizationId]);
  return rows;
}

/**
 * Builds contextual entities for prompt composition.
 *
 * @param {object} payload
 * @param {string} payload.userId
 * @param {unknown[]} payload.noteIds
 * @param {unknown[]} payload.projectIds
 * @param {string} [payload.organizationId]
 * @returns {Promise<{ indexedNotes: object[], indexedProjects: object[] }>}
 */
async function buildEntityContext(payload = {}) {
  const userId = typeof payload.userId === "string" ? payload.userId : "";
  const noteIds = normalizeUuidList(payload.noteIds);
  const projectIds = normalizeUuidList(payload.projectIds);
  const organizationId = normalizeOptionalUuid(payload.organizationId);

  const [indexedNotes, indexedProjects] = await Promise.all([
    loadAccessibleNotes(noteIds, userId, organizationId),
    loadAccessibleProjects(projectIds, userId, organizationId),
  ]);

  return {
    indexedNotes,
    indexedProjects,
  };
}

module.exports = {
  buildEntityContext,
  normalizeOptionalUuid,
  normalizeUuidList,
};
