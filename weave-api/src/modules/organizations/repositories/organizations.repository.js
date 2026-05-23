const {
  executeQuery,
  rowCount,
  getConnection,
} = require("@/database/connection");
const {
  ORG_ROLES,
} = require("@/modules/organizations/organization-role-policy");

class OrganizationsRepository {
  /**
   * Papel do utilizador na organização (organization_members.role).
   * @param {string} organization_id
   * @param {string} user_id
   * @returns {Promise<string|null>}
   */
  async getMembershipRole(organization_id, user_id) {
    const query = `
      SELECT role FROM organization_members
      WHERE organization_id = $1
        AND user_id = $2
        
        AND deleted = false
      LIMIT 1;
    `;
    const rows = await executeQuery(query, [organization_id, user_id]);
    return rows[0]?.role ?? null;
  }

  /**
   * Organização ativa do utilizador com `member_role` para o motor de permissões.
   * Usa membership; se só existir como owner legacy sem linha em members, usa fallback.
   */
  async getActiveOrganizationWithMembership(user_id) {
    const query = `
    SELECT
      o.id,
      o.user_id,
      o.org_name,
      o.unique_name,
      o.logo_url,
      o.banner_url,
      o.description,
      o.default_timezone,
      o.default_locale,
      o.country,
      o.deleted,
      o.created_at,
      o.updated_at,
      o.settings,
      p.details AS plan_snapshot,
      o.deleted_at,
      o.deleted_by,
      o.plan_id,
      o.branding_properties,
      o.integrations,
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
    FROM organization_members om
    INNER JOIN organizations o ON o.id = om.organization_id AND o.deleted = false
    LEFT JOIN plans p ON p.plan_id = o.plan_id
    LEFT JOIN users u ON u.user_id = o.user_id
    WHERE om.user_id = $1 AND om.deleted = false
      
    ORDER BY om.created_at ASC
    LIMIT 1;
    `;
    const rows = await executeQuery(query, [user_id]);
    if (rows[0]) return rows[0];

    const owned = (await this.getOrgsByUserId(user_id)).find((o) => !o.deleted);
    if (!owned) return null;
    const role = await this.getMembershipRole(owned.id, user_id);
    return {
      ...owned,
      member_role: role || ORG_ROLES.SUPER_ADMIN,
    };
  }

  async getOrgsByUserId(user_id) {
    const query = `
    SELECT
      o.id,
      o.user_id,
      o.org_name,
      o.unique_name,
      o.logo_url,
      o.banner_url,
      o.description,
      o.default_timezone,
      o.default_locale,
      o.country,
      o.deleted,
      o.created_at,
      o.updated_at,
      o.settings,
      p.details AS plan_snapshot,
      o.deleted_at,
      o.deleted_by,
      o.plan_id,
      o.branding_properties,
      o.integrations,
      p.name as plan_name,
      p.details as plan_details,
      p.plan_value,
      p.currency,
      COALESCE(p.details #>> '{billing,billing_cycle}', 'monthly') AS billing_cycle,
      u.avatar_url,
      u.name,
      u.username,
      u.email
    FROM organizations o
    JOIN users u ON u.user_id = o.user_id
    LEFT JOIN plans p ON p.plan_id = o.plan_id
    WHERE o.user_id = $1;
    `;
    const results = await executeQuery(query, [user_id]);
    return results;
  }

  async getAvailableOrgNames(baseName) {
    const query = `
      SELECT unique_name FROM organizations
      WHERE unique_name LIKE $1;
    `;
    const results = await executeQuery(query, [`${baseName}%`]);
    return results.map((row) => row.unique_name);
  }

  async getOrganizationMembers(organization_id) {
    const query = `
      SELECT 
        om.*,
        u1.name,
        u1.username,
        u1.email,
        u1.avatar_url,
        u2.name as inviter_name,
        u2.username as inviter_username,
        u2.avatar_url as inviter_avatar_url,
        (SELECT COUNT(*) 
         FROM notes n 
         WHERE n.user_id = u1.user_id AND n.deleted = false) as notes_count,
        (SELECT COALESCE(json_agg(json_build_object(
           'project_id', p.id::text,
           'project_name', p.title,
           'role', pm.role
         )), '[]'::json)
         FROM project_members pm
         JOIN projects p ON p.id = pm.project_id
         WHERE pm.user_id = u1.user_id
           AND pm.deleted = false 
           AND p.deleted = false) as projects,
        (SELECT COALESCE(json_agg(json_build_object(
           'area_id', a.id::text,
           'area_name', a.area_name,
           'role', am.role
         )), '[]'::json)
         FROM organization_area_members am
         JOIN organization_areas a ON a.id = am.area_id
         WHERE am.user_id = u1.user_id
           AND am.deleted = false 
           AND a.deleted = false
           AND am.organization_id = $1) as areas,
        (SELECT ul.created_at as last_login_at
         FROM user_logs ul
         WHERE ul.user_id = u1.user_id 
           AND ul.log_type = 'AUTH_LOGIN'
         ORDER BY ul.created_at DESC
         LIMIT 1) as last_login
      FROM organization_members om
      LEFT JOIN users u1 ON om.user_id = u1.user_id
      LEFT JOIN users u2 ON om.invited_by = u2.user_id
      WHERE om.organization_id = $1
        
        AND om.deleted = false
      ORDER BY 
        CASE om.role 
          WHEN 'SUPER_ADMIN' THEN 1
          WHEN 'ADMIN' THEN 2
          WHEN 'BILLING_MANAGER' THEN 3
          WHEN 'MEMBER' THEN 4
          WHEN 'GUEST' THEN 5
          ELSE 6
        END,
        om.created_at ASC;
    `;
    const results = await executeQuery(query, [organization_id]);
    return results;
  }

  async countActiveMembersByRole(organization_id, role) {
    const query = `
      SELECT COUNT(*)::int AS total
      FROM organization_members
      WHERE organization_id = $1
        
        AND role = UPPER($2)
        AND deleted = false;
    `;
    const results = await executeQuery(query, [organization_id, role]);
    return results[0]?.total || 0;
  }

  async addOrganizationMember(
    organization_id,
    user_id,
    role,
    status,
    invited_by,
    txClient = null
  ) {
    const inviterId = invited_by || user_id;
    const query = `
      WITH existing AS (
        SELECT id, deleted
        FROM organization_members
        WHERE organization_id = $1
          AND user_id = $2
          
        LIMIT 1
      ),
      reactivated AS (
        UPDATE organization_members
        SET deleted = false,
            role = UPPER($3)::public.organization_workspace_role_enum,
            status = UPPER($4)::public.organization_member_status_enum,
            invited_by = $5,
            updated_at = now(),
            removed_at = NULL,
            removed_by = NULL
        WHERE id = (SELECT id FROM existing WHERE deleted = true)
        RETURNING *
      ),
      inserted AS (
        INSERT INTO organization_members (organization_id, user_id, role, status, invited_by)
        SELECT $1, $2,
          UPPER($3)::public.organization_workspace_role_enum,
          UPPER($4)::public.organization_member_status_enum,
          $5
        WHERE NOT EXISTS (SELECT 1 FROM existing)
        RETURNING *
      )
      SELECT * FROM reactivated
      UNION ALL
      SELECT * FROM inserted;
    `;
    const params = [organization_id, user_id, role, status, inviterId];

    if (txClient) {
      const { rows } = await txClient.query(query, params);
      return rows[0];
    }

    const results = await executeQuery(query, params);
    return results[0];
  }

  /**
   * Returns users who should be auto-added as project members:
   * 1. Org-level ADMIN / SUPER_ADMIN (area_id IS NULL) → project role: PROJECT_MANAGER
   * 2. Area-level ADMIN members → project role: PROJECT_MANAGER
   * 3. Area-level MEMBER members → project role: CONTRIBUTOR
   *
   * @param {string} organizationId
   * @param {string} excludeUserId - The project creator (already added as owner)
   * @returns {Promise<{ user_id: string, project_role: string }[]>}
   */
  async getAutoAssignableProjectMembers(organizationId, excludeUserId) {
    const query = `
      SELECT DISTINCT ON (user_id) user_id::text, project_role
      FROM (
        -- Org-level admins (area_id IS NULL)
        SELECT om.user_id, 'PROJECT_MANAGER' AS project_role, 1 AS priority
        FROM organization_members om
        WHERE om.organization_id = $1
          
          AND om.role IN ('ADMIN', 'SUPER_ADMIN')
          AND om.deleted = false
          AND om.user_id != $2::uuid

        UNION ALL

        -- Area-level admins → PROJECT_MANAGER
        SELECT om.user_id, 'PROJECT_MANAGER' AS project_role, 2 AS priority
        FROM organization_area_members om
        WHERE om.organization_id = $1
          AND om.role = 'ADMIN'
          AND om.deleted = false
          AND om.user_id != $2::uuid

        UNION ALL

        -- Area-level members → CONTRIBUTOR
        SELECT om.user_id, 'CONTRIBUTOR' AS project_role, 3 AS priority
        FROM organization_area_members om
        WHERE om.organization_id = $1
          AND om.role = 'MEMBER'
          AND om.deleted = false
          AND om.user_id != $2::uuid
      ) sub
      ORDER BY user_id, priority ASC;
    `;

    return executeQuery(query, [organizationId, excludeUserId]);
  }

  async removeOrganizationMember(organization_id, user_id) {
    const query = `
      WITH deleted_org_member AS (
        UPDATE organization_members
        SET deleted = true, updated_at = now()
        WHERE organization_id = $1 AND user_id = $2 
          AND role NOT IN ('ADMIN', 'SUPER_ADMIN')
        RETURNING *
      ),
      deleted_area_members AS (
        UPDATE organization_area_members
        SET deleted = true, updated_at = now()
        WHERE organization_id = $1 AND user_id = $2
          AND EXISTS (SELECT 1 FROM deleted_org_member)
        RETURNING *
      )
      SELECT * FROM deleted_org_member;
    `;
    const results = await executeQuery(query, [organization_id, user_id]);
    return results[0];
  }

  async updateMemberRole(organization_id, user_id, role) {
    const query = `
      UPDATE organization_members
      SET role = UPPER($3)::public.organization_workspace_role_enum,
          updated_at = now()
      WHERE organization_id = $1 AND user_id = $2 
      RETURNING *;
    `;
    const results = await executeQuery(query, [organization_id, user_id, role]);
    return results[0];
  }

  async updateMemberStatus(organization_id, user_id, status) {
    const query = `
      UPDATE organization_members
      SET status = UPPER($3)::public.organization_member_status_enum,
          updated_at = now()
      WHERE organization_id = $1 AND user_id = $2 
      RETURNING *;
    `;
    const results = await executeQuery(query, [
      organization_id,
      user_id,
      status,
    ]);
    return results[0];
  }

  /**
   * Get a single org-level member record (area_id IS NULL).
   * @returns {Promise<Object|undefined>}
   */
  async getOrganizationMember(organization_id, user_id) {
    const query = `
      SELECT * FROM organization_members
      WHERE organization_id = $1
        AND user_id = $2
        
        AND deleted = false
      LIMIT 1;
    `;
    const results = await executeQuery(query, [organization_id, user_id]);
    return results[0];
  }

  async isMember(organization_id, user_id) {
    const query = `
      SELECT 1 FROM organization_members
      WHERE organization_id = $1
        AND user_id = $2
        
        AND deleted = false
      LIMIT 1;
    `;
    const results = await executeQuery(query, [organization_id, user_id]);
    return results.length > 0;
  }

  async getOrganizationOwner(organization_id) {
    const query = `
      SELECT om.*, u.name, u.username, u.email, u.avatar_url
      FROM organization_members om
      LEFT JOIN users u ON om.user_id = u.user_id
      INNER JOIN organizations o ON o.id = om.organization_id
      WHERE om.organization_id = $1 AND om.user_id = o.user_id
        
        AND om.deleted = false
      LIMIT 1;
    `;
    const results = await executeQuery(query, [organization_id]);
    return results[0] || null;
  }

  async createOrgs(
    user_id,
    org_name,
    unique_name,
    logo_url,
    banner_url,
    description,
    default_timezone,
    default_locale,
    country,
    settings
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
      const defaultPlanSnapshot = defaultPlan?.details || {};

      const insertOrgQuery = `
      INSERT INTO organizations (
        user_id,
        org_name,
        unique_name,
        logo_url,
        banner_url,
        description,
        default_timezone,
        default_locale,
        country,
        settings,
        plan_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11)
      RETURNING
        id,
        user_id,
        org_name,
        unique_name,
        logo_url,
        banner_url,
        description,
        default_timezone,
        default_locale,
        country,
        settings,
        plan_id,
        NULL AS plan_snapshot,
        created_at,
        updated_at,
        deleted;
    `;

      const orgResult = await client.query(insertOrgQuery, [
        user_id,
        org_name,
        unique_name,
        logo_url,
        banner_url,
        description,
        default_timezone,
        default_locale,
        country,
        settings,
        defaultPlanId,
      ]);

      const organization = orgResult.rows[0];

      // Atualiza o usuário com o organization_id criado
      const updateUserQuery = `
      UPDATE users
      SET organization_id = $1,
          plan_id = COALESCE(plan_id, $3)
      WHERE user_id = $2;
    `;

      await client.query(updateUserQuery, [organization.id, user_id, defaultPlanId]);

      // Adiciona associação do usuário à org
      await this.addOrganizationMember(
        organization.id,
        user_id,
        "ADMIN",
        "ACTIVE",
        null,
        client
      );

      // Cria a área raiz (central) da organização
      const rootAreaSlug = unique_name || 'central';
      await client.query(
        `INSERT INTO organization_areas (
           organization_id, area_name, slug, description, properties, created_by, is_root_area
         ) VALUES ($1, 'Central', $2, 'Área central da organização', '{}'::jsonb, $3, true)`,
        [organization.id, rootAreaSlug, user_id]
      );

      if (defaultPlanId) {
        const periodStart = new Date();
        const periodEnd = new Date();
        periodEnd.setMonth(periodEnd.getMonth() + 1);

        await client.query(
          `INSERT INTO subscriptions (subscriber_type, subscriber_id, plan_id, status, provider, current_period_start, current_period_end)
           VALUES ('organization', $1, $2, 'active', 'internal', $3, $4)
           ON CONFLICT (subscriber_type, subscriber_id)
           DO UPDATE SET plan_id = EXCLUDED.plan_id, status = 'active', updated_at = NOW()`,
          [organization.id, defaultPlanId, periodStart, periodEnd]
        );
      }

      await client.query("COMMIT");

      return organization;
    } catch (err) {
      await client.query("ROLLBACK");
      console.error("Erro ao criar organização:", err);
      throw err;
    } finally {
      client.release();
    }
  }

  async updateOrg(
    organization_id,
    user_id,
    org_name,
    unique_name,
    logo_url,
    banner_url,
    description,
    settings,
    deleted
  ) {
    const query = `
      UPDATE organizations o
      SET org_name = $3,
          unique_name = $4,
          logo_url = $5,
          banner_url = $6,
          description = $7,
          settings = $8::jsonb,
          deleted = $9,
          updated_at = NOW()
      WHERE o.id = $1
        AND (
          o.user_id = $2
          OR EXISTS (
            SELECT 1 FROM organization_members om
            WHERE om.organization_id = o.id
              AND om.user_id = $2
              
              AND om.deleted = false
              AND om.role IN ('SUPER_ADMIN', 'ADMIN')
          )
        )
      RETURNING
        id,
        user_id,
        org_name,
        unique_name,
        logo_url,
        banner_url,
        description,
        settings,
        created_at,
        updated_at,
        deleted;
    `;
    const results = await executeQuery(query, [
      organization_id,
      user_id,
      org_name,
      unique_name,
      logo_url,
      banner_url,
      description,
      settings,
      deleted,
    ]);
    return results[0];
  }

  async updateCreationIdentityStep(
    organization_id,
    user_id,
    {
      org_name,
      unique_name,
      logo_url,
      banner_url,
      description,
      default_timezone,
      default_locale,
      country,
      settings,
    }
  ) {
    const query = `
      UPDATE organizations o
      SET org_name = $3,
          unique_name = $4,
          logo_url = $5,
          banner_url = $6,
          description = $7,
          default_timezone = $8,
          default_locale = $9,
          country = $10,
          settings = $11::jsonb,
          updated_at = NOW()
      WHERE o.id = $1
        AND (
          o.user_id = $2
          OR EXISTS (
            SELECT 1 FROM organization_members om
            WHERE om.organization_id = o.id
              AND om.user_id = $2
              
              AND om.deleted = false
              AND om.role IN ('SUPER_ADMIN', 'ADMIN')
          )
        )
      RETURNING
        id,
        user_id,
        org_name,
        unique_name,
        logo_url,
        banner_url,
        description,
        default_timezone,
        default_locale,
        country,
        settings,
        NULL AS plan_snapshot,
        plan_id,
        branding_properties,
        integrations,
        created_at,
        updated_at,
        deleted;
    `;

    const results = await executeQuery(query, [
      organization_id,
      user_id,
      org_name,
      unique_name,
      logo_url,
      banner_url,
      description,
      default_timezone,
      default_locale,
      country,
      settings,
    ]);
    return results[0] || null;
  }

  async updateCreationConfigurationStep(
    organization_id,
    user_id,
    {
      settings,
      branding_properties,
      integrations,
      plan_id,
      plan_snapshot,
    }
  ) {
    const query = `
      UPDATE organizations o
      SET settings = $3::jsonb,
          branding_properties = $4::jsonb,
          integrations = $5::jsonb,
          plan_id = $6,
          updated_at = NOW()
      WHERE o.id = $1
        AND (
          o.user_id = $2
          OR EXISTS (
            SELECT 1 FROM organization_members om
            WHERE om.organization_id = o.id
              AND om.user_id = $2
              
              AND om.deleted = false
              AND om.role IN ('SUPER_ADMIN', 'ADMIN', 'BILLING_MANAGER')
          )
        )
      RETURNING
        id,
        user_id,
        org_name,
        unique_name,
        logo_url,
        banner_url,
        description,
        default_timezone,
        default_locale,
        country,
        settings,
        NULL AS plan_snapshot,
        plan_id,
        branding_properties,
        integrations,
        created_at,
        updated_at,
        deleted;
    `;

    const results = await executeQuery(query, [
      organization_id,
      user_id,
      settings,
      branding_properties,
      integrations,
      plan_id,
    ]);
    return results[0] || null;
  }

  // Organization Invites
  async createOrgInvite(
    organization_id,
    email,
    role,
    invited_by,
    name = null,
    username = null,
    target_areas = []
  ) {
    const query = `
      INSERT INTO organization_member_invites (
        organization_id, email, name, username, role, invited_by, expires_at,
        target_areas
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        UPPER($5)::public.organization_workspace_role_enum,
        $6,
        NOW() + INTERVAL '7 days',
        $7::jsonb
      )
      RETURNING *;
    `;
    const results = await executeQuery(query, [
      organization_id,
      email,
      name,
      username,
      role,
      invited_by,
      JSON.stringify(target_areas),
    ]);
    return results[0];
  }

  async resendOrgInvite(invite_id) {
    const query = `
      UPDATE organization_member_invites
      SET expires_at = NOW() + INTERVAL '7 days',
          updated_at = NOW()
      WHERE invite_id = $1
        AND deleted = false
      RETURNING *;
    `;
    const results = await executeQuery(query, [invite_id]);
    return results[0];
  }

  async findOrgInviteByToken(invite_id) {
    const query = `
      SELECT i.*, o.org_name, o.unique_name as org_unique_name, o.logo_url
      FROM organization_member_invites i
      JOIN organizations o ON o.id = i.organization_id
      WHERE i.invite_id = $1 
        AND i.deleted = false 
        AND i.invite_verified = false
        AND i.expires_at > NOW();
    `;
    const results = await executeQuery(query, [invite_id]);
    return results[0];
  }

  /** Finds an invite regardless of verification/expiry status for diagnostic purposes */
  async findOrgInviteByTokenDiagnostic(invite_id) {
    const query = `
      SELECT i.invite_verified, i.expires_at, i.deleted
      FROM organization_member_invites i
      WHERE i.invite_id = $1
      LIMIT 1;
    `;
    const results = await executeQuery(query, [invite_id]);
    return results[0];
  }

  async getAllOrgInvites(organization_id) {
    const query = `
      SELECT * FROM organization_member_invites
      WHERE organization_id = $1 
      ORDER BY created_at DESC;
    `;
    return await executeQuery(query, [organization_id]);
  }

  async getPendingOrgInvites(organization_id) {
    const query = `
      SELECT * FROM organization_member_invites
      WHERE organization_id = $1 
        AND deleted = false 
        AND invite_verified = false
        AND expires_at > NOW()
      ORDER BY created_at DESC;
    `;
    return await executeQuery(query, [organization_id]);
  }

  async verifyOrgInvite(invite_id) {
    const query = `
      UPDATE organization_member_invites
      SET invite_verified = true, updated_at = NOW()
      WHERE invite_id = $1
      RETURNING *;
    `;
    const results = await executeQuery(query, [invite_id]);
    return results[0];
  }

  async deleteOrgInvite(invite_id) {
    const query = `
      UPDATE organization_member_invites
      SET deleted = true, updated_at = NOW()
      WHERE invite_id = $1
      RETURNING *;
    `;
    const results = await executeQuery(query, [invite_id]);
    return results[0];
  }

  async checkExistingInvite(organization_id, email) {
    const query = `
      SELECT * FROM organization_member_invites
      WHERE organization_id = $1 
        AND LOWER(email) = LOWER($2)
        AND deleted = false 
        AND invite_verified = false
        AND expires_at > NOW();
    `;
    const results = await executeQuery(query, [organization_id, email]);
    return results[0];
  }

  async updateOrgLogo(organization_id, logo_url, user_id) {
    const query = `
WITH user_check AS (
    SELECT 1 FROM organization_members 
    WHERE organization_id = $1 AND user_id = $3  AND role IN ('SUPER_ADMIN', 'ADMIN') AND deleted = false
)
UPDATE organizations
SET logo_url = $2, updated_at = NOW()
WHERE id = $1 AND EXISTS (SELECT 1 FROM user_check)
RETURNING *;
    `;
    const results = await executeQuery(query, [organization_id, logo_url, user_id]);
    return results[0];
  }

  async updateOrgBanner(organization_id, banner_url, user_id) {
    const query = `
WITH user_check AS (
    SELECT 1 FROM organization_members 
    WHERE organization_id = $1 AND user_id = $3  AND role IN ('SUPER_ADMIN', 'ADMIN') AND deleted = false
)
UPDATE organizations
SET banner_url = $2, updated_at = NOW()
WHERE id = $1 AND EXISTS (SELECT 1 FROM user_check)
RETURNING *;
    `;
    const results = await executeQuery(query, [organization_id, banner_url, user_id]);
    return results[0];
  }

  async getOrganizationProjects(organization_id) {
    const query = `
      SELECT 
        p.id,
        p.title,
        p.description,
        p.user_id as owner_user_id,
        p.organization_id,
        p.properties,
        p.created_at,
        p.updated_at,
        pm.user_id as project_member_user_id,
        (SELECT COUNT(*) 
         FROM project_members pm 
         WHERE pm.project_id = p.id AND pm.deleted = false) as members_count
      FROM projects p
      LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = p.user_id AND pm.deleted = false
      WHERE p.organization_id = $1 AND p.deleted = false
      ORDER BY p.created_at DESC;
    `;
    const results = await executeQuery(query, [organization_id]);
    return results;
  }

}

module.exports = new OrganizationsRepository();
