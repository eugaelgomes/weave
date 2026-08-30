const { executeQuery, getConnection } = require("@/database/connection");
const { generatePublicId } = require("@/utils/formatters.util");

const settingsRepository = require("./settings.repository");
const membersRepository = require("./members.repository");
const rolesRepository = require("./roles.repository");

class WorkspaceBaseRepository {
  async getActiveWorkspaceWithMembership(user_id) {
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
      om.role AS member_role
    FROM workspace_members om
    INNER JOIN workspaces o ON o.id = om.workspace_id AND o.deleted = false
    LEFT JOIN plans p ON p.plan_id = o.plan_id
    LEFT JOIN users u ON u.user_id = o.user_id
    WHERE om.user_id = $1 AND om.deleted = false
      
    ORDER BY om.created_at ASC
    LIMIT 1;
    `;
    const rows = await executeQuery(query, [user_id]);
    let workspace = rows[0] || null;

    if (!workspace) {
      const owned = (await this.getWorkspacesByUserId(user_id)).find((o) => !o.deleted);
      if (!owned) return null;
      workspace = owned;
    }

    const permissions = await rolesRepository.getUserEffectivePermissions(workspace.id, user_id);
    return {
      ...workspace,
      permissions,
    };
  }

  async getActiveOrganizationWithMembership(user_id) {
    return this.getActiveWorkspaceWithMembership(user_id);
  }

  async getWorkspacesByUserId(user_id) {
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
    WHERE o.user_id = $1;
    `;
    const results = await executeQuery(query, [user_id]);
    return results;
  }

  async getUserWorkspacesWithMembership(user_id) {
    const query = `
      SELECT
        o.id,
        o.user_id,
        o.workspace_name,
        o.unique_name,
        o.logo_url,
        o.banner_url,
        o.description,
        om.role AS member_role,
        om.status AS member_status,
        om.created_at AS joined_at
      FROM workspace_members om
      INNER JOIN workspaces o ON o.id = om.workspace_id AND o.deleted = false
      WHERE om.user_id = $1
        AND om.deleted = false
        AND om.status = 'ACTIVE'
      ORDER BY om.created_at ASC;
    `;
    return await executeQuery(query, [user_id]);
  }

  async getAvailableWorkspaceNames(baseName) {
    const query = `
      SELECT unique_name FROM workspaces
      WHERE unique_name LIKE $1;
    `;
    const results = await executeQuery(query, [`${baseName}%`]);
    return results.map((row) => row.unique_name);
  }

  async createWorkspaces(
    user_id,
    workspace_name,
    unique_name,
    logo_url,
    banner_url,
    description,
    country
  ) {
    const client = await getConnection();
    try {
      await client.query("BEGIN");

      const defaultPlanQuery = `
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
      `;

      const defaultPlanResult = await client.query(defaultPlanQuery);
      const defaultPlan = defaultPlanResult.rows[0] || null;
      const defaultPlanId = defaultPlan?.plan_id || null;

      const publicId = generatePublicId();
      const publicWorkspaceId = `workspace_${publicId}`;

      const insertWorkspaceQuery = `
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
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
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
    `;

      const workspaceResult = await client.query(insertWorkspaceQuery, [
        user_id,
        workspace_name,
        unique_name,
        logo_url,
        banner_url,
        description,
        country,
        defaultPlanId,
        publicId,
        publicWorkspaceId,
      ]);

      const workspace = workspaceResult.rows[0];

      const updateUserQuery = `
      UPDATE users
      SET workspace_id = $1,
          plan_id = COALESCE(plan_id, $3)
      WHERE user_id = $2;
    `;

      await client.query(updateUserQuery, [workspace.id, user_id, defaultPlanId]);

      const adminRoleQuery = await client.query(
        "SELECT id FROM workspaces_roles WHERE workspace_id = $1 AND permissions ? 'manage_workspace' LIMIT 1",
        [workspace.id]
      );
      const adminRoleIds = adminRoleQuery.rows.map((r) => r.id);

      await membersRepository.addWorkspaceMember(
        workspace.id,
        user_id,
        adminRoleIds,
        "ACTIVE",
        null,
        client
      );

      await settingsRepository.createDefaultSettings(workspace.id, client);

      const rootTeamSlug = unique_name || "central";
      await client.query(
        `INSERT INTO teams (
           workspace_id, name, slug, description, properties, created_by, parent_team_id
         ) VALUES ($1, 'Central', $2, 'Central team of the workspace', '{}'::jsonb, $3, null)`,
        [workspace.id, rootTeamSlug, user_id]
      );

      if (defaultPlanId) {
        const periodStart = new Date();
        const periodEnd = new Date();
        periodEnd.setMonth(periodEnd.getMonth() + 1);

        await client.query(
          `INSERT INTO subscriptions (subscriber_type, subscriber_id, plan_id, status, provider, current_period_start, current_period_end)
           VALUES ('workspace', $1, $2, 'active', 'internal', $3, $4)
           ON CONFLICT (subscriber_type, subscriber_id)
           DO UPDATE SET plan_id = EXCLUDED.plan_id, status = 'active', updated_at = NOW()`,
          [workspace.id, defaultPlanId, periodStart, periodEnd]
        );
      }

      await client.query("COMMIT");

      return workspace;
    } catch (err) {
      await client.query("ROLLBACK");
      console.error("Erro ao criar organização:", err);
      throw err;
    } finally {
      client.release();
    }
  }

  async autoProvisionPersonalWorkspace(userId, displayName, locale = "en", timezone = "UTC") {
    const crypto = require("crypto");
    const workspaceName = `Workspace de ${displayName}`;
    const uniqueName = `workspace-${crypto.randomBytes(4).toString("hex")}`;

    return await this.createWorkspaces(
      userId,
      workspaceName,
      uniqueName,
      null,
      null,
      null,
      timezone,
      locale,
      null,
      {}
    );
  }

  async updateWorkspace(
    workspace_id,
    user_id,
    workspace_name,
    unique_name,
    logo_url,
    banner_url,
    description,
    deleted
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
      WHERE o.id = $1
        AND (
          o.user_id = $2
          OR EXISTS (
            SELECT 1 FROM workspace_members om
            WHERE om.workspace_id = o.id
              AND om.user_id = $2
              
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
    const results = await executeQuery(query, [
      workspace_id,
      user_id,
      workspace_name,
      unique_name,
      logo_url,
      banner_url,
      description,
      deleted,
    ]);
    return results[0];
  }

  async updateWorkspaceLogo(workspace_id, logo_url, user_id) {
    const query = `
WITH user_check AS (
    SELECT 1 FROM workspace_members om
    WHERE om.workspace_id = $1 AND om.user_id = $3 AND om.deleted = false
      AND EXISTS (
        SELECT 1 FROM workspace_member_roles wmr 
        JOIN workspaces_roles r ON r.id = wmr.role_id 
        WHERE wmr.workspace_member_id = om.id AND r.permissions ? 'manage_workspace'
      )
)
UPDATE workspaces
SET logo_url = $2, updated_at = NOW()
WHERE id = $1 AND EXISTS (SELECT 1 FROM user_check)
RETURNING *;
    `;
    const results = await executeQuery(query, [workspace_id, logo_url, user_id]);
    return results[0];
  }

  async updateWorkspaceBanner(workspace_id, banner_url, user_id) {
    const query = `
WITH user_check AS (
    SELECT 1 FROM workspace_members om
    WHERE om.workspace_id = $1 AND om.user_id = $3 AND om.deleted = false
      AND EXISTS (
        SELECT 1 FROM workspace_member_roles wmr 
        JOIN workspaces_roles r ON r.id = wmr.role_id 
        WHERE wmr.workspace_member_id = om.id AND r.permissions ? 'manage_workspace'
      )
)
UPDATE workspaces
SET banner_url = $2, updated_at = NOW()
WHERE id = $1 AND EXISTS (SELECT 1 FROM user_check)
RETURNING *;
    `;
    const results = await executeQuery(query, [workspace_id, banner_url, user_id]);
    return results[0];
  }
}

module.exports = new WorkspaceBaseRepository();
