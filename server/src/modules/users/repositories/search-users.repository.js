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
      pu.plan_id AS usage_plan_id,
      pu.client_type,
      pu.usage_details,
      pu.period_start,
      pu.period_end
    FROM users u
    LEFT JOIN organizations o ON o.user_id = u.user_id
    LEFT JOIN plans p ON p.plan_id = u.plan_id
    LEFT JOIN plan_usages pu ON pu.user_id = u.user_id
    WHERE (
      (u.username IS NOT NULL AND u.username = $1)
      OR (u.email IS NOT NULL AND u.email = $1)
    )
    AND u.deleted = false
    LIMIT 1;
  `;

    const results = await executeQuery(query, [username]);
    return results[0];
  }

  /**
   * @param {string} searchTerm Trecho para `LIKE` em username ou email.
   * @returns {Promise<import('pg').QueryResultRow[]>}
   */
  async searchUsers(searchTerm) {
    const query = `
      SELECT 
        user_id, 
        username, 
        name, 
        email, 
        avatar_url 
      FROM 
        users 
      WHERE 
        (LOWER(username) LIKE LOWER($1) 
        OR LOWER(email) LIKE LOWER($1))
        AND deleted = false
        AND private_profile = false
      ORDER BY 
        name ASC
      LIMIT 15;
    `;
    const results = await executeQuery(query, [`%${searchTerm}%`]);
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
