const { executeQuery, rowCount } = require("@/services/db/index");
const imageUtils = require("@/middlewares/data/image-utils");

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
  o.properties,
  o.org_domains,
  o.deleted,
  o.created_at,
  o.updated_at,
  u.avatar_url,
  u.name,
  u.username,
  u.email
FROM organizations o
JOIN users u ON u.user_id = o.user_id
WHERE o.user_id = $1;

    `;
    const results = await executeQuery(query, [user_id]);
    return await imageUtils.addSignedUrlsToArray(results, [
      "logo_url",
      "banner_url",
      "avatar_url",
    ]);
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
      SELECT om.*, u.name, u.username, u.email, u.avatar_url
      FROM organizations_members om
      LEFT JOIN users u ON om.user_id = u.user_id
      WHERE om.organization_id = $1
      ORDER BY 
        CASE om.role 
          WHEN 'owner' THEN 1
          WHEN 'admin' THEN 2
          WHEN 'member' THEN 3
          ELSE 4
        END,
        om.created_at ASC;
    `;
    const results = await executeQuery(query, [organization_id]);
    return await imageUtils.addSignedUrlsToArray(results, ["avatar_url"]);
  }

  async addOrganizationMember(
    organization_id,
    user_id,
    role,
    status,
    invited_by
  ) {
    const query = `
      INSERT INTO organizations_members (organization_id, user_id, role, status, invited_by)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;
    const results = await executeQuery(query, [
      organization_id,
      user_id,
      role,
      status,
      invited_by,
    ]);
    return results[0];
  }

  async removeOrganizationMember(organization_id, user_id) {
    const query = `
      UPDATE organizations_members
      SET deleted = true, updated_at = now()
      WHERE organization_id = $1 AND user_id = $2
      RETURNING *;
    `;
    const results = await executeQuery(query, [organization_id, user_id]);
    return results[0];
  }

  async updateMemberRole(organization_id, user_id, role) {
    const query = `
      UPDATE organizations_members
      SET role = $3, updated_at = now()
      WHERE organization_id = $1 AND user_id = $2
      RETURNING *;
    `;
    const results = await executeQuery(query, [organization_id, user_id, role]);
    return results[0];
  }

  async updateMemberStatus(organization_id, user_id, status) {
    const query = `
      UPDATE organizations_members
      SET status = $3, updated_at = now()
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

  async isMember(organization_id, user_id) {
    const query = `
      SELECT 1 FROM organizations_members
      WHERE organization_id = $1 AND user_id = $2;
    `;
    const results = await executeQuery(query, [organization_id, user_id]);
    return results.length > 0;
  }

  async getOrganizationOwner(organization_id) {
    const query = `
      SELECT om.*, u.name, u.username, u.email, u.avatar_url
      FROM organizations_members om
      LEFT JOIN users u ON om.user_id = u.user_id
      WHERE om.organization_id = $1 AND om.role = 'owner'
      LIMIT 1;
    `;
    const results = await executeQuery(query, [organization_id]);
    if (results[0]) {
      return await imageUtils.addSignedUrls(results[0], ["avatar_url"]);
    }
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
    try {
      await client.query("BEGIN");

      const insertOrgQuery = `
      INSERT INTO organizations (user_id, org_name, unique_name, logo_url, banner_url, description, properties, org_domains)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *;
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
        "owner",
        "active",
        null,
        client // permite usar a mesma transação dentro do método
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
          properties = $8,
          deleted = $9,
          org_domains = $10
      WHERE id = $1 and user_id = $2
      RETURNING *;
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
    if (results[0]) {
      return await imageUtils.addSignedUrls(results[0], [
        "logo_url",
        "banner_url",
      ]);
    }
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
}

module.exports = new OrganizationsRepository();
