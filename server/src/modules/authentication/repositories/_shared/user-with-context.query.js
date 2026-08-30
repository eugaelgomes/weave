

/**
 * Shared SELECT fragment for user + workspace context + default team.
 * Used by all authentication repositories to ensure consistent session data.
 *
 * @param {string} whereClause - SQL WHERE clause (e.g. "u.google_id = $1")
 * @returns {string} Complete SQL query
 */
function buildUserWithContextQuery(whereClause) {
  return `
    SELECT
      u.user_id, u.public_user_id, u.username, u.name, u.email, u.password,
      u.avatar_url, u.auth_with_google, u.auth_with_github, u.auth_with_microsoft,
      u.github_id, u.microsoft_id, u.theme_mode,
      u.private_profile, u.plan_id, u.created_at,

      (SELECT p.name FROM plans p WHERE p.plan_id = u.plan_id) AS plan_name,

      (
        SELECT row_to_json(org_data)
        FROM (
          SELECT om.organization_id AS org_id, om.role AS org_member_role,
                 o.unique_name AS org_unique_name, o.public_id AS org_public_id,
                 o.org_name, o.logo_url AS org_logo_url
          FROM organization_members om
          JOIN workspaces o ON o.id = om.organization_id
          WHERE om.user_id = u.user_id AND om.deleted = false
          ORDER BY om.created_at DESC LIMIT 1
        ) org_data
      ) AS workspace,

      (
        SELECT row_to_json(area_data)
        FROM (
          SELECT
            oa.id AS org_default_area_id,
            oa.area_name AS org_default_area_name,
            oa.slug AS org_default_area_slug,
            oa.description AS org_default_area_description,
            oa.properties AS org_default_area_properties
          FROM organization_areas oa
          WHERE oa.deleted = false
            AND oa.organization_id = (
              SELECT organization_id FROM organization_members
              WHERE user_id = u.user_id AND deleted = false
              ORDER BY created_at DESC LIMIT 1
            )
          ORDER BY oa.is_root_area DESC, oa.created_at ASC LIMIT 1
        ) area_data
      ) AS default_area

    FROM users u
    WHERE ${whereClause} AND u.deleted = false
    LIMIT 1;
  `;
}

module.exports = { buildUserWithContextQuery };
