const BaseRepository = require("./base.repository");
const { executeQuery } = require("@/database/connection");
const { defaultAppPreferences, normalizeAppPreferences } = require("@/modules/users/normalize");
const PlansRepository = require("@/modules/plans/repositories/plans.repository");
const { generatePublicId } = require("@/utils/formatters.util");
const {
  normalizeEmail,
  normalizeUsername,
  normalizePhoneNumber,
} = require("@/modules/users/utils/unique-conflicts.util");

class UsersRepository extends BaseRepository {
  // ==========================================
  // CREATE / ACTIVATE
  // ==========================================

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
      name, username, email, password, timezone, private_profile,
      birth_date, phone_number, avatar_url, user_preference, plan_id, public_user_id
    ) 
    VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
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
        timezone || null,
        private_profile ?? false,
        birth_date || null,
        phone_number || null,
        avatar_url || null,
        defaultAppPreferences,
        resolvedPlanId,
        publicUserId,
      ],
      client
    );
  }

  async createGithubUser(username, name, githubId, client = null) {
    const planId = await PlansRepository.getDefaultSignupPlanId();
    const publicUserId = generatePublicId();
    const query = `
      INSERT INTO users (username, name, github_id, plan_id, public_user_id) 
      VALUES ($1, $2, $3, $4, $5)
      RETURNING user_id, public_user_id;
    `;
    return await executeQuery(query, [username, name, githubId, planId, publicUserId], client);
  }

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
    return await executeQuery(query, values, client);
  }

  // ==========================================
  // READ / SEARCH
  // ==========================================

  async findAll() {
    const query = `
      SELECT name, email, username, 
      CASE WHEN avatar_url IS NOT NULL THEN true ELSE false END as has_profile_image 
      FROM users
    `;
    return await executeQuery(query);
  }

  async findByUsernameOrEmail(username, email) {
    const query = `SELECT * FROM users WHERE (email = $1 OR username = $2) AND deleted = false`;
    return await executeQuery(query, [email, username]);
  }

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

    if (conditions.length === 0) return availability;

    let excludeClause = "";
    if (options.excludeUserId) {
      excludeClause = ` AND user_id <> $${paramIndex++}`;
      values.push(options.excludeUserId);
    }

    const query = `
      SELECT user_id, email, username, phone_number
      FROM users
      WHERE deleted = false AND (${conditions.join(" OR ")}) ${excludeClause}
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
        availability.phone_number = { available: false, reason: "already_in_use" };
      }
    }
    return availability;
  }

  async getUserById(userId) {
    const query = `
      SELECT user_id, username, name, email, avatar_url, created_at 
      FROM users WHERE user_id = $1 AND deleted = false LIMIT 1
    `;
    const results = await executeQuery(query, [userId]);
    return results[0];
  }

  async findById(userId) {
    return this.getUserById(userId);
  }

  async findByGithubId(githubId) {
    const query = `SELECT user_id, username, name FROM users WHERE github_id = $1 LIMIT 1`;
    const results = await executeQuery(query, [githubId]);
    return results[0];
  }

  async searchUsers(searchTerm, searcherUserId) {
    const workspacesQuery = `
      SELECT DISTINCT workspace_id FROM workspace_members
      WHERE user_id = $1::uuid AND deleted = false AND status = 'ACTIVE'::public.workspace_member_status_enum
    `;
    const searcherWorkspaces = await executeQuery(workspacesQuery, [searcherUserId]);
    const workspaceIds = searcherWorkspaces.map((w) => w.workspace_id);

    let usersQuery = `
      SELECT u.user_id, u.username, u.name, u.email, u.avatar_url
      FROM users u
      WHERE (LOWER(u.username) LIKE LOWER($1) OR LOWER(u.email) LIKE LOWER($1))
        AND u.deleted = false AND u.private_profile = false
    `;

    if (workspaceIds.length === 0) {
      usersQuery += `
        AND NOT EXISTS (
          SELECT 1 FROM workspace_members om
          WHERE om.user_id = u.user_id AND om.deleted = false AND om.status = 'ACTIVE'::public.workspace_member_status_enum
        )
      `;
    } else {
      const workspaceIdsList = workspaceIds.map((id) => `'${id}'`).join(",");
      usersQuery += `
        AND EXISTS (
          SELECT 1 FROM workspace_members om
          WHERE om.user_id = u.user_id AND om.deleted = false AND om.status = 'ACTIVE'::public.workspace_member_status_enum
          AND om.workspace_id IN (${workspaceIdsList})
        )
      `;
    }
    usersQuery += ` ORDER BY u.name ASC LIMIT 15;`;
    return await executeQuery(usersQuery, [`%${searchTerm}%`]);
  }

  // ==========================================
  // UPDATE / PREFERENCES
  // ==========================================

  async getProfileImage(userId) {
    const query = `SELECT avatar_url, name FROM users WHERE user_id = $1 LIMIT 1`;
    const results = await executeQuery(query, [userId]);
    return results[0];
  }

  async updateProfileImage(userId, url) {
    const query = `UPDATE users SET avatar_url = $1 WHERE user_id = $2 RETURNING user_id, avatar_url;`;
    return await executeQuery(query, [url, userId]);
  }

  async updateUserProfile(userId, updates, client = null) {
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
        FROM users WHERE user_id = $1 AND deleted = false
      `;
      const results = await executeQuery(query, [userId], client);
      return results[0];
    }

    values.push(userId);
    const query = `
      UPDATE users SET ${fields.join(", ")}
      WHERE user_id = $${paramIndex} AND deleted = false
      RETURNING user_id, username, name, email, avatar_url, theme_mode, birth_date, phone_number, private_profile, user_preference, created_at;
    `;
    const results = await executeQuery(query, values, client);
    return results[0];
  }

  async updateUserPassword(userId, hashedPassword, client = null) {
    const query = `UPDATE users SET password = $1 WHERE user_id = $2 AND deleted = false`;
    return await executeQuery(query, [hashedPassword, userId], client);
  }

  async setDefaultAppPreferences(userId) {
    const query = `UPDATE users SET user_preference = $1 WHERE user_id = $2 RETURNING user_id, user_preference`;
    const results = await executeQuery(query, [defaultAppPreferences, userId]);
    return results[0];
  }

  async updateUserPreferences(userId, preferences) {
    const query = `UPDATE users SET user_preference = $1, updated_at = NOW() WHERE user_id = $2 RETURNING user_id, user_preference, updated_at`;
    const results = await executeQuery(query, [preferences, userId]);
    return results[0];
  }

  async getUserPreferences(userId) {
    const query = `SELECT user_preference FROM users WHERE user_id = $1`;
    const results = await executeQuery(query, [userId]);
    return normalizeAppPreferences(results[0]?.user_preference || {});
  }

  // ==========================================
  // DELETE
  // ==========================================

  async deleteUser(userId, client = null) {
    const randomSuffix = Math.floor(Math.random() * 1000000000);
    const query = `
      UPDATE users SET 
        email = $2, username = $3, phone_number = NULL, avatar_url = NULL, 
        name = 'Deleted User', deleted = TRUE, deleted_at = NOW()
      WHERE user_id = $1
      RETURNING user_id
    `;
    const deletedUserDomain = process.env.APP_DOMAIN || "weavenotes.app";
    return await executeQuery(
      query,
      [userId, `deleted_user_${randomSuffix}@${deletedUserDomain}`, `deleted_user_${randomSuffix}`],
      client
    );
  }

  // ==========================================
  // WORKSPACE SCOPE
  // ==========================================

  async getActiveWorkspaceIdsForUser(userId) {
    const query = `
      SELECT DISTINCT workspace_id::text FROM workspace_members
      WHERE user_id = $1::uuid AND deleted = false AND status = 'ACTIVE'::public.workspace_member_status_enum
    `;
    const rows = await executeQuery(query, [userId]);
    return rows.map((r) => r.workspace_id);
  }

  async usersMayInteract(actorUserId, targetUserId) {
    const query = `
      WITH actor_workspaces AS (
        SELECT DISTINCT workspace_id FROM workspace_members
        WHERE user_id = $1::uuid AND deleted = false AND status = 'ACTIVE'::public.workspace_member_status_enum
      ),
      target_workspaces AS (
        SELECT DISTINCT workspace_id FROM workspace_members
        WHERE user_id = $2::uuid AND deleted = false AND status = 'ACTIVE'::public.workspace_member_status_enum
      ),
      actor_count AS (SELECT COUNT(*)::int AS c FROM actor_workspaces),
      target_count AS (SELECT COUNT(*)::int AS c FROM target_workspaces)
      SELECT
        (SELECT c FROM actor_count) AS actor_workspace_count,
        (SELECT c FROM target_count) AS target_workspace_count,
        EXISTS (
          SELECT 1 FROM actor_workspaces a
          INNER JOIN target_workspaces t ON a.workspace_id = t.workspace_id
        ) AS intersects
    `;
    const rows = await executeQuery(query, [actorUserId, targetUserId]);
    const row = rows[0];
    if (!row) return false;

    const actorN = Number(row.actor_workspace_count) || 0;
    const targetN = Number(row.target_workspace_count) || 0;

    if (actorN === 0 && targetN === 0) return true;
    if (actorN === 0 || targetN === 0) return false;
    return Boolean(row.intersects);
  }
}

module.exports = new UsersRepository();
