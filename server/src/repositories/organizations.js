const { executeQuery, rowCount } = require("@/services/db/db-connection");

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
    return await executeQuery(query, [user_id]);
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
    return await executeQuery(query, [organization_id]);
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
    return results[0];
  }
}

module.exports = new OrganizationsRepository();
