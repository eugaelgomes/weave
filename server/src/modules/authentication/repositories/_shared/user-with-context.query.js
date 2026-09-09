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
      u.onboarding_state,

      (SELECT p.name FROM plans p WHERE p.plan_id = u.plan_id) AS plan_name,

      (
        SELECT row_to_json(workspace_data)
        FROM (
          SELECT wm.workspace_id AS workspace_id, wm.role_id AS workspace_member_role_id,
                 w.unique_name AS workspace_unique_name, w.public_id AS workspace_public_id,
                 w.workspace_name, w.logo_url AS workspace_logo_url
          FROM workspace_members wm
          JOIN workspaces w ON w.id = wm.workspace_id
          WHERE wm.user_id = u.user_id AND wm.deleted = false
          ORDER BY wm.created_at DESC LIMIT 1
        ) workspace_data
      ) AS workspace,

      (
        SELECT row_to_json(team_data)
        FROM (
          SELECT
            t.id AS workspace_default_team_id,
            t.name AS workspace_default_team_name,
            t.slug AS workspace_default_team_slug,
            t.description AS workspace_default_team_description,
            t.properties AS workspace_default_team_properties
          FROM teams t
          WHERE t.deleted = false
            AND t.workspace_id = (
              SELECT workspace_id FROM workspace_members
              WHERE user_id = u.user_id AND deleted = false
              ORDER BY created_at DESC LIMIT 1
            )
            AND t.parent_team_id IS NULL
          ORDER BY t.created_at ASC LIMIT 1
        ) team_data
      ) AS default_team

    FROM users u
    WHERE ${whereClause} AND u.deleted = false
    LIMIT 1;
  `;
}

module.exports = { buildUserWithContextQuery };
