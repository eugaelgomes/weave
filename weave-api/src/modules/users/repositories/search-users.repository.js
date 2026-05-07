const BaseRepository = require("./base.repository");
const { executeQuery } = require("@/database/connection");

/**
 * Consultas de leitura e busca na tabela `users` (e joins leves).
 */
class SearchUsersRepository extends BaseRepository {
  /**
   * @returns {Promise<import('pg').QueryResultRow[]>}
   */
  async findAll() {
    const query = `
    SELECT 
      name, email, username, 
    CASE WHEN avatar_url IS NOT NULL THEN true ELSE false END as has_profile_image 
    FROM users
    `;
    return await executeQuery(query);
  }

  /**
   * @param {string} username
   * @param {string} email
   * @returns {Promise<import('pg').QueryResultRow[]>}
   */
  async findByUsernameOrEmail(username, email) {
    const query = `SELECT * FROM users WHERE (email = $1 OR username = $2) AND deleted = false`;
    return await executeQuery(query, [email, username]);
  }

  /**
   * @param {string|number} userId
   * @returns {Promise<import('pg').QueryResultRow|undefined>}
   */
  async getUserById(userId) {
    const query = `
    SELECT 
      user_id, username, name, email, avatar_url, created_at 
    FROM users 
    WHERE user_id = $1 AND deleted = false 
    LIMIT 1`;
    const results = await executeQuery(query, [userId]);
    return results[0];
  }

  /**
   * Usuário com organização, plano e uso corrente (quando existir).
   *
   * @param {string} username
   * @returns {Promise<import('pg').QueryResultRow|undefined>}
   */
  async getUserByUsername(username) {
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
      WHERE om.area_id IS NULL
        AND om.deleted = false
      ORDER BY om.created_at DESC
      LIMIT 1
    )
    SELECT
      u.user_id,
      u.username,
      u.name,
      u.email,
      u.password,
      u.avatar_url,
      u.birth_date,
      u.private_profile,
      u.phone_number,
      u.auth_with_google,
      u.theme_mode,
      u.created_at,
      u.updated_at,
      u.email_verified,
      u.email_verified_at,
      u.plan_id,
      o.id AS org_id,
      o.unique_name AS org_unique_name,
      o.org_name AS org_name,
      p.plan_id AS user_plan_id,
      p.name AS plan_name,
      p.details AS plan_details,
      cu.usage_plan_id,
      cu.client_type,
      cu.usage_details,
      cu.period_start,
      cu.period_end
    FROM target_user u
    LEFT JOIN latest_org lo ON lo.user_id = u.user_id
    LEFT JOIN organizations o ON o.id = lo.organization_id AND o.deleted = false
    LEFT JOIN plans p ON p.plan_id = u.plan_id
    LEFT JOIN LATERAL (
      SELECT
        pu.plan_id AS usage_plan_id,
        pu.client_type,
        pu.usage_details,
        (pu.usage_details #>> '{monthly_cycle,current_period_start}')::timestamptz AS period_start,
        (pu.usage_details #>> '{monthly_cycle,current_period_end}')::timestamptz AS period_end
      FROM plan_usages pu
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
    ) cu ON TRUE
    LIMIT 1;
  `;

    const results = await executeQuery(query, [username]);
    return results[0];
  }

  /**
   * @param {string} searchTerm Trecho para `LIKE` em username ou email.
   * @param {string} searcherUserId Utilizador autenticado (isolamento por workspace).
   * @returns {Promise<import('pg').QueryResultRow[]>}
   */
  async searchUsers(searchTerm, searcherUserId) {
    const query = `
      WITH searcher_orgs AS (
        SELECT DISTINCT organization_id
        FROM organization_members
        WHERE user_id = $2::uuid
          AND deleted = false
          AND status = 'ACTIVE'::public.organization_member_status_enum
          AND suspended = false
      ),
      searcher_has_orgs AS (
        SELECT EXISTS (SELECT 1 FROM searcher_orgs) AS has_any
      )
      SELECT
        u.user_id,
        u.username,
        u.name,
        u.email,
        u.avatar_url
      FROM users u
      CROSS JOIN searcher_has_orgs sho
      WHERE
        (LOWER(u.username) LIKE LOWER($1)
        OR LOWER(u.email) LIKE LOWER($1))
        AND u.deleted = false
        AND u.private_profile = false
        AND (
          (
            NOT sho.has_any
            AND NOT EXISTS (
              SELECT 1
              FROM organization_members om
              WHERE om.user_id = u.user_id
                AND om.deleted = false
                AND om.status = 'ACTIVE'::public.organization_member_status_enum
                AND om.suspended = false
            )
          )
          OR (
            sho.has_any
            AND EXISTS (
              SELECT 1
              FROM organization_members om
              INNER JOIN searcher_orgs so ON om.organization_id = so.organization_id
              WHERE om.user_id = u.user_id
                AND om.deleted = false
                AND om.status = 'ACTIVE'::public.organization_member_status_enum
                AND om.suspended = false
            )
          )
        )
      ORDER BY u.name ASC
      LIMIT 15;
    `;
    const results = await executeQuery(query, [`%${searchTerm}%`, searcherUserId]);
    return results;
  }

  /**
   * @param {string|number} userId
   * @returns {Promise<import('pg').QueryResultRow|undefined>}
   */
  async findById(userId) {
    const query = `
      SELECT 
        user_id, username, name, email, avatar_url 
      FROM users
      WHERE user_id = $1 AND deleted = false 
      LIMIT 1`;
    const results = await executeQuery(query, [userId]);
    return results[0];
  }

  /**
   * @param {string|number} githubId
   * @returns {Promise<import('pg').QueryResultRow|undefined>}
   */
  async findByGithubId(githubId) {
    const query = `
      SELECT
        user_id, username, name 
      FROM users
      WHERE github_id = $1
      LIMIT 1`;
    const results = await executeQuery(query, [githubId]);
    return results[0];
  }
}
module.exports = new SearchUsersRepository();
