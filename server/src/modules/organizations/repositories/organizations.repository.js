const {
  executeQuery,
  rowCount,
  getConnection,
} = require("@/database/connection");

class OrganizationsRepository {
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
      o.basic_properties AS properties,
      o.org_domains,
      o.deleted,
      o.created_at,
      o.updated_at,
      o.settings,
      o.plan AS plan_snapshot,
      o.address,
      o.delete_at,
      o.deleted_by,
      o.plan_id,
      o.branding_properties,
      o.integrations,
      p.name as plan_name,
      p.details as plan_details,
      p.plan_value,
      p.currency,
      p.billing_cycle,
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
         FROM projects_members pm
         JOIN projects p ON p.id = pm.project_id
         WHERE pm.user_id = u1.user_id
           AND pm.deleted = false 
           AND p.deleted = false) as projects,
        (SELECT COALESCE(json_agg(json_build_object(
           'area_id', a.id::text,
           'area_name', a.area_name,
           'role', am.role
         )), '[]'::json)
         FROM organizations_areas_members am
         JOIN organizations_areas a ON a.id = am.area_id
         WHERE am.user_id = u1.user_id
           AND am.deleted = false 
           AND a.deleted = false
           AND am.organization_id = $1) as areas,
        (SELECT ul.created_at as last_login_at
         FROM users_logs ul
         WHERE ul.user_id = u1.user_id 
           AND ul.log_type = 'auth_login'
         ORDER BY ul.created_at DESC
         LIMIT 1) as last_login
      FROM organizations_members om
      LEFT JOIN users u1 ON om.user_id = u1.user_id
      LEFT JOIN users u2 ON om.invited_by = u2.user_id
      WHERE om.org_id = $1
      ORDER BY 
        CASE om.role 
          WHEN 'super_admin' THEN 1
          WHEN 'admin' THEN 2
          WHEN 'member' THEN 3
          WHEN 'guest' THEN 4
          ELSE 5
        END,
        om.created_at ASC;
    `;
    const results = await executeQuery(query, [organization_id]);
    return results;
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
      INSERT INTO organizations_members (org_id, user_id, role, status, invited_by)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;
    const params = [organization_id, user_id, role, status, inviterId];

    if (txClient) {
      const { rows } = await txClient.query(query, params);
      return rows[0];
    }

    const results = await executeQuery(query, params);
    return results[0];
  }

  async removeOrganizationMember(organization_id, user_id) {
    const query = `
      UPDATE organizations_members
      SET deleted = true, updated_at = now()
      WHERE org_id = $1 AND user_id = $2
      RETURNING *;
    `;
    const results = await executeQuery(query, [organization_id, user_id]);
    return results[0];
  }

  async updateMemberRole(organization_id, user_id, role) {
    const query = `
      UPDATE organizations_members
      SET role = $3, updated_at = now()
      WHERE org_id = $1 AND user_id = $2
      RETURNING *;
    `;
    const results = await executeQuery(query, [organization_id, user_id, role]);
    return results[0];
  }

  async updateMemberStatus(organization_id, user_id, status) {
    const query = `
      UPDATE organizations_members
      SET status = $3, updated_at = now()
      WHERE org_id = $1 AND user_id = $2
      RETURNING *;
    `;
    const results = await executeQuery(query, [
      organization_id,
      user_id,
      status,
    ]);
    return results[0];
  }

  async isMember(organization_id, user_id) {
    const query = `
      SELECT 1 FROM organizations_members
      WHERE org_id = $1 AND user_id = $2;
    `;
    const results = await executeQuery(query, [organization_id, user_id]);
    return results.length > 0;
  }

  async getOrganizationOwner(organization_id) {
    const query = `
      SELECT om.*, u.name, u.username, u.email, u.avatar_url
      FROM organizations_members om
      LEFT JOIN users u ON om.user_id = u.user_id
      INNER JOIN organizations o ON o.id = om.org_id
      WHERE om.org_id = $1 AND om.user_id = o.user_id
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
    properties,
    org_domains
  ) {
    const client = await getConnection();
    try {
      await client.query("BEGIN");

      const insertOrgQuery = `
      INSERT INTO organizations (
        user_id,
        org_name,
        unique_name,
        logo_url,
        banner_url,
        description,
        basic_properties,
        org_domains
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::text[])
      RETURNING
        id,
        user_id,
        org_name,
        unique_name,
        logo_url,
        banner_url,
        description,
        basic_properties AS properties,
        org_domains,
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
        properties,
        org_domains,
      ]);

      const organization = orgResult.rows[0];

      // Atualiza o usuário com o org_id criado
      const updateUserQuery = `
      UPDATE users
      SET org_id = $1
      WHERE user_id = $2;
    `;

      await client.query(updateUserQuery, [organization.id, user_id]);

      // Adiciona associação do usuário à org
      await this.addOrganizationMember(
        organization.id,
        user_id,
        "super_admin",
        "active",
        null,
        client
      );

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
    org_id,
    user_id,
    org_name,
    unique_name,
    logo_url,
    banner_url,
    description,
    properties,
    deleted,
    org_domains
  ) {
    const query = `
      UPDATE organizations
      SET user_id = $2,
          org_name = $3,
          unique_name = $4,
          logo_url = $5,
          banner_url = $6,
          description = $7,
          basic_properties = $8::jsonb,
          deleted = $9,
          org_domains = $10::text[]
      WHERE id = $1 and user_id = $2
      RETURNING
        id,
        user_id,
        org_name,
        unique_name,
        logo_url,
        banner_url,
        description,
        basic_properties AS properties,
        org_domains,
        created_at,
        updated_at,
        deleted;
    `;
    const results = await executeQuery(query, [
      org_id,
      user_id,
      org_name,
      unique_name,
      logo_url,
      banner_url,
      description,
      properties,
      deleted,
      org_domains,
    ]);
    return results[0];
  }

  // Organization Invites
  async createOrgInvite(
    org_id,
    email,
    role,
    invited_by,
    name = null,
    username = null
  ) {
    const query = `
      INSERT INTO invite_org_members (org_id, email, name, username, role, invited_by, expires_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW() + INTERVAL '7 days')
      RETURNING *;
    `;
    const results = await executeQuery(query, [
      org_id,
      email,
      name,
      username,
      role,
      invited_by,
    ]);
    return results[0];
  }

  async findOrgInviteByToken(invite_id) {
    const query = `
      SELECT i.*, o.org_name, o.unique_name as org_unique_name
      FROM invite_org_members i
      JOIN organizations o ON o.id = i.org_id
      WHERE i.invite_id = $1 
        AND i.deleted = false 
        AND i.invite_verified = false
        AND i.expires_at > NOW();
    `;
    const results = await executeQuery(query, [invite_id]);
    return results[0];
  }

  async getPendingOrgInvites(org_id) {
    const query = `
      SELECT * FROM invite_org_members
      WHERE org_id = $1 
        AND deleted = false 
        AND invite_verified = false
        AND expires_at > NOW()
      ORDER BY created_at DESC;
    `;
    return await executeQuery(query, [org_id]);
  }

  async verifyOrgInvite(invite_id) {
    const query = `
      UPDATE invite_org_members
      SET invite_verified = true, updated_at = NOW()
      WHERE invite_id = $1
      RETURNING *;
    `;
    const results = await executeQuery(query, [invite_id]);
    return results[0];
  }

  async deleteOrgInvite(invite_id) {
    const query = `
      UPDATE invite_org_members
      SET deleted = true, updated_at = NOW()
      WHERE invite_id = $1
      RETURNING *;
    `;
    const results = await executeQuery(query, [invite_id]);
    return results[0];
  }

  async checkExistingInvite(org_id, email) {
    const query = `
      SELECT * FROM invite_org_members
      WHERE org_id = $1 
        AND LOWER(email) = LOWER($2)
        AND deleted = false 
        AND invite_verified = false
        AND expires_at > NOW();
    `;
    const results = await executeQuery(query, [org_id, email]);
    return results[0];
  }

  async updateOrgLogo(org_id, logo_url, user_id) {
    const query = `
WITH user_check AS (
    SELECT 1 FROM organizations_members 
    WHERE org_id = $1 AND user_id = $3 AND role IN ('super_admin', 'admin')
)
UPDATE organizations
SET logo_url = $2, updated_at = NOW()
WHERE id = $1 AND EXISTS (SELECT 1 FROM user_check)
RETURNING *;
    `;
    const results = await executeQuery(query, [org_id, logo_url, user_id]);
    return results[0];
  }

  async updateOrgBanner(org_id, banner_url, user_id) {
    const query = `
WITH user_check AS (
    SELECT 1 FROM organizations_members 
    WHERE org_id = $1 AND user_id = $3 AND role IN ('super_admin', 'admin')
)
UPDATE organizations
SET banner_url = $2, updated_at = NOW()
WHERE id = $1 AND EXISTS (SELECT 1 FROM user_check)
RETURNING *;
    `;
    const results = await executeQuery(query, [org_id, banner_url, user_id]);
    return results[0];
  }

  async getOrganizationProjects(organization_id) {
    const query = `
      SELECT 
        p.id,
        p.title,
        p.description,
        p.user_id as owner_user_id,
        p.org_id,
        p.properties,
        p.created_at,
        p.updated_at,
        pm.user_id as project_member_user_id,
        (SELECT COUNT(*) 
         FROM projects_members pm 
         WHERE pm.project_id = p.id AND pm.deleted = false) as members_count
      FROM projects p
      LEFT JOIN projects_members pm ON pm.project_id = p.id AND pm.user_id = p.user_id AND pm.deleted = false
      WHERE p.org_id = $1 AND p.deleted = false
      ORDER BY p.created_at DESC;
    `;
    const results = await executeQuery(query, [organization_id]);
    return results;
  }

  async refreshOrgDomainsCache(organizationId) {
    const query = `
      UPDATE organizations o
      SET org_domains = (
        SELECT COALESCE(
          array_agg(od.domain_name ORDER BY od.domain_name),
          '{}'::text[]
        )
        FROM organization_domains od
        WHERE od.organization_id = $1
          AND od.status = 'VERIFIED'
          AND od.deleted = false
      ),
      updated_at = NOW()
      WHERE o.id = $1
      RETURNING org_domains;
    `;

    const results = await executeQuery(query, [organizationId]);
    return results[0]?.org_domains || [];
  }
}

module.exports = new OrganizationsRepository();
