const BaseRepository = require("./base.repository");
const { executeQuery } = require("@/database/connection");
const { defaultAppPreferences } = require("@/modules/users/normalize");
const PlansRepository = require("@/modules/plans/plans.repository");
const { generatePublicId } = require("@/utils/generate-public-id");

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
 * @property {string|null|undefined} [plan_id]
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
      plan_id,
    } = userData;

    const resolvedPlanId =
      plan_id || (await PlansRepository.getDefaultSignupPlanId());

    const publicUserId = generatePublicId();

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
      user_preference,
      plan_id,
      public_user_id
    ) 
    VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
      $11, $12
    )
    RETURNING user_id, public_user_id, email, name, avatar_url, created_at;
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
      resolvedPlanId,
      publicUserId,
    ]);
  }

  /**
   * @param {string} username
   * @param {string} name
   * @param {string|number} githubId
   * @returns {Promise<Array<{ user_id: string|number }>>}
   */
  async createGithubUser(username, name, githubId) {
    const planId = await PlansRepository.getDefaultSignupPlanId();
    const publicUserId = generatePublicId();
    const query = `
      INSERT INTO 
        users (username, name, github_id, plan_id, public_user_id) 
      VALUES (
        $1, $2, $3, $4, $5
      )
      RETURNING user_id, public_user_id;
    `;
    return await executeQuery(query, [username, name, githubId, planId, publicUserId]);
  }
}
module.exports = new CreateUsersRepository();
