const BaseRepository = require("./base.repository");

/**
 * Queries used in username/password login and enriched session data.
 */
class CredentialsRepository extends BaseRepository {
  /**
   * @param {string} email The user's email
   * @returns {Promise<import('@/types/models').User | null>}
   */
  async findUserByEmail(email) {
    const query = `
      WITH target_user AS (
          SELECT * FROM users WHERE LOWER(email) = LOWER($1) AND deleted = false
          LIMIT 1
      ),
      latest_workspace AS (
        SELECT wm.user_id, wm.workspace_id
        FROM workspace_members wm
        INNER JOIN target_user tu ON tu.user_id = wm.user_id
        WHERE wm.deleted = false
        ORDER BY wm.created_at DESC
        LIMIT 1
      )
      SELECT
        u.user_id,
        u.public_user_id,
        u.username,
        u.name AS user_name,
        u.email,
        u.password,
        u.avatar_url,
        u.birth_date,
        u.private_profile,
        u.phone_number,
        u.auth_with_google,
        u.auth_with_github,
        u.auth_with_microsoft,
        u.github_id,
        u.microsoft_id,
        u.theme_mode,
        u.created_at,
        u.updated_at,
        u.email_verified,
        u.email_verified_at,
        u.plan_id,
        u.user_preference,
        u.onboarding_state,
        
        (SELECT p.name FROM plans p WHERE p.plan_id = u.plan_id) AS plan_name,
        (SELECT p.details FROM plans p WHERE p.plan_id = u.plan_id) AS plan_details,

        (
          SELECT row_to_json(workspace_data)
          FROM (
            SELECT 
              wm.workspace_id AS workspace_id,
              (SELECT wr.name FROM workspace_member_roles wmr JOIN workspaces_roles wr ON wr.id = wmr.role_id WHERE wmr.workspace_member_id = wm.id LIMIT 1) AS workspace_member_role,
              wm.created_at AS workspace_member_since,
              w.unique_name AS workspace_unique_name,
              w.public_id AS workspace_public_id,
              w.workspace_name AS workspace_name,
              w.logo_url AS workspace_logo_url,
              (SELECT integrations FROM workspace_settings ws WHERE ws.workspace_id = w.id) AS active_modules
            FROM workspace_members wm
            JOIN workspaces w ON w.id = wm.workspace_id
            WHERE wm.user_id = u.user_id
              AND wm.deleted = false
            ORDER BY wm.created_at DESC 
            LIMIT 1
          ) workspace_data
        ) AS workspace,

        (
          SELECT row_to_json(usage_data)
          FROM (
            SELECT 
              pu.plan_id AS usage_plan_id, 
              pu.client_type AS usage_client_type, 
              pu.usage_details, 
              (pu.usage_details #>> '{monthly_cycle,current_period_start}')::timestamptz AS period_start,
              (pu.usage_details #>> '{monthly_cycle,current_period_end}')::timestamptz AS period_end,
              p2.name AS usage_plan_name
            FROM plan_usages pu
            LEFT JOIN plans p2 ON p2.plan_id = pu.plan_id
            LEFT JOIN latest_workspace lw ON lw.user_id = u.user_id
            WHERE (
              pu.subscriber_type = 'workspace'
              AND lw.workspace_id IS NOT NULL
              AND pu.subscriber_id = lw.workspace_id
            ) OR (
              pu.subscriber_type = 'user'
              AND pu.subscriber_id = u.user_id
            )
            ORDER BY
              CASE
                WHEN pu.subscriber_type = 'workspace' THEN 1
                ELSE 2
              END,
              period_end DESC NULLS LAST,
              pu.updated_at DESC
            LIMIT 1
          ) usage_data
        ) AS current_usage,

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
                  WHERE user_id = u.user_id
                    AND deleted = false
                  ORDER BY created_at DESC
                  LIMIT 1
              )
            ORDER BY t.parent_team_id NULLS FIRST, t.created_at ASC 
            LIMIT 1
          ) team_data
        ) AS default_area

      FROM target_user u;
    `;
    const results = await this.executeQuery(query, [email]);
    return results[0];
  }

  /**
   * @param {string} username The username, email, or user ID
   * @returns {Promise<import('@/types/models').User | null>}
   */
  async findUserByUsername(username) {
    if (typeof username === "string" && username.includes("@")) {
      return this.findUserByEmail(username);
    }

    const query = `
      WITH target_user AS (
          SELECT * FROM users WHERE username = $1 AND deleted = false
          UNION ALL
          SELECT * FROM users WHERE email = $1 AND deleted = false
          UNION ALL
          SELECT * FROM users WHERE user_id::text = $1 AND deleted = false
          LIMIT 1
      ),
      latest_workspace AS (
        SELECT wm.user_id, wm.workspace_id
        FROM workspace_members wm
        INNER JOIN target_user tu ON tu.user_id = wm.user_id
        WHERE wm.deleted = false
        ORDER BY wm.created_at DESC
        LIMIT 1
      )
      SELECT
        u.user_id,
        u.public_user_id,
        u.username,
        u.name AS user_name,
        u.email,
        u.password,
        u.avatar_url,
        u.birth_date,
        u.private_profile,
        u.phone_number,
        u.auth_with_google,
        u.auth_with_github,
        u.auth_with_microsoft,
        u.github_id,
        u.microsoft_id,
        u.theme_mode,
        u.created_at,
        u.updated_at,
        u.email_verified,
        u.email_verified_at,
        u.plan_id,
        u.user_preference,
        u.onboarding_state,
        
        (SELECT p.name FROM plans p WHERE p.plan_id = u.plan_id) AS plan_name,
        (SELECT p.details FROM plans p WHERE p.plan_id = u.plan_id) AS plan_details,

        (
          SELECT row_to_json(workspace_data)
          FROM (
            SELECT 
              wm.workspace_id AS workspace_id,
              (SELECT wr.name FROM workspace_member_roles wmr JOIN workspaces_roles wr ON wr.id = wmr.role_id WHERE wmr.workspace_member_id = wm.id LIMIT 1) AS workspace_member_role,
              wm.created_at AS workspace_member_since,
              w.unique_name AS workspace_unique_name,
              w.public_id AS workspace_public_id,
              w.workspace_name AS workspace_name,
              w.logo_url AS workspace_logo_url,
              (SELECT integrations FROM workspace_settings ws WHERE ws.workspace_id = w.id) AS active_modules
            FROM workspace_members wm
            JOIN workspaces w ON w.id = wm.workspace_id
            WHERE wm.user_id = u.user_id
              AND wm.deleted = false
            ORDER BY wm.created_at DESC 
            LIMIT 1
          ) workspace_data
        ) AS workspace,

        (
          SELECT row_to_json(usage_data)
          FROM (
            SELECT 
              pu.plan_id AS usage_plan_id, 
              pu.client_type AS usage_client_type, 
              pu.usage_details, 
              (pu.usage_details #>> '{monthly_cycle,current_period_start}')::timestamptz AS period_start,
              (pu.usage_details #>> '{monthly_cycle,current_period_end}')::timestamptz AS period_end,
              p2.name AS usage_plan_name
            FROM plan_usages pu
            LEFT JOIN plans p2 ON p2.plan_id = pu.plan_id
            LEFT JOIN latest_workspace lw ON lw.user_id = u.user_id
            WHERE (
              pu.subscriber_type = 'workspace'
              AND lw.workspace_id IS NOT NULL
              AND pu.subscriber_id = lw.workspace_id
            ) OR (
              pu.subscriber_type = 'user'
              AND pu.subscriber_id = u.user_id
            )
            ORDER BY
              CASE
                WHEN pu.subscriber_type = 'workspace' THEN 1
                ELSE 2
              END,
              period_end DESC NULLS LAST,
              pu.updated_at DESC
            LIMIT 1
          ) usage_data
        ) AS current_usage,

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
                  WHERE user_id = u.user_id
                    AND deleted = false
                  ORDER BY created_at DESC
                  LIMIT 1
              )
            ORDER BY t.parent_team_id NULLS FIRST, t.created_at ASC 
            LIMIT 1
          ) team_data
        ) AS default_area

      FROM target_user u;
    `;
    const results = await this.executeQuery(query, [username]);
    return results[0];
  }

  /**
   * @param {string} userId
   * @param {string} ip
   * @param {Date | string} timestamp
   * @param {boolean} success
   * @param {string} userAgent
   * @returns {Promise<unknown>}
   */
  async loginLogs(userId, ip, timestamp, success, userAgent) {
    const query = `
      INSERT INTO user_login_logs (user_id, ip_address, created_at, success, user_agent)
      VALUES ($1, $2, $3, $4, $5);
    `;
    return await this.executeQuery(query, [userId, ip, timestamp, success, userAgent]);
  }

  /**
   * @param {string} userId
   * @param {string} ip
   * @param {Date | string} timestamp
   * @param {string} location
   * @param {string} userAgent
   * @returns {Promise<unknown>}
   */
  async logUserLocation(userId, ip, timestamp, location, userAgent) {
    const query = `
      INSERT INTO user_location_logs (user_id, ip_address, created_at, location, user_agent) 
      VALUES ($1, $2, $3, $4, $5);
    `;
    return await this.executeQuery(query, [userId, ip, timestamp, location, userAgent]);
  }
}

module.exports = new CredentialsRepository();
