const { prisma } = require("@theweave/database");
const { generatePublicId } = require("@/utils/formatters.util");
const crypto = require("crypto");

const settingsRepository = require("./settings.repository");
const membersRepository = require("./members.repository");
const rolesRepository = require("./roles.repository");

/**
 * @typedef {import('@prisma/client').PrismaClient} PrismaClient
 */

class WorkspaceBaseRepository {
  /**
   * Gets the active workspace for a user with their membership details.
   * @param {string} user_id - The user ID.
   * @param {PrismaClient} [client=prisma] - Optional Prisma client instance.
   * @returns {Promise<Object|null>} The workspace with membership and permissions, or null.
   */
  async getActiveWorkspaceWithMembership(user_id, client = prisma) {
    const member = await client.workspace_members.findFirst({
      include: {
        workspace_member_roles: {
          include: { workspace_roles: true },
        },
        workspaces: {
          include: {
            plans: true,
            users_workspaces_user_idTousers: {
              select: { avatar_url: true, email: true, name: true, username: true },
            },
          },
        },
      },
      orderBy: { created_at: "asc" },
      where: { deleted: false, user_id, workspaces: { deleted: false } },
    });

    let workspace;
    let member_roles = [];

    if (member) {
      workspace = member.workspaces;
      member_roles = member.workspace_member_roles.map((wmr) => wmr.workspace_roles.name);
    } else {
      const ownedWorkspaces = await this.getWorkspacesByUserId(user_id, client);
      workspace = ownedWorkspaces.find((o) => !o.deleted);
      if (!workspace) return null;
    }

    const permissions = await rolesRepository.getUserEffectivePermissions(
      workspace.id,
      user_id,
      client
    );

    const isOwner = workspace.user_id === user_id;
    const allPermissions = [
      "manage_areas",
      "manage_brand",
      "manage_domains",
      "manage_members",
      "manage_org_lifecycle",
      "manage_weave_ai",
      "view_member_directory",
    ];

    const effectivePermissions = isOwner
      ? Array.from(new Set([...permissions, ...allPermissions]))
      : permissions;

    return {
      ...workspace,
      avatar_url: workspace.users_workspaces_user_idTousers?.avatar_url,
      billing_cycle: workspace.plans?.details?.billing?.billing_cycle || "monthly",
      currency: workspace.plans?.currency,
      email: workspace.users_workspaces_user_idTousers?.email,
      member_role: isOwner ? "OWNER" : member_roles[0] || "MEMBER",
      member_roles:
        isOwner && !member_roles.includes("OWNER") ? ["OWNER", ...member_roles] : member_roles,
      name: workspace.users_workspaces_user_idTousers?.name,
      permissions: effectivePermissions,
      plan_details: workspace.plans?.details,
      plan_name: workspace.plans?.name,
      plan_snapshot: workspace.plans?.details,
      plan_value: workspace.plans?.plan_value,
      plans: undefined,
      username: workspace.users_workspaces_user_idTousers?.username,
      users_workspaces_user_idTousers: undefined,
    };
  }

  /**
   * Alias for getActiveWorkspaceWithMembership.
   * @param {string} user_id
   * @param {PrismaClient} [client=prisma]
   */
  async getActiveOrganizationWithMembership(user_id, client = prisma) {
    return this.getActiveWorkspaceWithMembership(user_id, client);
  }

  /**
   * Retrieves all workspaces owned by a user.
   * @param {string} user_id - The user ID.
   * @param {PrismaClient} [client=prisma] - Optional Prisma client instance.
   * @returns {Promise<any[]>} The workspaces owned by the user.
   */
  async getWorkspacesByUserId(user_id, client = prisma) {
    const workspaces = await client.workspaces.findMany({
      include: {
        plans: true,
        users_workspaces_user_idTousers: {
          select: { avatar_url: true, email: true, name: true, username: true },
        },
      },
      where: { user_id },
    });

    return workspaces.map((w) => ({
      ...w,
      avatar_url: w.users_workspaces_user_idTousers?.avatar_url,
      billing_cycle: w.plans?.details?.billing?.billing_cycle || "monthly",
      currency: w.plans?.currency,
      email: w.users_workspaces_user_idTousers?.email,
      name: w.users_workspaces_user_idTousers?.name,
      plan_details: w.plans?.details,
      plan_name: w.plans?.name,
      plan_snapshot: w.plans?.details,
      plan_value: w.plans?.plan_value,
      plans: undefined,
      username: w.users_workspaces_user_idTousers?.username,
      users_workspaces_user_idTousers: undefined,
    }));
  }

  /**
   * Retrieves all workspaces where the user is an active member.
   * @param {string} user_id - The user ID.
   * @param {PrismaClient} [client=prisma] - Optional Prisma client instance.
   * @returns {Promise<any[]>} The workspaces.
   */
  async getUserWorkspacesWithMembership(user_id, client = prisma) {
    const members = await client.workspace_members.findMany({
      include: {
        workspace_member_roles: {
          include: { workspace_roles: true },
        },
        workspaces: {
          select: {
            banner_url: true,
            description: true,
            id: true,
            logo_url: true,
            unique_name: true,
            user_id: true,
            workspace_name: true,
          },
        },
      },
      orderBy: { created_at: "asc" },
      where: {
        deleted: false,
        status: "ACTIVE",
        user_id,
        workspaces: { deleted: false },
      },
    });

    return members.map((m) => {
      const isOwner = m.workspaces?.user_id === user_id;
      const roles =
        m.workspace_member_roles?.map((wmr) => wmr.workspace_roles?.name).filter(Boolean) || [];
      const memberRole = isOwner ? "OWNER" : roles[0] || "MEMBER";
      return {
        ...m.workspaces,
        joined_at: m.created_at,
        member_role: memberRole,
        member_roles: roles,
        member_status: m.status,
      };
    });
  }

  /**
   * Returns available unique workspace names matching a base pattern.
   * @param {string} baseName - The base string for unique name.
   * @param {PrismaClient} [client=prisma] - Optional Prisma client instance.
   * @returns {Promise<string[]>} List of matches.
   */
  async getAvailableWorkspaceNames(baseName, client = prisma) {
    const workspaces = await client.workspaces.findMany({
      select: { unique_name: true },
      where: { unique_name: { startsWith: baseName } },
    });
    return workspaces.map((w) => w.unique_name);
  }

  /**
   * Creates a new workspace and initializes its defaults.
   * @param {string} user_id - The user ID creating the workspace.
   * @param {string} workspace_name - Name of the workspace.
   * @param {string} unique_name - Unique slug.
   * @param {string|null} logo_url - Logo URL.
   * @param {string|null} banner_url - Banner URL.
   * @param {string|null} description - Description.
   * @param {string|null} country - Country info.
   * @param {PrismaClient} [client=prisma] - Optional Prisma client instance for transactions.
   * @returns {Promise<Object>} The created workspace.
   */
  async createWorkspaces(
    user_id,
    workspace_name,
    unique_name,
    logo_url,
    banner_url,
    description,
    country,
    client = prisma
  ) {
    const execute = async (tx) => {
      // 1. Get default plan
      let defaultPlan = await tx.plans.findFirst({
        orderBy: [{ plan_value: "asc" }, { created_at: "asc" }],
        where: {
          deleted: false,
          details: {
            equals: true,
            path: ["metadata", "is_signup_default"],
          },
          is_active: true,
        },
      });

      if (!defaultPlan) {
        defaultPlan = await tx.plans.findFirst({
          orderBy: [{ plan_value: "asc" }, { created_at: "asc" }],
          where: {
            deleted: false,
            is_active: true,
          },
        });
      }

      const defaultPlanId = defaultPlan?.plan_id || null;

      const publicId = generatePublicId();
      // Keep workspace public IDs in the same short, opaque format as user public IDs.
      const publicWorkspaceId = publicId;

      // 2. Create Workspace
      const workspace = await tx.workspaces.create({
        data: {
          banner_url,
          country,
          description,
          logo_url,
          plan_id: defaultPlanId,
          public_id: publicId,
          public_workspace_id: publicWorkspaceId,
          unique_name,
          user_id,
          workspace_name,
        },
      });
      // Attach plan_snapshot placeholder for compatibility
      workspace.plan_snapshot = null;

      // 3. Update User
      const user = await tx.users.findUnique({
        where: { user_id },
      });

      await tx.users.update({
        data: {
          plan_id: user?.plan_id || defaultPlanId,
          workspace_id: workspace.id,
        },
        where: { user_id },
      });

      // 4. Assign member role
      const adminRole = await tx.workspace_roles.findFirst({
        select: { id: true },
        where: {
          permissions: {
            array_contains: "manage_workspace",
          },
          workspace_id: workspace.id,
        },
      });

      const adminRoleIds = adminRole ? [adminRole.id] : [];

      await membersRepository.addWorkspaceMember(
        workspace.id,
        user_id,
        adminRoleIds,
        "ACTIVE",
        null,
        tx
      );

      // 5. Create settings
      await settingsRepository.createDefaultSettings(workspace.id, tx);

      // 6. Create root team
      const rootTeamSlug = unique_name || "central";
      await tx.teams.create({
        data: {
          created_by: user_id,
          description: "Central team of the workspace",
          name: "Central",
          parent_team_id: null,
          properties: {},
          slug: rootTeamSlug,
          workspace_id: workspace.id,
        },
      });

      // 7. Initialize Subscription
      if (defaultPlanId) {
        const periodStart = new Date();
        const periodEnd = new Date();
        periodEnd.setMonth(periodEnd.getMonth() + 1);

        await tx.subscriptions.upsert({
          create: {
            current_period_end: periodEnd,
            current_period_start: periodStart,
            plan_id: defaultPlanId,
            provider: "internal",
            status: "active",
            subscriber_id: workspace.id,
            subscriber_type: "workspace",
          },
          update: {
            plan_id: defaultPlanId,
            status: "active",
            updated_at: new Date(),
          },
          where: {
            subscriber_type_subscriber_id: {
              subscriber_id: workspace.id,
              subscriber_type: "workspace",
            },
          },
        });
      }

      return workspace;
    };

    return client.$transaction ? client.$transaction(execute) : execute(client);
  }

  /**
   * Auto-provisions a personal workspace for a user.
   * @param {string} userId - The user ID.
   * @param {string} displayName - The user's display name.
   * @param {string} _locale - (unused)
   * @param {string} timezone - Timezone assigned to country parameter.
   * @param {PrismaClient} [client=prisma] - Optional Prisma client instance.
   * @returns {Promise<Object>} The provisioned workspace.
   */
  async autoProvisionPersonalWorkspace(
    userId,
    displayName,
    _locale = "en",
    timezone = "UTC",
    client = prisma
  ) {
    const workspaceName = `Workspace de ${displayName}`;
    const uniqueName = `workspace-${crypto.randomBytes(4).toString("hex")}`;

    return await this.createWorkspaces(
      userId,
      workspaceName,
      uniqueName,
      null,
      null,
      null,
      timezone, // Assuming timezone maps to country originally
      client
    );
  }

  /**
   * Updates basic details of a workspace if the user is an admin or owner.
   * @param {string} workspace_id - The workspace ID.
   * @param {string} user_id - The user ID requesting the change.
   * @param {string} workspace_name - New name.
   * @param {string} unique_name - New unique name.
   * @param {string|null} logo_url - New logo.
   * @param {string|null} banner_url - New banner.
   * @param {string|null} description - New description.
   * @param {boolean} deleted - If true, flags as deleted.
   * @param {PrismaClient} [client=prisma] - Optional Prisma client instance.
   * @returns {Promise<Object>} The updated workspace.
   */
  async updateWorkspace(
    workspace_id,
    user_id,
    workspace_name,
    unique_name,
    logo_url,
    banner_url,
    description,
    deleted,
    client = prisma
  ) {
    const hasAccess = await client.workspaces.findFirst({
      where: {
        id: workspace_id,
        OR: [
          { user_id },
          {
            workspace_members: {
              some: {
                deleted: false,
                user_id,
                workspace_member_roles: {
                  some: {
                    workspace_roles: {
                      permissions: { array_contains: "manage_workspace" },
                    },
                  },
                },
              },
            },
          },
        ],
      },
    });

    if (!hasAccess) return null;

    return client.workspaces.update({
      data: {
        banner_url,
        deleted,
        description,
        logo_url,
        unique_name,
        updated_at: new Date(),
        workspace_name,
      },
      where: { id: workspace_id },
    });
  }

  /**
   * Updates the logo of a workspace if the user is an admin or owner.
   * @param {string} workspace_id - The workspace ID.
   * @param {string} logo_url - New logo URL.
   * @param {string} user_id - The user ID.
   * @param {PrismaClient} [client=prisma] - Optional Prisma client instance.
   * @returns {Promise<Object>} The updated workspace.
   */
  async updateWorkspaceLogo(workspace_id, logo_url, user_id, client = prisma) {
    const hasAccess = await client.workspaces.findFirst({
      where: {
        id: workspace_id,
        OR: [
          { user_id },
          {
            workspace_members: {
              some: {
                deleted: false,
                user_id,
                workspace_member_roles: {
                  some: {
                    workspace_roles: {
                      permissions: { array_contains: "manage_workspace" },
                    },
                  },
                },
              },
            },
          },
        ],
      },
    });

    if (!hasAccess) return null;

    return client.workspaces.update({
      data: { logo_url, updated_at: new Date() },
      where: { id: workspace_id },
    });
  }

  /**
   * Updates the banner of a workspace if the user is an admin or owner.
   * @param {string} workspace_id - The workspace ID.
   * @param {string} banner_url - New banner URL.
   * @param {string} user_id - The user ID.
   * @param {PrismaClient} [client=prisma] - Optional Prisma client instance.
   * @returns {Promise<Object>} The updated workspace.
   */
  async updateWorkspaceBanner(workspace_id, banner_url, user_id, client = prisma) {
    const hasAccess = await client.workspaces.findFirst({
      where: {
        id: workspace_id,
        OR: [
          { user_id },
          {
            workspace_members: {
              some: {
                deleted: false,
                user_id,
                workspace_member_roles: {
                  some: {
                    workspace_roles: {
                      permissions: { array_contains: "manage_workspace" },
                    },
                  },
                },
              },
            },
          },
        ],
      },
    });

    if (!hasAccess) return null;

    return client.workspaces.update({
      data: { banner_url, updated_at: new Date() },
      where: { id: workspace_id },
    });
  }
}

module.exports = new WorkspaceBaseRepository();
