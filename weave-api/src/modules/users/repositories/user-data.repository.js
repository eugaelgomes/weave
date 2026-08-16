const BaseRepository = require("./base.repository");
const { executeQuery } = require("@/database/connection");
const { defaultAppPreferences, normalizeAppPreferences } = require("@/modules/users/normalize");

/**
 * @typedef {Object} UserProfileUpdates
 * @property {string} [name]
 * @property {string} [email]
 * @property {string} [username]
 * @property {string} [theme_mode]
 * @property {string|null} [birth_date]
 * @property {string|null} [phone_number]
 * @property {boolean} [private_profile]
 * @property {Record<string, unknown>} [user_preference]
 */

/**
 * @typedef {Object} UserProfileRow
 * @property {string|number} user_id
 * @property {string} [username]
 * @property {string} [name]
 * @property {string} [email]
 * @property {string|null} [avatar_url]
 * @property {string} [theme_mode]
 * @property {string|null} [birth_date]
 * @property {string|null} [phone_number]
 * @property {boolean} [private_profile]
 * @property {Record<string, unknown>} [user_preference]
 * @property {Date|string} [created_at]
 */

/**
 * Reads and updates profile data and preferences in `users`.
 */
class UserDataRepository extends BaseRepository {
  /**
   * @param {string|number} userId
   * @returns {Promise<{ avatar_url: string|null, name: string }|undefined>}
   */
  async getProfileImage(userId) {
    const query = `
    SELECT
      avatar_url, name 
    FROM users
    WHERE user_id = $1 
    LIMIT 1`;
    const results = await executeQuery(query, [userId]);
    return results[0];
  }

  /**
   * @param {string|number} userId
   * @param {string} url
   * @returns {Promise<Array<{ user_id: string|number, avatar_url: string|null }>>}
   */
  async updateProfileImage(userId, url) {
    const query = `
      UPDATE users
      SET avatar_url = $1
      WHERE user_id = $2
      RETURNING user_id, avatar_url;
    `;
    return await executeQuery(query, [url, userId]);
  }

  /**
   * Updates only the provided fields. With no fields, returns the current record.
   *
   * @param {string|number} userId
   * @param {UserProfileUpdates} updates
   * @returns {Promise<UserProfileRow|undefined>}
   */
  async updateUserProfile(userId, updates) {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (updates.name !== undefined) {
      fields.push(`name = $${paramIndex++}`);
      values.push(updates.name);
    }
    if (updates.email !== undefined) {
      fields.push(`email = $${paramIndex++}`);
      values.push(updates.email);
    }
    if (updates.username !== undefined) {
      fields.push(`username = $${paramIndex++}`);
      values.push(updates.username);
    }
    if (updates.theme_mode !== undefined) {
      const upper = String(updates.theme_mode).trim().toUpperCase();
      if (upper === "LIGHT" || upper === "DARK") {
        fields.push(`theme_mode = $${paramIndex++}`);
        values.push(upper);
      }
    }
    if (updates.birth_date !== undefined) {
      fields.push(`birth_date = $${paramIndex++}`);
      values.push(updates.birth_date);
    }
    if (updates.phone_number !== undefined) {
      fields.push(`phone_number = $${paramIndex++}`);
      values.push(updates.phone_number);
    }
    if (updates.private_profile !== undefined) {
      fields.push(`private_profile = $${paramIndex++}`);
      values.push(updates.private_profile);
    }
    if (updates.user_preference !== undefined) {
      fields.push(`user_preference = $${paramIndex++}`);
      values.push(updates.user_preference);
    }

    if (fields.length === 0) {
      const query = `
        SELECT user_id, username, name, email, avatar_url, theme_mode, birth_date, phone_number, private_profile, user_preference, created_at
        FROM users
        WHERE user_id = $1 AND deleted = false
      `;
      const results = await executeQuery(query, [userId]);
      return results[0];
    }

    values.push(userId);
    const query = `
      UPDATE users
      SET ${fields.join(", ")}
      WHERE user_id = $${paramIndex} AND deleted = false
      RETURNING user_id, username, name, email, avatar_url, theme_mode, birth_date, phone_number, private_profile, user_preference, created_at;
    `;
    const results = await executeQuery(query, values);
    return results[0];
  }

  /**
   * @param {string|number} userId
   * @param {string} hashedPassword
   * @returns {Promise<import('pg').QueryResultRow[]>}
   */
  async updateUserPassword(userId, hashedPassword) {
    const query = `
      UPDATE users
      SET password = $1
      WHERE user_id = $2 AND deleted = false
    `;
    return await executeQuery(query, [hashedPassword, userId]);
  }

  /**
   * @param {string|number} userId
   * @returns {Promise<{ user_id: string|number, user_preference: Record<string, unknown> }|undefined>}
   */
  async setDefaultAppPreferences(userId) {
    const query = `
      UPDATE users
      SET user_preference = $1
      WHERE user_id = $2
      RETURNING user_id, user_preference
    `;
    const results = await executeQuery(query, [defaultAppPreferences, userId]);
    return results[0];
  }

  /**
   * @param {string|number} userId
   * @param {Record<string, unknown>} preferences
   * @returns {Promise<{ user_id: string|number, user_preference: Record<string, unknown>, updated_at: Date|string }|undefined>}
   */
  async updateUserPreferences(userId, preferences) {
    const query = `
      UPDATE users
      SET user_preference = $1, updated_at = NOW()
      WHERE user_id = $2
      RETURNING user_id, user_preference, updated_at
    `;
    const results = await executeQuery(query, [preferences, userId]);
    return results[0];
  }

  /**
   * @param {string|number} userId
   * @returns {Promise<Record<string, unknown>>}
   */
  async getUserPreferences(userId) {
    const query = `
      SELECT user_preference
      FROM users
      WHERE user_id = $1
    `;
    const results = await executeQuery(query, [userId]);
    return normalizeAppPreferences(results[0]?.user_preference || {});
  }
}
module.exports = new UserDataRepository();
