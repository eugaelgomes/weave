/**
 * @module weave-engine/modules/core/tools/actions/organization.action
 * @description Implementation logic for the organization.action AI tool.
 */
const { pool } = require("../../../../services/postgres.client");

/**
 * Fetches organization details from the database.
 * @param {object} args
 * @param {string} args.organizationId Injected securely via executionContext
 * @returns {Promise<object>}
 */
async function getOrganizationDetails(args) {
  if (!args.organizationId) {
    return { message: "User is not currently part of any organization. Cannot retrieve organization details." };
  }

  try {
    const { rows } = await pool.query(
      `SELECT
        id, org_name, unique_name, created_at,
        (SELECT count(*) FROM organization_members WHERE organization_id = organizations.id AND deleted = false) as member_count,
        (SELECT count(*) FROM projects WHERE organization_id = organizations.id AND deleted = false) as project_count
       FROM organizations
       WHERE id = $1::uuid AND deleted = false LIMIT 1`,
      [args.organizationId]
    );

    if (rows.length === 0) return { error: "Organization not found." };

    return { organization: rows[0] };
  } catch (error) {
    return {
      error: "Database error fetching organization details: " + error.message,
    };
  }
}

module.exports = {
  getOrganizationDetails,
};
