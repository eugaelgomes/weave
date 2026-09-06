const prisma = require("@theweave/database");
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
    const query = `
    SELECT
      o.id,
      o.user_id,
      o.workspace_name,
      o.unique_name,
      o.logo_url,
      o.banner_url,
      o.description,
      o.country,
      o.deleted,
      o.created_at,
      o.updated_at,
      p.details AS plan_snapshot,
      o.deleted_at,
      o.deleted_by,
      o.plan_id,
      p.name as plan_name,
      p.details as plan_details,
      p.plan_value,
      p.currency,
      COALESCE(p.details #>> '{billing,billing_cycle}', 'monthly') AS billing_cycle,
      u.avatar_url,
      u.name,
      u.username,
      u.email,
      (
        SELECT array_agg(r.name) 
        FROM workspace_member_roles wmr 
        JOIN workspaces_roles r ON r.id = wmr.role_id 
        WHERE wmr.workspace_member_id = om.id
      ) AS member_roles
    FROM workspace_members om
    INNER JOIN workspaces o ON o.id = om.workspace_id AND o.deleted = false
    LEFT JOIN plans p ON p.plan_id = o.plan_id
    LEFT JOIN users u ON u.user_id = o.user_id
    WHERE om.user_id = $1::uuid AND om.deleted = false
      
    ORDER BY om.created_at ASC
    LIMIT 1;
    `;
    const rows = await client.$queryRawUnsafe(query, user_id);
    let workspace = rows[0] || null;

    if (!workspace) {
      const ownedWorkspaces = await this.getWorkspacesByUserId(user_id, client);
      const owned = ownedWorkspaces.find((o) => !o.deleted);
      if (!owned) return null;
      workspace = owned;
    }

    const permissions = await rolesRepository.getUserEffectivePermissions(
      workspace.id,
      user_id,
      client
    );
    return {
      ...workspace,
      permissions,
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
    const query = `
    SELECT
      o.id,
      o.user_id,
      o.workspace_name,
      o.unique_name,
      o.logo_url,
      o.banner_url,
      o.description,
      o.country,
      o.deleted,
      o.created_at,
      o.updated_at,
      p.details AS plan_snapshot,
      o.deleted_at,
      o.deleted_by,
      o.plan_id,
      p.name as plan_name,
      p.details as plan_details,
      p.plan_value,
      p.currency,
      COALESCE(p.details #>> '{billing,billing_cycle}', 'monthly') AS billing_cycle,
      u.avatar_url,
      u.name,
      u.username,
      u.email
    FROM workspaces o
    JOIN users u ON u.user_id = o.user_id
    LEFT JOIN plans p ON p.plan_id = o.plan_id
    WHERE o.user_id = $1::uuid;
    `;
    return client.$queryRawUnsafe(query, user_id);
  }

  /**
   * Retrieves all workspaces where the user is an active member.
   * @param {string} user_id - The user ID.
   * @param {PrismaClient} [client=prisma] - Optional Prisma client instance.
   * @returns {Promise<any[]>} The workspaces.
   */
  async getUserWorkspacesWithMembership(user_id, client = prisma) {
    const query = `
      SELECT
        o.id,
        o.user_id,
        o.workspace_name,
        o.unique_name,
        o.logo_url,
        o.banner_url,
        o.description,
        (
          SELECT array_agg(r.name) 
          FROM workspace_member_roles wmr 
          JOIN workspaces_roles r ON r.id = wmr.role_id 
          WHERE wmr.workspace_member_id = om.id
        ) AS member_roles,
        om.status AS member_status,
        om.created_at AS joined_at
      FROM workspace_members om
      INNER JOIN workspaces o ON o.id = om.workspace_id AND o.deleted = false
      WHERE om.user_id = $1::uuid
        AND om.deleted = false
        AND om.status = 'ACTIVE'
      ORDER BY om.created_at ASC;
    `;
    return client.$queryRawUnsafe(query, user_id);
  }

  /**
   * Returns available unique workspace names matching a base pattern.
   * @param {string} baseName - The base string for unique name.
   * @param {PrismaClient} [client=prisma] - Optional Prisma client instance.
   * @returns {Promise<string[]>} List of matches.
   */
  async getAvailableWorkspaceNames(baseName, client = prisma) {
    const query = `
      SELECT unique_name FROM workspaces
      WHERE unique_name LIKE $1;
    `;
    const results = await client.$queryRawUnsafe(query, `${baseName}%`);
    return results.map((row) => row.unique_name);
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
      const defaultPlanResult = await tx.$queryRawUnsafe(`
        WITH candidates AS (
          SELECT
            p.plan_id,
            p.details,
            1 AS priority,
            COALESCE(p.plan_value, 0) AS sort_value,
            p.created_at
          FROM plans p
          WHERE p.deleted = FALSE
            AND p.is_active = TRUE
            AND COALESCE((p.details #>> '{metadata,is_signup_default}')::boolean, false) = true
          UNION ALL
          SELECT
            p.plan_id,
            p.details,
            2 AS priority,
            COALESCE(p.plan_value, 0) AS sort_value,
            p.created_at
          FROM plans p
          WHERE p.deleted = FALSE
            AND p.is_active = TRUE
        )
        SELECT plan_id, details
        FROM candidates
        ORDER BY priority ASC, sort_value ASC, created_at ASC
        LIMIT 1;
      `);

      const defaultPlan = defaultPlanResult[0] || null;
      const defaultPlanId = defaultPlan?.plan_id || null;

      const publicId = generatePublicId();
      const publicWorkspaceId = `workspace_${publicId}`;

      const workspaceResult = await tx.$queryRawUnsafe(
        `
        INSERT INTO workspaces (
          user_id,
          workspace_name,
          unique_name,
          logo_url,
          banner_url,
          description,
          country,
          plan_id,
          public_id,
          public_workspace_id
        )
        VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8::uuid, $9, $10)
        RETURNING
          id,
          public_id,
          public_workspace_id,
          user_id,
          workspace_name,
          unique_name,
          logo_url,
          banner_url,
          description,
          country,
          plan_id,
          NULL AS plan_snapshot,
          created_at,
          updated_at,
          deleted;
      `,
        user_id,
        workspace_name,
        unique_name,
        logo_url,
        banner_url,
        description,
        country,
        defaultPlanId,
        publicId,
        publicWorkspaceId
      );

      const workspace = workspaceResult[0];

      await tx.$queryRawUnsafe(
        `
        UPDATE users
        SET workspace_id = $1::uuid,
            plan_id = COALESCE(plan_id, $3::uuid)
        WHERE user_id = $2::uuid;
      `,
        workspace.id,
        user_id,
        defaultPlanId
      );

      const adminRoleQuery = await tx.$queryRawUnsafe(
        `
        SELECT id FROM workspaces_roles WHERE workspace_id = $1::uuid AND permissions ? 'manage_workspace' LIMIT 1
      `,
        workspace.id
      );

      const adminRoleIds = adminRoleQuery.map((r) => r.id);

      await membersRepository.addWorkspaceMember(
        workspace.id,
        user_id,
        adminRoleIds,
        "ACTIVE",
        null,
        tx
      );

      await settingsRepository.createDefaultSettings(workspace.id, tx);

      const rootTeamSlug = unique_name || "central";
      await tx.$queryRawUnsafe(
        `
        INSERT INTO teams (
          workspace_id, name, slug, description, properties, created_by, parent_team_id
        ) VALUES ($1::uuid, 'Central', $2, 'Central team of the workspace', '{}'::jsonb, $3::uuid, null)
      `,
        workspace.id,
        rootTeamSlug,
        user_id
      );

      if (defaultPlanId) {
        const periodStart = new Date();
        const periodEnd = new Date();
        periodEnd.setMonth(periodEnd.getMonth() + 1);

        await tx.$queryRawUnsafe(
          `
          INSERT INTO subscriptions (subscriber_type, subscriber_id, plan_id, status, provider, current_period_start, current_period_end)
          VALUES ('workspace', $1::uuid, $2::uuid, 'active', 'internal', $3, $4)
          ON CONFLICT (subscriber_type, subscriber_id)
          DO UPDATE SET plan_id = EXCLUDED.plan_id, status = 'active', updated_at = NOW()
        `,
          workspace.id,
          defaultPlanId,
          periodStart,
          periodEnd
        );
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
    const query = `
      UPDATE workspaces o
      SET workspace_name = $3,
          unique_name = $4,
          logo_url = $5,
          banner_url = $6,
          description = $7,
          deleted = $8,
          updated_at = NOW()
      WHERE o.id = $1::uuid
        AND (
          o.user_id = $2::uuid
          OR EXISTS (
            SELECT 1 FROM workspace_members om
            WHERE om.workspace_id = o.id
              AND om.user_id = $2::uuid
              AND om.deleted = false
              AND EXISTS (
                SELECT 1 FROM workspace_member_roles wmr 
                JOIN workspaces_roles r ON r.id = wmr.role_id 
                WHERE wmr.workspace_member_id = om.id AND r.permissions ? 'manage_workspace'
              )
          )
        )
      RETURNING
        id,
        user_id,
        workspace_name,
        unique_name,
        logo_url,
        banner_url,
        description,
        created_at,
        updated_at,
        deleted;
    `;
    const results = await client.$queryRawUnsafe(
      query,
      workspace_id,
      user_id,
      workspace_name,
      unique_name,
      logo_url,
      banner_url,
      description,
      deleted
    );
    return results[0];
  }

  /**
   * Updates the logo of a workspace if the user is an admin.
   * @param {string} workspace_id - The workspace ID.
   * @param {string} logo_url - New logo URL.
   * @param {string} user_id - The user ID.
   * @param {PrismaClient} [client=prisma] - Optional Prisma client instance.
   * @returns {Promise<Object>} The updated workspace.
   */
  async updateWorkspaceLogo(workspace_id, logo_url, user_id, client = prisma) {
    const query = `
      WITH user_check AS (
          SELECT 1 FROM workspace_members om
          WHERE om.workspace_id = $1::uuid AND om.user_id = $3::uuid AND om.deleted = false
            AND EXISTS (
              SELECT 1 FROM workspace_member_roles wmr 
              JOIN workspaces_roles r ON r.id = wmr.role_id 
              WHERE wmr.workspace_member_id = om.id AND r.permissions ? 'manage_workspace'
            )
      )
      UPDATE workspaces
      SET logo_url = $2, updated_at = NOW()
      WHERE id = $1::uuid AND EXISTS (SELECT 1 FROM user_check)
      RETURNING *;
    `;
    const results = await client.$queryRawUnsafe(query, workspace_id, logo_url, user_id);
    return results[0];
  }

  /**
   * Updates the banner of a workspace if the user is an admin.
   * @param {string} workspace_id - The workspace ID.
   * @param {string} banner_url - New banner URL.
   * @param {string} user_id - The user ID.
   * @param {PrismaClient} [client=prisma] - Optional Prisma client instance.
   * @returns {Promise<Object>} The updated workspace.
   */
  async updateWorkspaceBanner(workspace_id, banner_url, user_id, client = prisma) {
    const query = `
      WITH user_check AS (
          SELECT 1 FROM workspace_members om
          WHERE om.workspace_id = $1::uuid AND om.user_id = $3::uuid AND om.deleted = false
            AND EXISTS (
              SELECT 1 FROM workspace_member_roles wmr 
              JOIN workspaces_roles r ON r.id = wmr.role_id 
              WHERE wmr.workspace_member_id = om.id AND r.permissions ? 'manage_workspace'
            )
      )
      UPDATE workspaces
      SET banner_url = $2, updated_at = NOW()
      WHERE id = $1::uuid AND EXISTS (SELECT 1 FROM user_check)
      RETURNING *;
    `;
    const results = await client.$queryRawUnsafe(query, workspace_id, banner_url, user_id);
    return results[0];
  }
}

module.exports = new WorkspaceBaseRepository();
