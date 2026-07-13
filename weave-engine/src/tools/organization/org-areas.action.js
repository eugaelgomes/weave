/**
 * @module weave-engine/modules/core/tools/actions/org-areas.action
 * @description Implementation logic for the org-areas.action AI tool.
 */
const { pool } = require("../../services/database/postgres.client");

/**
 * Lists all active areas of the user's organization.
 * @param {object} args
 * @param {string} args.organizationId - Injected securely via executionContext
 * @returns {Promise<object>}
 */
async function listOrgAreas(args) {
  if (!args.organizationId) {
    return {
      message:
        "User is not currently part of any organization. Cannot retrieve organization areas.",
    };
  }

  try {
    const { rows } = await pool.query(
      `SELECT
        id::text,
        area_name,
        slug,
        description,
        parent_area_id::text,
        is_root_area,
        active,
        created_at
       FROM organization_areas
       WHERE organization_id = $1::uuid
         AND deleted = false
       ORDER BY area_name ASC`,
      [args.organizationId]
    );

    return { areas: rows, count: rows.length };
  } catch (error) {
    return {
      error: "Database error fetching org areas: " + error.message,
    };
  }
}

/**
 * Fetches a specific organization area by ID, including its members.
 * @param {object} args
 * @param {string} args.areaId
 * @param {string} args.organizationId - Injected securely via executionContext
 * @returns {Promise<object>}
 */
async function getOrgArea(args) {
  if (!args.organizationId) {
    return {
      message:
        "User is not currently part of any organization. Cannot retrieve organization area.",
    };
  }
  if (!args.areaId) {
    return { error: "areaId is required." };
  }

  try {
    const { rows } = await pool.query(
      `SELECT
        a.id::text,
        a.area_name,
        a.slug,
        a.description,
        a.parent_area_id::text,
        a.is_root_area,
        a.active,
        a.created_at,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'user_id', m.user_id::text,
                'role', m.role,
                'name', u.name,
                'username', u.username,
                'avatar_url', u.avatar_url
              )
              ORDER BY u.name ASC
            )
            FROM organization_area_members m
            INNER JOIN users u ON m.user_id = u.user_id
            WHERE m.area_id = a.id
              AND m.organization_id = $1::uuid
              AND m.deleted = false
          ),
          '[]'::json
        ) AS members
       FROM organization_areas a
       WHERE a.id = $2::uuid
         AND a.organization_id = $1::uuid
         AND a.deleted = false
       LIMIT 1`,
      [args.organizationId, args.areaId]
    );

    if (rows.length === 0) {
      return { error: "Area not found in this organization." };
    }

    return { area: rows[0] };
  } catch (error) {
    return {
      error: "Database error fetching org area: " + error.message,
    };
  }
}

module.exports = {
  getOrgArea,
  listOrgAreas,
};
