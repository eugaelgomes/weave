const BaseRepository = require("./base.repository");
const { executeQuery } = require("@/database/connection");
const { defaultAppPreferences } = require("@/modules/users/normalize");

/**
 * @typedef {Object} CreateUserRow
 * @property {string|number} user_id
 * @property {string} email
 * @property {string} name
 * @property {string|null} [avatar_url]
 * @property {Date|string} [created_at]
 */

/**
 * @typedef {Object} CreateUserPayload
 * @property {string} name
 * @property {string} username
 * @property {string} email
 * @property {string} password
 * @property {string|null|undefined} [timezone]
 * @property {boolean} [private_profile]
 * @property {string|null|undefined} [birth_date]
 * @property {string|null|undefined} [phone_number]
 * @property {string|null|undefined} [avatar_url]
 */

/**
 * Inserção de registros na tabela `users`.
 */
class CreateUsersRepository extends BaseRepository {
  /**
   * @param {CreateUserPayload} userData
   * @returns {Promise<CreateUserRow[]>}
   */
  async createUser(userData) {
    const {
      name,
      username,
      email,
      password,
      timezone,
      private_profile,
      birth_date,
      phone_number,
      avatar_url,
    } = userData;

    const query = `
    INSERT INTO users (
      name, 
      username, 
      email, 
      password, 
      timezone, 
      private_profile,
      birth_date, 
      phone_number, 
      avatar_url,
      user_preference
    ) 
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING user_id, email, name, avatar_url, created_at;
  `;

    return await executeQuery(query, [
      name,
      username,
      email,
      password,
      timezone,
      private_profile,
      birth_date,
      phone_number,
      avatar_url,
      defaultAppPreferences,
    ]);
  }

  /**
   * @param {string} username
   * @param {string} name
   * @param {string|number} githubId
   * @returns {Promise<Array<{ user_id: string|number }>>}
   */
  async createGithubUser(username, name, githubId) {
    const query = `
      INSERT INTO 
        users (username, name, github_id) 
      VALUES ($1, $2, $3)
      RETURNING user_id;
    `;
    return await executeQuery(query, [username, name, githubId]);
  }
}
module.exports = new CreateUsersRepository();
