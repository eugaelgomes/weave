const BaseRepository = require("./base.repository");

/**
 * Consultas usadas no login por usuário/senha e dados enriquecidos de sessão.
 */
class SigninRepository extends BaseRepository {
  /**
   * @param {string} username O nome de usuário ou e-mail
   * @returns {Promise<import('@/types/models').User | null>}
   */
  async findUserByUsername(username) {
    const query = `
      WITH target_user AS (
          SELECT * FROM users WHERE username = $1 AND deleted = false
          UNION ALL
          SELECT * FROM users WHERE email = $1 AND deleted = false
          LIMIT 1
      ),
      latest_org AS (
        SELECT om.user_id, om.organization_id
        FROM organization_members om
        INNER JOIN target_user tu ON tu.user_id = om.user_id
        WHERE om.deleted = false
        ORDER BY om.created_at DESC
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
        
        (SELECT p.name FROM plans p WHERE p.plan_id = u.plan_id) AS plan_name,
        (SELECT p.details FROM plans p WHERE p.plan_id = u.plan_id) AS plan_details,

        (
          SELECT row_to_json(org_data)
          FROM (
            SELECT 
              om.organization_id AS org_id, 
              om.role AS org_member_role, 
              om.created_at AS org_member_since, 
              o.unique_name AS org_unique_name, 
              o.public_id AS org_public_id,
              o.org_name, 
              o.logo_url AS org_logo_url
            FROM organization_members om
            JOIN organizations o ON o.id = om.organization_id
            WHERE om.user_id = u.user_id
              AND om.deleted = false
            ORDER BY om.created_at DESC 
            LIMIT 1
          ) org_data
        ) AS organization,

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
            LEFT JOIN latest_org lo ON lo.user_id = u.user_id
            WHERE (
              pu.subscriber_type = 'organization'
              AND lo.organization_id IS NOT NULL
              AND pu.subscriber_id = lo.organization_id
            ) OR (
              pu.subscriber_type = 'user'
              AND pu.subscriber_id = u.user_id
            )
            ORDER BY
              CASE
                WHEN pu.subscriber_type = 'organization' THEN 1
                ELSE 2
              END,
              period_end DESC NULLS LAST,
              pu.updated_at DESC
            LIMIT 1
          ) usage_data
        ) AS current_usage,

        (
          SELECT row_to_json(area_data)
          FROM (
            SELECT 
              oam.area_id AS org_default_area_id,
              oam.role AS org_default_area_role,
              oam.created_at AS org_default_area_member_since,
              oa.area_name AS org_default_area_name,
              oa.slug AS org_default_area_slug,
              oa.description AS org_default_area_description,
              oa.properties AS org_default_area_properties
            FROM organization_area_members oam
            JOIN organization_areas oa ON oa.id = oam.area_id
            WHERE oam.user_id = u.user_id
              AND oam.deleted = false
              AND oa.deleted = false
              AND oam.organization_id = (
                  SELECT organization_id FROM organization_members 
                  WHERE user_id = u.user_id
                    AND deleted = false
                  ORDER BY created_at DESC
                  LIMIT 1
              )
            ORDER BY oam.created_at ASC 
            LIMIT 1
          ) area_data
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
    return await this.executeQuery(query, [
      userId,
      ip,
      timestamp,
      success,
      userAgent,
    ]);
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
    return await this.executeQuery(query, [
      userId,
      ip,
      timestamp,
      location,
      userAgent,
    ]);
  }
}

module.exports = new SigninRepository();
