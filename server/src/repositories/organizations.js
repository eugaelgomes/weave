const { executeQuery, rowCount } = require("@/services/db/db-connection");

class OrganizationsRepository {
  async getOrgsByUserId(user_id) {
    const query = `
      SELECT * FROM organizations
      WHERE user_id = $1;
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

  async createOrgs(
    user_id, // uuid
    org_name, // string
    unique_name, // string
    logo_url, // string
    banner_url, // string
    description, // string
    properties, // Jsonb
    members, // Jsonb
    projects, // Jsonb
    org_domains // array of strings
  ) {
    const query = `
      INSERT INTO organizations (user_id, org_name, unique_name, logo_url, banner_url, description, properties, members, projects, org_domains)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *; 
    `;
    const results = await executeQuery(query, [
      user_id, // uuid
      org_name, // string
      unique_name, // string
      logo_url, // string
      banner_url, // string
      description, // string
      properties, // Jsonb
      members, // Jsonb
      projects, // Jsonb
      org_domains, // array of strings
    ]);
    return results[0];
  }

  async updateOrg(
    org_id, // uuid
    user_id, // uuid
    org_name, // string
    unique_name, // string
    logo_url, // string
    banner_url, // string
    description, // string
    properties, // Jsonb
    deleted, // boolean
    members, // Jsonb
    projects, // Jsonb
    org_domains // array of strings
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
          members = $10,
          projects = $11,
          org_domains = $12
      WHERE id = $1 and user_id = $2
      RETURNING *;
    `;
    const results = await executeQuery(query, [
      org_id, // uuid
      user_id, // uuid
      org_name, // string
      unique_name, // string
      logo_url, // string
      banner_url, // string
      description, // string
      properties, // Jsonb
      deleted, // boolean
      members, // Jsonb
      projects, // Jsonb
      org_domains, // array of strings
    ]);
    return results[0];
  }
}

module.exports = new OrganizationsRepository();
