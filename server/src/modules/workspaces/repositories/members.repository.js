const { prisma } = require("@theweave/database");
const { generatePublicId } = require("@/utils/formatters.util");

/**
 * @typedef {import('@prisma/client').PrismaClient} PrismaClient
 * @typedef {import('@prisma/client').workspace_members} WorkspaceMember
 * @typedef {import('@prisma/client').workspace_roles} WorkspaceRole
 */

class WorkspaceMembersRepository {
  /**
   * Retrieves the role names of a workspace member.
   * @param {string} workspace_id - The workspace ID.
   * @param {string} user_id - The user ID.
   * @param {PrismaClient} [client=prisma] - Optional Prisma client instance for transactions.
   * @returns {Promise<string[]>} Array of role names.
   */
  async getMembershipRole(workspace_id, user_id, client = prisma) {
    const member = await client.workspace_members.findFirst({
      include: {
        workspace_member_roles: {
          include: {
            workspace_roles: true,
          },
        },
      },
      where: { deleted: false, user_id, workspace_id },
    });
    return member?.workspace_member_roles.map((wmr) => wmr.workspace_roles.name) ?? [];
  }

  /**
   * Retrieves memberships for multiple users in a workspace.
   * @param {string[]} userIds - Array of user IDs.
   * @param {string} workspaceId - The workspace ID.
   * @param {PrismaClient} [client=prisma] - Optional Prisma client instance for transactions.
   * @returns {Promise<Array<{user_id: string, roles: string[], status: string}>>} Array of memberships.
   */
  async getMembershipsByUserIds(userIds, workspaceId, client = prisma) {
    if (!userIds || userIds.length === 0) return [];

    const members = await client.workspace_members.findMany({
      include: {
        workspace_member_roles: {
          include: {
            workspace_roles: true,
          },
        },
      },
      where: {
        deleted: false,
        user_id: { in: userIds },
        workspace_id: workspaceId,
      },
    });

    return members.map((member) => ({
      roles: member.workspace_member_roles.map((wmr) => wmr.workspace_roles.name),
      status: member.status,
      user_id: member.user_id,
    }));
  }

  /**
   * Retrieves paginated workspace members with extended details (roles, permissions, notes count, projects, teams, last login).
   * Note: This method retains a raw query due to the high complexity of the aggregations.
   * @param {string} workspace_id - The workspace ID.
   * @param {Object} options - Pagination and filter options.
   * @param {number} [options.page=1]
   * @param {number} [options.limit=50]
   * @param {string} [options.search=""]
   * @param {string|null} [options.role_id=null]
   * @param {string|null} [options.status=null]
   * @param {PrismaClient} [client=prisma] - Optional Prisma client instance.
   * @returns {Promise<any[]>} Paginated member records.
   */
  async getWorkspaceMembers(
    workspace_id,
    { page = 1, limit = 50, search = "", role_id = null, status = null } = {},
    client = prisma
  ) {
    const offset = (page - 1) * limit;

    const query = `
      WITH filtered_members AS (
        SELECT 
          om.id,
          om.workspace_id,
          om.user_id,
          om.status,
          om.invited_by,
          om.created_at,
          om.updated_at,
          u1.name,
          u1.username,
          u1.email,
          u1.avatar_url,
          u2.name as inviter_name,
          u2.username as inviter_username,
          u2.avatar_url as inviter_avatar_url
        FROM workspace_members om
        JOIN users u1 ON om.user_id = u1.user_id
        LEFT JOIN users u2 ON om.invited_by = u2.user_id
        WHERE om.workspace_id = $1::uuid
          AND om.deleted = false
          AND ($2::text = '' OR u1.name ILIKE '%' || $2 || '%' OR u1.email ILIKE '%' || $2 || '%')
          AND ($3::uuid IS NULL OR EXISTS (SELECT 1 FROM workspace_member_roles wmr WHERE wmr.workspace_member_id = om.id AND wmr.role_id = $3::uuid))
          AND ($4::text IS NULL OR om.status::text = $4::text)
      ),
      total_count AS (
        SELECT COUNT(*) as count FROM filtered_members
      ),
      paginated_members AS (
        SELECT * FROM filtered_members
        ORDER BY created_at DESC
        LIMIT $5::int OFFSET $6::int
      )
      SELECT 
        pm.*,
        (SELECT count FROM total_count) as total_count,
        (
          SELECT array_agg(DISTINCT r.name)
          FROM workspace_member_roles wmr 
          JOIN workspaces_roles r ON r.id = wmr.role_id
          WHERE wmr.workspace_member_id = pm.id
        ) as roles,
        (
          SELECT jsonb_agg(DISTINCT perm)
          FROM workspace_member_roles wmr2
          JOIN workspaces_roles r2 ON r2.id = wmr2.role_id
          CROSS JOIN jsonb_array_elements(r2.permissions) as perm
          WHERE wmr2.workspace_member_id = pm.id
        ) as accumulated_permissions,
        (SELECT COUNT(*) 
         FROM notes n 
         WHERE n.user_id = pm.user_id AND n.deleted = false) as notes_count,
        (SELECT COALESCE(json_agg(json_build_object(
           'project_id', p.id::text,
           'project_name', p.title,
           'role', prm.role
         )), '[]'::json)
         FROM project_members prm
         JOIN projects p ON p.id = prm.project_id
         WHERE prm.user_id = pm.user_id
           AND prm.deleted = false 
           AND p.deleted = false) as projects,
        (SELECT COALESCE(json_agg(json_build_object(
           'team_id', a.id::text,
           'team_name', a.name,
           'role', tr.name
         )), '[]'::json)
         FROM team_members am
         JOIN teams a ON a.id = am.team_id
         JOIN workspaces_roles tr ON tr.id = am.role_id
         WHERE am.user_id = pm.user_id
           AND am.deleted = false 
           AND a.deleted = false
           AND a.workspace_id = pm.workspace_id) as teams,
        (SELECT ul.created_at as last_login_at
         FROM user_logs ul
         WHERE ul.user_id = pm.user_id 
           AND ul.log_type = 'AUTH_LOGIN'
         ORDER BY ul.created_at DESC
         LIMIT 1) as last_login
      FROM paginated_members pm
      ORDER BY pm.created_at DESC;
    `;

    const results = await client.$queryRawUnsafe(
      query,
      workspace_id,
      search || "",
      role_id,
      status,
      limit,
      offset
    );

    return results.map((row) => ({
      ...row,
      notes_count: Number(row.notes_count),
      total_count: Number(row.total_count),
    }));
  }

  /**
   * Counts active members by role name.
   * @param {string} workspace_id - The workspace ID.
   * @param {string} role - The role name.
   * @param {PrismaClient} [client=prisma] - Optional Prisma client instance.
   * @returns {Promise<number>} Total count of active members with the given role.
   */
  async countActiveMembersByRole(workspace_id, role, client = prisma) {
    return client.workspace_members.count({
      where: {
        deleted: false,
        workspace_id,
        workspace_member_roles: {
          some: {
            workspace_roles: {
              name: {
                equals: role,
                mode: "insensitive",
              },
            },
          },
        },
      },
    });
  }

  /**
   * Adds a new workspace member or restores a deleted one (upsert), and assigns roles.
   * @param {string} workspace_id - The workspace ID.
   * @param {string} user_id - The user ID.
   * @param {string|string[]} role_ids - One or more role IDs to assign.
   * @param {string} status - Member status.
   * @param {string} invited_by - The user ID of the inviter.
   * @param {PrismaClient} [client=prisma] - Optional Prisma client instance for transactions.
   * @returns {Promise<WorkspaceMember>} The added or updated member.
   */
  async addWorkspaceMember(workspace_id, user_id, role_ids, status, invited_by, client = prisma) {
    const roleIdsArray = Array.isArray(role_ids) ? role_ids : [role_ids];
    const inviterId = invited_by || user_id;

    const execute = async (tx) => {
      const member = await tx.workspace_members.upsert({
        create: {
          deleted: false,
          invited_by: inviterId,
          status: status.toUpperCase(),
          user_id,
          workspace_id,
        },
        update: {
          deleted: false,
          status: status.toUpperCase(),
          updated_at: new Date(),
        },
        where: {
          unique_workspace_user: {
            user_id,
            workspace_id,
          },
        },
      });

      await tx.workspace_member_roles.deleteMany({
        where: { workspace_member_id: member.id },
      });

      if (roleIdsArray.length > 0) {
        await tx.workspace_member_roles.createMany({
          data: roleIdsArray.map((role_id) => ({
            role_id,
            workspace_member_id: member.id,
          })),
        });
      }

      return member;
    };

    return client.$transaction ? client.$transaction(execute) : execute(client);
  }

  /**
   * Removes a member from a workspace and its teams, unless the member is a workspace admin.
   * @param {string} workspace_id - The workspace ID.
   * @param {string} user_id - The user ID.
   * @param {PrismaClient} [client=prisma] - Optional Prisma client instance for transactions.
   * @returns {Promise<WorkspaceMember|null>} The deleted member, or null if they were an admin or not found.
   */
  async removeWorkspaceMember(workspace_id, user_id, client = prisma) {
    const execute = async (tx) => {
      const member = await tx.workspace_members.findFirst({
        include: {
          workspace_member_roles: {
            include: {
              workspace_roles: true,
            },
          },
        },
        where: { user_id, workspace_id },
      });

      if (!member) return null;

      const isAdmin = member.workspace_member_roles.some((wmr) => {
        const permissions = wmr.workspace_roles?.permissions;
        return (
          permissions &&
          (Array.isArray(permissions)
            ? permissions.includes("manage_workspace")
            : permissions.manage_workspace)
        );
      });

      if (isAdmin) return null;

      const memberId = member.id;

      const deletedMember = await tx.workspace_members.update({
        data: { deleted: true, updated_at: new Date() },
        where: { id: memberId },
      });

      await tx.team_members.updateMany({
        data: { deleted: true, updated_at: new Date() },
        where: {
          teams: { workspace_id },
          user_id,
        },
      });

      return deletedMember;
    };

    return client.$transaction ? client.$transaction(execute) : execute(client);
  }

  /**
   * Updates the roles for a workspace member.
   * @param {string} workspace_id - The workspace ID.
   * @param {string} user_id - The user ID.
   * @param {string|string[]} role_ids - The new role IDs.
   * @param {PrismaClient} [client=prisma] - Optional Prisma client instance for transactions.
   * @returns {Promise<WorkspaceMember>} The updated workspace member.
   */
  async updateMemberRole(workspace_id, user_id, role_ids, client = prisma) {
    const roleIdsArray = Array.isArray(role_ids) ? role_ids : [role_ids];

    const execute = async (tx) => {
      const member = await tx.workspace_members.findFirst({
        where: { deleted: false, user_id, workspace_id },
      });

      if (!member) {
        throw new Error("Member not found");
      }

      await tx.workspace_member_roles.deleteMany({
        where: { workspace_member_id: member.id },
      });

      if (roleIdsArray.length > 0) {
        await tx.workspace_member_roles.createMany({
          data: roleIdsArray.map((role_id) => ({
            role_id,
            workspace_member_id: member.id,
          })),
        });
      }

      return tx.workspace_members.update({
        data: { updated_at: new Date() },
        where: { id: member.id },
      });
    };

    return client.$transaction ? client.$transaction(execute) : execute(client);
  }

  /**
   * Updates the status of a workspace member.
   * @param {string} workspace_id - The workspace ID.
   * @param {string} user_id - The user ID.
   * @param {string} status - The new status.
   * @param {PrismaClient} [client=prisma] - Optional Prisma client instance.
   * @returns {Promise<WorkspaceMember>} The updated workspace member.
   */
  async updateMemberStatus(workspace_id, user_id, status, client = prisma) {
    return client.workspace_members.update({
      data: {
        status: status.toUpperCase(),
        updated_at: new Date(),
      },
      where: {
        unique_workspace_user: { user_id, workspace_id },
      },
    });
  }

  /**
   * Retrieves a single workspace member with their roles.
   * @param {string} workspace_id - The workspace ID.
   * @param {string} user_id - The user ID.
   * @param {PrismaClient} [client=prisma] - Optional Prisma client instance.
   * @returns {Promise<WorkspaceMember & {roles: string[]}|null>} The member with their role names, or null.
   */
  async getWorkspaceMember(workspace_id, user_id, client = prisma) {
    const member = await client.workspace_members.findFirst({
      include: {
        workspace_member_roles: {
          include: {
            workspace_roles: true,
          },
        },
      },
      where: { deleted: false, user_id, workspace_id },
    });

    if (!member) return null;

    return {
      ...member,
      roles: member.workspace_member_roles.map((wmr) => wmr.workspace_roles.name),
    };
  }

  /**
   * Checks if a user is an active member of a workspace.
   * @param {string} workspace_id - The workspace ID.
   * @param {string} user_id - The user ID.
   * @param {PrismaClient} [client=prisma] - Optional Prisma client instance.
   * @returns {Promise<boolean>} True if the user is a member, otherwise false.
   */
  async isMember(workspace_id, user_id, client = prisma) {
    const count = await client.workspace_members.count({
      where: { deleted: false, user_id, workspace_id },
    });
    return count > 0;
  }

  /**
   * Retrieves the owner of a workspace.
   * @param {string} workspace_id - The workspace ID.
   * @param {PrismaClient} [client=prisma] - Optional Prisma client instance.
   * @returns {Promise<Object|null>} The owner details, or null if not found.
   */
  async getWorkspaceOwner(workspace_id, client = prisma) {
    const workspace = await client.workspaces.findUnique({
      select: { user_id: true },
      where: { id: workspace_id },
    });

    if (!workspace) return null;

    const member = await client.workspace_members.findFirst({
      include: {
        users_workspace_members_user_idTousers: true,
        workspace_member_roles: {
          include: {
            workspace_roles: true,
          },
        },
      },
      where: {
        deleted: false,
        user_id: workspace.user_id,
        workspace_id,
      },
    });

    if (!member) return null;

    const user = member.users_workspace_members_user_idTousers;

    return {
      ...member,
      avatar_url: user?.avatar_url,
      email: user?.email,
      name: user?.name,
      roles: member.workspace_member_roles.map((wmr) => wmr.workspace_roles.name),
      username: user?.username,
    };
  }

  /**
   * Creates a workspace invite for a new or existing user.
   * @param {string} workspace_id - The workspace ID.
   * @param {string} email - The email to invite.
   * @param {string|string[]} roleIds - The role IDs to assign.
   * @param {string} invited_by - The user ID of the inviter.
   * @param {string|null} [name=null] - Optional name for a new user.
   * @param {string|null} [username=null] - Optional username for a new user.
   * @param {any[]} [_target_teams=[]] - Optional target teams (legacy param, kept for signature match).
   * @param {PrismaClient} [client=prisma] - Optional Prisma client instance for transactions.
   * @returns {Promise<Object>} An object containing the invite details.
   */
  async createWorkspaceInvite(
    workspace_id,
    email,
    roleIds,
    invited_by,
    name = null,
    username = null,
    _target_teams = [],
    client = prisma
  ) {
    const execute = async (tx) => {
      let user = await tx.users.findFirst({
        where: { email: { equals: email, mode: "insensitive" } },
      });

      if (!user) {
        const publicUserId = generatePublicId();
        user = await tx.users.create({
          data: {
            email,
            name,
            password: "",
            public_user_id: publicUserId,
            status: "PENDING_INVITE",
            username: username || email.split("@")[0],
          },
        });
      }

      await this.addWorkspaceMember(workspace_id, user.user_id, roleIds, "ACTIVE", invited_by, tx);

      return {
        email,
        invite_id: user.user_id,
        roles: roleIds,
        status: user.status,
        user_id: user.user_id,
      };
    };

    return client.$transaction ? client.$transaction(execute) : execute(client);
  }
}

module.exports = new WorkspaceMembersRepository();
