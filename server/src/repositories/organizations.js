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
    user_id,
    org_name,
    unique_name,
    logo_url,
    banner_url,
    description
  ) {
    const query = `
      INSERT INTO organizations (user_id, org_name, unique_name, logo_url, banner_url, description)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *; 
    `;
    const results = await executeQuery(query, [
      user_id,
      org_name,
      unique_name,
      logo_url,
      banner_url,
      description,
    ]);
    return results[0];
  }
}

module.exports = new OrganizationsRepository();