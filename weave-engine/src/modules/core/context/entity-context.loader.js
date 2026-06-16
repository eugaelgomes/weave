/**
 * @module weave-engine/modules/core/context/entity-context.loader
 * @description Centralized loader for building AI prompt context from the database.
 * Fetches notes, projects, and organization members based on user permissions.
 *
 * Dependencies:
 * - `../../../services/postgres.client`: To query the Postgres database.
 *
 * Used by:
 * - `weave-engine/modules/weave-ai/chat.processor.js`: To build the system message.
 */
const { pool } = require("../../../services/postgres.client");

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Normalizes an array of arbitrary UUID values, filtering out invalid strings and deduplicating.
 *
 * @param {unknown} value - The input array.
 * @returns {string[]} An array of valid UUID strings.
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
 * Normalizes a single optional UUID string.
 *
 * @param {unknown} value - The input string.
 * @returns {string|null} The valid UUID or null.
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
 * Checks if a string matches the Weave 12-character public ID format.
 *
 * @param {unknown} value - The input string.
 * @returns {boolean} True if it is a valid public ID.
 */
function isPublicId12(value) {
  return (
    typeof value === "string" && value.length === 12 && !value.includes("-")
  );
}

/**
 * Resolves an array of note identifiers (UUID or public_note_id) to their internal UUIDs.
 * Hits the database to resolve public IDs.
 *
 * @param {unknown} value - The input array of mixed IDs.
 * @returns {Promise<string[]>} Array of validated internal UUIDs.
 */
async function resolveNoteIdsFromPayload(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  const uuidIds = [];
  const publicIds = [];
  const seen = new Set();

  for (const item of value) {
    if (typeof item !== "string") continue;
    const normalized = item.trim();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    if (UUID_REGEX.test(normalized)) {
      uuidIds.push(normalized);
    } else if (isPublicId12(normalized)) {
      publicIds.push(normalized);
    }
  }

  if (publicIds.length > 0) {
    const { rows } = await pool.query(
      `
        SELECT id::text
        FROM notes
        WHERE public_note_id = ANY($1::varchar[])
          AND deleted = false
      `,
      [publicIds]
    );
    for (const row of rows) {
      if (row?.id) uuidIds.push(String(row.id));
    }
  }

  return [...new Set(uuidIds)];
}

/**
 * Resolves an array of project identifiers (UUID or public_project_id) to their internal UUIDs.
 * Hits the database to resolve public IDs.
 *
 * @param {unknown} value - The input array of mixed IDs.
 * @returns {Promise<string[]>} Array of validated internal UUIDs.
 */
async function resolveProjectIdsFromPayload(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  const uuidIds = [];
  const publicIds = [];
  const seen = new Set();

  for (const item of value) {
    if (typeof item !== "string") continue;
    const normalized = item.trim();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    if (UUID_REGEX.test(normalized)) {
      uuidIds.push(normalized);
    } else if (isPublicId12(normalized)) {
      publicIds.push(normalized);
    }
  }

  if (publicIds.length > 0) {
    const { rows } = await pool.query(
      `
        SELECT id::text
        FROM projects
        WHERE public_project_id = ANY($1::varchar[])
          AND deleted = false
      `,
      [publicIds]
    );
    for (const row of rows) {
      if (row?.id) uuidIds.push(String(row.id));
    }
  }

  return [...new Set(uuidIds)];
}

/**
 * Loads detailed properties for a list of notes, strictly filtered by user access permissions
 * (ownership, collaboration, or organization-level visibility).
 *
 * @param {string[]} noteIds - Array of validated note UUIDs.
 * @param {string} userId - The authenticated user requesting context.
 * @param {string|null} organizationId - The active organization context.
 * @returns {Promise<object[]>} Array of accessible note records.
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
 * Loads detailed properties for a list of projects, strictly filtered by user access permissions.
 * Aggregates stages, members, and associated notes into a nested JSON structure.
 *
 * @param {string[]} projectIds - Array of validated project UUIDs.
 * @param {string} userId - The authenticated user requesting context.
 * @param {string|null} organizationId - The active organization context.
 * @returns {Promise<object[]>} Array of accessible project records.
 */
async function loadAccessibleProjects(
  projectIds,
  userId,
  organizationId = null
) {
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
              'user_id', pm.user_id::text,
              'name', u.name,
              'email', u.email,
              'avatar_url', u.avatar_url,
              'role', pm.role
            )
          )
          FROM project_members pm
          INNER JOIN users u ON pm.user_id = u.user_id
          WHERE pm.project_id = p.id
            AND pm.deleted = false
            AND pm.suspended = false
        ),
        '[]'::jsonb
      ) AS collaborators,
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

  const { rows } = await pool.query(query, [
    projectIds,
    userId,
    organizationId,
  ]);
  return rows;
}

/**
 * Loads organization members for context injection to give the AI awareness of teammates.
 * Limited to 10 members to prevent token overflow.
 *
 * @param {string|null} organizationId - The active organization context.
 * @returns {Promise<object[]>} Array of member details.
 */
async function loadOrganizationMembers(organizationId) {
  if (!organizationId || !UUID_REGEX.test(String(organizationId || ""))) {
    return [];
  }

  const query = `
    SELECT
      om.user_id::text,
      u.name,
      u.email,
      om.role
    FROM organization_members om
    INNER JOIN users u ON om.user_id = u.user_id
    WHERE om.organization_id = $1::uuid
      AND om.deleted = false
      AND om.suspended = false
    LIMIT 10;
  `;

  const { rows } = await pool.query(query, [organizationId]);
  return rows;
}

/**
 * Loads basic organization details for context injection.
 *
 * @param {string|null} organizationId - The active organization context.
 * @returns {Promise<object|null>} Organization details.
 */
async function loadOrganizationInfo(organizationId) {
  if (!organizationId || !UUID_REGEX.test(String(organizationId || ""))) {
    return null;
  }

  const query = `
    SELECT
      id::text,
      org_name,
      unique_name,
      description,
      default_timezone,
      default_locale,
      country
    FROM organizations
    WHERE id = $1::uuid
      AND deleted = false
    LIMIT 1;
  `;

  const { rows } = await pool.query(query, [organizationId]);
  return rows[0] || null;
}

/**
 * Orchestrates the fetching of all contextual entities for a given AI task payload.
 * Runs queries in parallel to minimize latency.
 *
 * @param {object} payload - The request context payload.
 * @param {string} payload.userId - The authenticated user ID.
 * @param {unknown[]} payload.noteIds - Array of note identifiers.
 * @param {unknown[]} payload.projectIds - Array of project identifiers.
 * @param {string} [payload.organizationId] - The organization ID.
 * @returns {Promise<{ indexedNotes: object[], indexedProjects: object[], organizationMembers: object[] }>} The resolved context map.
 */
async function buildEntityContext(payload = {}) {
  const userId = typeof payload.userId === "string" ? payload.userId : "";
  const noteIds = await resolveNoteIdsFromPayload(payload.noteIds);
  const projectIds = await resolveProjectIdsFromPayload(payload.projectIds);
  const organizationId = normalizeOptionalUuid(payload.organizationId);

  const [indexedNotes, indexedProjects, organizationMembers, organizationInfo] =
    await Promise.all([
      loadAccessibleNotes(noteIds, userId, organizationId),
      loadAccessibleProjects(projectIds, userId, organizationId),
      loadOrganizationMembers(organizationId),
      loadOrganizationInfo(organizationId),
    ]);

  return {
    indexedNotes,
    indexedProjects,
    organizationMembers,
    organizationInfo,
  };
}

module.exports = {
  buildEntityContext,
  loadOrganizationMembers,
  loadOrganizationInfo,
  normalizeOptionalUuid,
  normalizeUuidList,
  resolveNoteIdsFromPayload,
  resolveProjectIdsFromPayload,
};
