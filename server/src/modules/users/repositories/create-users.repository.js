const BaseRepository = require("./base.repository");
const { executeQuery } = require("@/database/connection");
const { defaultAppPreferences } = require("@/modules/users/normalize");
const PlansRepository = require("@/modules/plans/repositories/plans.repository");
const { generatePublicId } = require("@/utils/formatters.util");

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
 * Insert records into `users` table.
 */
class CreateUsersRepository extends BaseRepository {
  /**
   * @param {CreateUserPayload} userData
   * @param {import('pg').PoolClient} [client=null]
   * @returns {Promise<CreateUserRow[]>}
   */
  async createUser(userData, client = null) {
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

    const resolvedPlanId = plan_id || (await PlansRepository.getDefaultSignupPlanId());

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

    return await executeQuery(
      query,
      [
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
      ],
      client
    );
  }

  /**
   * @param {string} username
   * @param {string} name
   * @param {string|number} githubId
   * @param {import('pg').PoolClient} [client=null]
   * @returns {Promise<Array<{ user_id: string|number }>>}
   */
  async createGithubUser(username, name, githubId, client = null) {
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
    return await executeQuery(query, [username, name, githubId, planId, publicUserId], client);
  }

  /**
   * Activates a PENDING_INVITE user.
   */
  async updateUserActivation(userId, userData, client = null) {
    const { name, username, password, timezone, private_profile, birth_date, phone_number } =
      userData;

    const query = `
      UPDATE users SET
        name = $1, username = $2, password = $3, phone_number = $4,
        timezone = $5, birth_date = $6, private_profile = $7,
        status = 'ACTIVE', updated_at = NOW()
      WHERE user_id = $8
      RETURNING user_id, email, name, username, created_at;
    `;

    const values = [
      name,
      username,
      password,
      phone_number,
      timezone,
      birth_date || null,
      private_profile || false,
      userId,
    ];

    if (client) {
      const res = await client.query(query, values);
      return res.rows;
    }
    return await executeQuery(query, values);
  }
}
module.exports = new CreateUsersRepository();
