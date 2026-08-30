const BaseRepository = require("./base.repository");
const { executeQuery } = require("@/database/connection");
const {
  normalizeEmail,
  normalizeUsername,
  normalizePhoneNumber,
} = require("@/modules/users/utils/unique-conflicts");

/**
 * Read and search queries for `users` table.
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
   * Check availability of unique fields in `users`.
   *
   * @param {{ email?: unknown, username?: unknown, phone_number?: unknown }} fields
   * @param {{ excludeUserId?: string|number }} [options]
   * @returns {Promise<{ email: { available: boolean, reason?: string }, username: { available: boolean, reason?: string }, phone_number: { available: boolean, reason?: string } }>}
   */
  async checkUniqueAvailability(fields, options = {}) {
    const email = normalizeEmail(fields.email);
    const username = normalizeUsername(fields.username);
    const phoneNumber = normalizePhoneNumber(fields.phone_number);

    const availability = {
      email: { available: true },
      phone_number: { available: true },
      username: { available: true },
    };

    const conditions = [];
    const values = [];
    let paramIndex = 1;

    if (email) {
      conditions.push(`LOWER(email) = LOWER($${paramIndex++})`);
      values.push(email);
    }
    if (username) {
      conditions.push(`username = $${paramIndex++}`);
      values.push(username);
    }
    if (phoneNumber) {
      conditions.push(`phone_number = $${paramIndex++}`);
      values.push(phoneNumber);
    }

    if (conditions.length === 0) {
      return availability;
    }

    let excludeClause = "";
    if (options.excludeUserId) {
      excludeClause = ` AND user_id <> $${paramIndex++}`;
      values.push(options.excludeUserId);
    }

    const query = `
      SELECT user_id, email, username, phone_number
      FROM users
      WHERE deleted = false
        AND (${conditions.join(" OR ")})
        ${excludeClause}
    `;

    const existingUsers = await executeQuery(query, values);

    for (const user of existingUsers) {
      if (email && normalizeEmail(user.email) === email) {
        availability.email = { available: false, reason: "already_in_use" };
      }
      if (username && normalizeUsername(user.username) === username) {
        availability.username = { available: false, reason: "already_in_use" };
      }
      if (phoneNumber && normalizePhoneNumber(user.phone_number) === phoneNumber) {
        availability.phone_number = {
          available: false,
          reason: "already_in_use",
        };
      }
    }

    return availability;
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
   * @param {string} searchTerm Search string for username or email.
   * @param {string} searcherUserId Authenticated user for workspace isolation.
   * @returns {Promise<import('pg').QueryResultRow[]>}
   */
  async searchUsers(searchTerm, searcherUserId) {
    // 1. Identify searcher's active workspaces
    const orgsQuery = `
      SELECT DISTINCT organization_id
      FROM organization_members
      WHERE user_id = $1::uuid
        AND deleted = false
        AND status = 'ACTIVE'::public.organization_member_status_enum
    `;
    const searcherOrgs = await executeQuery(orgsQuery, [searcherUserId]);
    const orgIds = searcherOrgs.map((org) => org.organization_id);
    const hasOrgs = orgIds.length > 0;

    let usersQuery = `
      SELECT u.user_id, u.username, u.name, u.email, u.avatar_url
      FROM users u
      WHERE (LOWER(u.username) LIKE LOWER($1) OR LOWER(u.email) LIKE LOWER($1))
        AND u.deleted = false
        AND u.private_profile = false
    `;

    // 2. Isolate results: if no orgs, return org-less users
    // If has orgs, return users within the same orgs
    if (!hasOrgs) {
      usersQuery += `
        AND NOT EXISTS (
          SELECT 1 FROM organization_members om
          WHERE om.user_id = u.user_id
            AND om.deleted = false
            AND om.status = 'ACTIVE'::public.organization_member_status_enum
        )
      `;
    } else {
      const orgIdsList = orgIds.map((id) => `'${id}'`).join(",");
      usersQuery += `
        AND EXISTS (
          SELECT 1 FROM organization_members om
          WHERE om.user_id = u.user_id
            AND om.deleted = false
            AND om.status = 'ACTIVE'::public.organization_member_status_enum
            AND om.organization_id IN (${orgIdsList})
        )
      `;
    }

    usersQuery += ` ORDER BY u.name ASC LIMIT 15;`;

    return await executeQuery(usersQuery, [`%${searchTerm}%`]);
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
