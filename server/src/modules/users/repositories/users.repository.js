const BaseRepository = require("./base.repository");
const { prisma } = require("@theweave/database");
const {
  defaultAppPreferences,
  normalizeAppPreferences,
} = require("@/modules/users/utils/normalize");
const PlansRepository = require("@/modules/plans/repositories/plans.repository");
const { generatePublicId } = require("@/utils/formatters.util");
const {
  normalizeEmail,
  normalizeUsername,
  normalizePhoneNumber,
} = require("@/modules/users/utils/unique-conflicts.util");

/**
 * @typedef {Object} CreateUserData
 * @property {string|null} [name] - User's display name.
 * @property {string} username - User's unique handle.
 * @property {string} email - User's email address.
 * @property {string} [password] - Hashed password.
 * @property {string} [timezone] - Preferred timezone.
 * @property {boolean} [private_profile] - Privacy flag.
 * @property {string|Date} [birth_date] - Date of birth.
 * @property {string} [phone_number] - Contact phone number.
 * @property {string} [avatar_url] - Profile picture URL.
 * @property {string} [plan_id] - Plan UUID.
 * @property {Record<string, any>} [onboarding_state] - Initial onboarding metadata.
 */

/**
 * @typedef {Object} UpdateActivationData
 * @property {string|null} [name] - User's display name.
 * @property {string} username - Unique username handle.
 * @property {string} password - Hashed account password.
 * @property {string} [timezone] - Preferred timezone string.
 * @property {boolean} [private_profile] - Profile privacy flag.
 * @property {string|Date} [birth_date] - Birth date representation.
 * @property {string} [phone_number] - Phone number.
 * @property {Record<string, any>} [onboarding_state] - Onboarding state object.
 */

/**
 * @typedef {Object} UniqueFieldsCheck
 * @property {string} [email] - Email address to check.
 * @property {string} [username] - Handle/username to check.
 * @property {string} [phone_number] - Phone number to check.
 */

/**
 * @typedef {Object} CheckAvailabilityOptions
 * @property {string} [excludeUserId] - Optional user UUID to exclude from unique checks.
 */

/**
 * @typedef {Object} FieldAvailability
 * @property {boolean} available - Indicates if the field is available.
 * @property {string} [reason] - Failure reason (e.g. 'already_in_use').
 */

/**
 * @typedef {Object} UniqueAvailabilityResult
 * @property {FieldAvailability} email - Email availability status.
 * @property {FieldAvailability} phone_number - Phone number availability status.
 * @property {FieldAvailability} username - Username availability status.
 */

/**
 * @typedef {Object} UpdateUserProfileData
 * @property {string} [name] - Updated display name.
 * @property {string} [email] - Updated email address.
 * @property {string} [username] - Updated handle.
 * @property {string} [theme_mode] - Theme preference ('LIGHT' | 'DARK').
 * @property {string|Date} [birth_date] - Updated birth date.
 * @property {string} [phone_number] - Updated phone number.
 * @property {boolean} [private_profile] - Updated privacy flag.
 * @property {Record<string, any>} [user_preference] - Custom app preferences.
 */

/**
 * Repository responsible for user persistence, authentication details, profile management, and workspace interaction scoping.
 */
class UsersRepository extends BaseRepository {
  // ==========================================
  // CREATE / ACTIVATE
  // ==========================================

  /**
   * Creates a new user record with standard preferences and plan assignment.
   *
   * @param {CreateUserData} userData - Data payload for the new user.
   * @param {import('@prisma/client').PrismaClient | import('@prisma/client').Prisma.TransactionClient} [client=prisma] - Transaction or client instance.
   * @returns {Promise<{ avatar_url: string|null, created_at: Date, email: string, name: string, public_user_id: string, user_id: string }>} Created user fields.
   */
  async createUser(userData, client = prisma) {
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
      onboarding_state,
    } = userData;

    const resolvedPlanId = plan_id || (await PlansRepository.getDefaultSignupPlanId());
    const publicUserId = generatePublicId();

    return await client.users.create({
      data: {
        avatar_url: avatar_url || null,
        birth_date: birth_date ? new Date(birth_date) : null,
        email,
        name: name ?? null,
        onboarding_state: onboarding_state || undefined,
        password,
        phone_number: phone_number || null,
        plan_id: resolvedPlanId,
        private_profile: private_profile ?? false,
        public_user_id: publicUserId,
        timezone: timezone || null,
        user_preference: defaultAppPreferences,
        username,
      },
      select: {
        avatar_url: true,
        created_at: true,
        email: true,
        name: true,
        public_user_id: true,
        user_id: true,
      },
    });
  }

  /**
   * Creates a user account initialized via GitHub OAuth authentication.
   *
   * @param {string} username - Unique handle.
   * @param {string} name - Display name.
   * @param {number|string} githubId - GitHub account unique identifier.
   * @param {import('@prisma/client').PrismaClient | import('@prisma/client').Prisma.TransactionClient} [client=prisma] - Transaction or client instance.
   * @returns {Promise<{ public_user_id: string, user_id: string }>} Essential user IDs.
   */
  async createGithubUser(username, name, githubId, client = prisma) {
    const planId = await PlansRepository.getDefaultSignupPlanId();
    const publicUserId = generatePublicId();

    return await client.users.create({
      data: {
        github_id: githubId,
        name,
        plan_id: planId,
        public_user_id: publicUserId,
        username,
      },
      select: {
        public_user_id: true,
        user_id: true,
      },
    });
  }

  /**
   * Activates a pending/invited user account by setting their credentials and initial profile state.
   *
   * @param {string} userId - Target user UUID.
   * @param {UpdateActivationData} userData - Activation payload.
   * @param {import('@prisma/client').PrismaClient | import('@prisma/client').Prisma.TransactionClient} [client=prisma] - Transaction or client instance.
   * @returns {Promise<{ created_at: Date, email: string, name: string, user_id: string, username: string }>} Updated user info.
   */
  async updateUserActivation(userId, userData, client = prisma) {
    const {
      name,
      username,
      password,
      timezone,
      private_profile,
      birth_date,
      phone_number,
      onboarding_state,
    } = userData;

    return await client.users.update({
      data: {
        birth_date: birth_date ? new Date(birth_date) : null,
        name: name ?? null,
        onboarding_state: onboarding_state || undefined,
        password,
        phone_number,
        private_profile: private_profile || false,
        status: "ACTIVE",
        timezone,
        updated_at: new Date(),
        username,
      },
      select: {
        created_at: true,
        email: true,
        name: true,
        user_id: true,
        username: true,
      },
      where: { user_id: userId },
    });
  }

  // ==========================================
  // READ / SEARCH
  // ==========================================

  /**
   * Retrieves a lightweight list of all non-deleted users.
   *
   * @param {import('@prisma/client').PrismaClient | import('@prisma/client').Prisma.TransactionClient} [client=prisma] - Transaction or client instance.
   * @returns {Promise<Array<{ email: string, has_profile_image: boolean, name: string, username: string }>>} List of users.
   */
  async findAll(client = prisma) {
    const users = await client.users.findMany({
      select: {
        avatar_url: true,
        email: true,
        name: true,
        username: true,
      },
    });
    return users.map((u) => ({
      email: u.email,
      has_profile_image: u.avatar_url !== null,
      name: u.name,
      username: u.username,
    }));
  }

  /**
   * Finds active (non-deleted) users matching either the username or email.
   *
   * @param {string} username - Target handle.
   * @param {string} email - Target email.
   * @param {import('@prisma/client').PrismaClient | import('@prisma/client').Prisma.TransactionClient} [client=prisma] - Transaction or client instance.
   * @returns {Promise<import('@prisma/client').users[]>} Matching user entities.
   */
  async findByUsernameOrEmail(username, email, client = prisma) {
    return await client.users.findMany({
      where: {
        deleted: false,
        OR: [{ email: email }, { username: username }],
      },
    });
  }

  /**
   * Checks the availability of unique fields (email, username, phone_number).
   *
   * @param {UniqueFieldsCheck} fields - Object containing values to check.
   * @param {CheckAvailabilityOptions} [options={}] - Options for excluding a user ID.
   * @param {import('@prisma/client').PrismaClient | import('@prisma/client').Prisma.TransactionClient} [client=prisma] - Transaction or client instance.
   * @returns {Promise<UniqueAvailabilityResult>} Availability status per field.
   */
  async checkUniqueAvailability(fields, options = {}, client = prisma) {
    const email = normalizeEmail(fields.email);
    const username = normalizeUsername(fields.username);
    const phoneNumber = normalizePhoneNumber(fields.phone_number);

    const availability = {
      email: { available: true },
      phone_number: { available: true },
      username: { available: true },
    };

    const OR = [];
    if (email) OR.push({ email: { equals: email, mode: "insensitive" } });
    if (username) OR.push({ username });
    if (phoneNumber) OR.push({ phone_number: phoneNumber });

    if (OR.length === 0) return availability;

    const where = {
      deleted: false,
      OR,
    };

    if (options.excludeUserId) {
      where.user_id = { not: options.excludeUserId };
    }

    const existingUsers = await client.users.findMany({
      select: {
        email: true,
        phone_number: true,
        user_id: true,
        username: true,
      },
      where,
    });

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

  /**
   * Retrieves a non-deleted user by their UUID.
   *
   * @param {string} userId - Target user UUID.
   * @param {import('@prisma/client').PrismaClient | import('@prisma/client').Prisma.TransactionClient} [client=prisma] - Transaction or client instance.
   * @returns {Promise<{ avatar_url: string|null, created_at: Date, email: string, name: string, user_id: string, username: string } | null>} User record or null.
   */
  async getUserById(userId, client = prisma) {
    return await client.users.findFirst({
      select: {
        avatar_url: true,
        created_at: true,
        email: true,
        name: true,
        user_id: true,
        username: true,
      },
      where: {
        deleted: false,
        user_id: userId,
      },
    });
  }

  /**
   * Alias for getUserById. Retrieves user profile info by ID.
   *
   * @param {string} userId - Target user UUID.
   * @param {import('@prisma/client').PrismaClient | import('@prisma/client').Prisma.TransactionClient} [client=prisma] - Transaction or client instance.
   * @returns {Promise<{ avatar_url: string|null, created_at: Date, email: string, name: string, user_id: string, username: string } | null>} User record or null.
   */
  async findById(userId, client = prisma) {
    return this.getUserById(userId, client);
  }

  /**
   * Finds a user by their linked GitHub ID.
   *
   * @param {number|string} githubId - GitHub user identifier.
   * @param {import('@prisma/client').PrismaClient | import('@prisma/client').Prisma.TransactionClient} [client=prisma] - Transaction or client instance.
   * @returns {Promise<{ name: string, user_id: string, username: string } | null>} Matching user record or null.
   */
  async findByGithubId(githubId, client = prisma) {
    return await client.users.findFirst({
      select: {
        name: true,
        user_id: true,
        username: true,
      },
      where: {
        github_id: githubId,
      },
    });
  }

  /**
   * Searches for users by handle or email within shared workspaces or public profiles.
   *
   * @param {string} searchTerm - Query string to match against username or email.
   * @param {string} searcherUserId - UUID of the requesting user.
   * @param {import('@prisma/client').PrismaClient | import('@prisma/client').Prisma.TransactionClient} [client=prisma] - Transaction or client instance.
   * @returns {Promise<Array<{ avatar_url: string|null, email: string, name: string, user_id: string, username: string }>>} List of matched users.
   */
  async searchUsers(searchTerm, searcherUserId, client = prisma) {
    const workspaces = await client.workspace_members.findMany({
      select: { workspace_id: true },
      where: {
        deleted: false,
        status: "ACTIVE",
        user_id: searcherUserId,
      },
    });

    const workspaceIds = workspaces.map((w) => w.workspace_id);

    const whereClause = {
      deleted: false,
      OR: [
        { username: { contains: searchTerm, mode: "insensitive" } },
        { email: { contains: searchTerm, mode: "insensitive" } },
      ],
      private_profile: false,
    };

    if (workspaceIds.length === 0) {
      whereClause.workspace_members_workspace_members_user_idTousers = {
        none: {
          deleted: false,
          status: "ACTIVE",
        },
      };
    } else {
      whereClause.workspace_members_workspace_members_user_idTousers = {
        some: {
          deleted: false,
          status: "ACTIVE",
          workspace_id: { in: workspaceIds },
        },
      };
    }

    return await client.users.findMany({
      orderBy: {
        name: "asc",
      },
      select: {
        avatar_url: true,
        email: true,
        name: true,
        user_id: true,
        username: true,
      },
      take: 15,
      where: whereClause,
    });
  }

  // ==========================================
  // UPDATE / PREFERENCES
  // ==========================================

  /**
   * Retrieves a user's avatar image URL and display name.
   *
   * @param {string} userId - Target user UUID.
   * @param {import('@prisma/client').PrismaClient | import('@prisma/client').Prisma.TransactionClient} [client=prisma] - Transaction or client instance.
   * @returns {Promise<{ avatar_url: string|null, name: string } | null>} Profile image information.
   */
  async getProfileImage(userId, client = prisma) {
    return await client.users.findFirst({
      select: { avatar_url: true, name: true },
      where: { user_id: userId },
    });
  }

  /**
   * Updates a user's profile avatar URL.
   *
   * @param {string} userId - Target user UUID.
   * @param {string|null} url - New avatar image URL.
   * @param {import('@prisma/client').PrismaClient | import('@prisma/client').Prisma.TransactionClient} [client=prisma] - Transaction or client instance.
   * @returns {Promise<{ avatar_url: string|null, user_id: string }>} Updated user avatar record.
   */
  async updateProfileImage(userId, url, client = prisma) {
    return await client.users.update({
      data: { avatar_url: url },
      select: { avatar_url: true, user_id: true },
      where: { user_id: userId },
    });
  }

  /**
   * Updates general profile fields and user settings.
   *
   * @param {string} userId - Target user UUID.
   * @param {UpdateUserProfileData} updates - Partial profile fields to modify.
   * @param {import('@prisma/client').PrismaClient | import('@prisma/client').Prisma.TransactionClient} [client=prisma] - Transaction or client instance.
   * @returns {Promise<import('@prisma/client').users>} Updated user record.
   */
  async updateUserProfile(userId, updates, client = prisma) {
    const data = {};
    if (updates.name !== undefined) data.name = updates.name;
    if (updates.email !== undefined) data.email = updates.email;
    if (updates.username !== undefined) data.username = updates.username;
    if (updates.theme_mode !== undefined) {
      const upper = String(updates.theme_mode).trim().toUpperCase();
      if (upper === "LIGHT" || upper === "DARK") {
        data.theme_mode = upper;
      }
    }
    if (updates.birth_date !== undefined)
      data.birth_date = updates.birth_date ? new Date(updates.birth_date) : null;
    if (updates.phone_number !== undefined) data.phone_number = updates.phone_number;
    if (updates.private_profile !== undefined) data.private_profile = updates.private_profile;
    if (updates.user_preference !== undefined) data.user_preference = updates.user_preference;

    if (Object.keys(data).length === 0) {
      return await client.users.findFirst({
        select: {
          avatar_url: true,
          birth_date: true,
          created_at: true,
          email: true,
          name: true,
          phone_number: true,
          private_profile: true,
          theme_mode: true,
          user_id: true,
          user_preference: true,
          username: true,
        },
        where: { deleted: false, user_id: userId },
      });
    }

    return await client.users.update({
      data,
      select: {
        avatar_url: true,
        birth_date: true,
        created_at: true,
        email: true,
        name: true,
        phone_number: true,
        private_profile: true,
        theme_mode: true,
        user_id: true,
        user_preference: true,
        username: true,
      },
      where: { user_id: userId },
    });
  }

  /**
   * Updates a user's account password hash.
   *
   * @param {string} userId - Target user UUID.
   * @param {string} hashedPassword - Pre-hashed password.
   * @param {import('@prisma/client').PrismaClient | import('@prisma/client').Prisma.TransactionClient} [client=prisma] - Transaction or client instance.
   * @returns {Promise<Array<{ user_id: string }>>} List containing user ID if updated.
   */
  async updateUserPassword(userId, hashedPassword, client = prisma) {
    const result = await client.users.updateMany({
      data: { password: hashedPassword },
      where: { deleted: false, user_id: userId },
    });
    return result.count > 0 ? [{ user_id: userId }] : [];
  }

  /**
   * Resets app preferences to system defaults for a user.
   *
   * @param {string} userId - Target user UUID.
   * @param {import('@prisma/client').PrismaClient | import('@prisma/client').Prisma.TransactionClient} [client=prisma] - Transaction or client instance.
   * @returns {Promise<{ user_id: string, user_preference: any }>} Updated user preference record.
   */
  async setDefaultAppPreferences(userId, client = prisma) {
    return await client.users.update({
      data: { user_preference: defaultAppPreferences },
      select: { user_id: true, user_preference: true },
      where: { user_id: userId },
    });
  }

  /**
   * Updates custom JSON app preferences for a user.
   *
   * @param {string} userId - Target user UUID.
   * @param {Record<string, any>} preferences - New preference object.
   * @param {import('@prisma/client').PrismaClient | import('@prisma/client').Prisma.TransactionClient} [client=prisma] - Transaction or client instance.
   * @returns {Promise<{ updated_at: Date, user_id: string, user_preference: any }>} Updated user record.
   */
  async updateUserPreferences(userId, preferences, client = prisma) {
    return await client.users.update({
      data: { updated_at: new Date(), user_preference: preferences },
      select: { updated_at: true, user_id: true, user_preference: true },
      where: { user_id: userId },
    });
  }

  /**
   * Fetches and normalizes app preferences for a user.
   *
   * @param {string} userId - Target user UUID.
   * @param {import('@prisma/client').PrismaClient | import('@prisma/client').Prisma.TransactionClient} [client=prisma] - Transaction or client instance.
   * @returns {Promise<Record<string, any>>} Normalized application preferences.
   */
  async getUserPreferences(userId, client = prisma) {
    const result = await client.users.findUnique({
      select: { user_preference: true },
      where: { user_id: userId },
    });
    return normalizeAppPreferences(result?.user_preference || {});
  }

  // ==========================================
  // DELETE
  // ==========================================

  /**
   * Soft deletes a user account by anonymizing personal data and flagging as deleted.
   *
   * @param {string} userId - Target user UUID.
   * @param {import('@prisma/client').PrismaClient | import('@prisma/client').Prisma.TransactionClient} [client=prisma] - Transaction or client instance.
   * @returns {Promise<{ user_id: string }>} Deleted user reference.
   */
  async deleteUser(userId, client = prisma) {
    const randomSuffix = Math.floor(Math.random() * 1000000000);
    const deletedUserDomain = process.env.APP_DOMAIN || "weavenotes.app";

    return await client.users.update({
      data: {
        avatar_url: null,
        deleted: true,
        deleted_at: new Date(),
        email: `deleted_user_${randomSuffix}@${deletedUserDomain}`,
        name: "Deleted User",
        phone_number: null,
        username: `deleted_user_${randomSuffix}`,
      },
      select: { user_id: true },
      where: { user_id: userId },
    });
  }

  // ==========================================
  // WORKSPACE SCOPE
  // ==========================================

  /**
   * Fetches active workspace IDs where the given user is a member.
   *
   * @param {string} userId - Target user UUID.
   * @param {import('@prisma/client').PrismaClient | import('@prisma/client').Prisma.TransactionClient} [client=prisma] - Transaction or client instance.
   * @returns {Promise<string[]>} Array of workspace UUIDs.
   */
  async getActiveWorkspaceIdsForUser(userId, client = prisma) {
    const rows = await client.workspace_members.findMany({
      distinct: ["workspace_id"],
      select: { workspace_id: true },
      where: {
        deleted: false,
        status: "ACTIVE",
        user_id: userId,
      },
    });
    return rows.map((r) => r.workspace_id);
  }

  /**
   * Evaluates if two users can interact by checking if they share active workspace memberships.
   *
   * @param {string} actorUserId - Initiating user UUID.
   * @param {string} targetUserId - Recipient/target user UUID.
   * @param {import('@prisma/client').PrismaClient | import('@prisma/client').Prisma.TransactionClient} [client=prisma] - Transaction or client instance.
   * @returns {Promise<boolean>} True if interaction is permitted, false otherwise.
   */
  async usersMayInteract(actorUserId, targetUserId, client = prisma) {
    const rows = await client.$queryRaw`
      WITH actor_workspaces AS (
        SELECT DISTINCT workspace_id FROM workspace_members
        WHERE user_id = ${actorUserId}::uuid AND deleted = false AND status = 'ACTIVE'::public.workspace_member_status_enum
      ),
      target_workspaces AS (
        SELECT DISTINCT workspace_id FROM workspace_members
        WHERE user_id = ${targetUserId}::uuid AND deleted = false AND status = 'ACTIVE'::public.workspace_member_status_enum
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
