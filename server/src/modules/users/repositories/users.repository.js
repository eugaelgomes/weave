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
      onboarding_state,
    } = userData;

    const resolvedPlanId = plan_id || (await PlansRepository.getDefaultSignupPlanId());
    const publicUserId = generatePublicId();

    const db = client || prisma;

    return await db.users.create({
      data: {
        avatar_url: avatar_url || null,
        birth_date: birth_date ? new Date(birth_date) : null,
        email,
        name,
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

  async createGithubUser(username, name, githubId, client = null) {
    const planId = await PlansRepository.getDefaultSignupPlanId();
    const publicUserId = generatePublicId();
    const db = client || prisma;

    return await db.users.create({
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

  async updateUserActivation(userId, userData, client = null) {
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

    const db = client || prisma;
    return await db.users.update({
      data: {
        birth_date: birth_date ? new Date(birth_date) : null,
        name,
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

  async findAll() {
    const users = await prisma.users.findMany({
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

  async findByUsernameOrEmail(username, email) {
    return await prisma.users.findMany({
      where: {
        deleted: false,
        OR: [{ email: email }, { username: username }],
      },
    });
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

    const existingUsers = await prisma.users.findMany({
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

  async getUserById(userId) {
    return await prisma.users.findFirst({
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

  async findById(userId) {
    return this.getUserById(userId);
  }

  async findByGithubId(githubId) {
    return await prisma.users.findFirst({
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

  async searchUsers(searchTerm, searcherUserId) {
    const workspaces = await prisma.workspace_members.findMany({
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

    return await prisma.users.findMany({
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

  async getProfileImage(userId) {
    return await prisma.users.findFirst({
      select: { avatar_url: true, name: true },
      where: { user_id: userId },
    });
  }

  async updateProfileImage(userId, url) {
    return await prisma.users.update({
      data: { avatar_url: url },
      select: { avatar_url: true, user_id: true },
      where: { user_id: userId },
    });
  }

  async updateUserProfile(userId, updates, client = null) {
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

    const db = client || prisma;

    if (Object.keys(data).length === 0) {
      return await db.users.findFirst({
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

    return await db.users.update({
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

  async updateUserPassword(userId, hashedPassword, client = null) {
    const db = client || prisma;
    const result = await db.users.updateMany({
      data: { password: hashedPassword },
      where: { deleted: false, user_id: userId },
    });
    return result.count > 0 ? [{ user_id: userId }] : [];
  }

  async setDefaultAppPreferences(userId) {
    return await prisma.users.update({
      data: { user_preference: defaultAppPreferences },
      select: { user_id: true, user_preference: true },
      where: { user_id: userId },
    });
  }

  async updateUserPreferences(userId, preferences) {
    return await prisma.users.update({
      data: { updated_at: new Date(), user_preference: preferences },
      select: { updated_at: true, user_id: true, user_preference: true },
      where: { user_id: userId },
    });
  }

  async getUserPreferences(userId) {
    const result = await prisma.users.findUnique({
      select: { user_preference: true },
      where: { user_id: userId },
    });
    return normalizeAppPreferences(result?.user_preference || {});
  }

  // ==========================================
  // DELETE
  // ==========================================

  async deleteUser(userId, client = null) {
    const randomSuffix = Math.floor(Math.random() * 1000000000);
    const deletedUserDomain = process.env.APP_DOMAIN || "weavenotes.app";
    const db = client || prisma;

    return await db.users.update({
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

  async getActiveWorkspaceIdsForUser(userId) {
    const rows = await prisma.workspace_members.findMany({
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

  async usersMayInteract(actorUserId, targetUserId) {
    const rows = await prisma.$queryRaw`
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
