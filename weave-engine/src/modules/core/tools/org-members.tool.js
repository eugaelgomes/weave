const { pool } = require("../../../services/postgres.client");

const schemas = [
  {
    name: "list_org_members",
    description:
      "Lists all active members of the organization the user belongs to. Returns each member's user ID, name, username, email, avatar, role (SUPER_ADMIN, ADMIN, BILLING_MANAGER, MEMBER, GUEST), and status.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "get_org_member",
    description:
      "Fetches detailed information about a specific organization member by their user ID. Returns the member's role, status, name, username, email, and avatar URL.",
    parameters: {
      type: "object",
      properties: {
        memberId: {
          type: "string",
          description: "The UUID of the user (member) to look up.",
        },
      },
      required: ["memberId"],
    },
  },
];

/**
 * Lists all active members of the user's organization.
 * @param {object} args
 * @param {string} args.organizationId - Injected securely via executionContext
 * @returns {Promise<object>}
 */
async function listOrgMembers(args) {
  if (!args.organizationId) {
    return { error: "No organizationId provided in execution context." };
  }

  try {
    const { rows } = await pool.query(
      `SELECT
        om.user_id::text,
        om.role,
        om.status,
        om.created_at,
        u.name,
        u.username,
        u.email,
        u.avatar_url
       FROM organization_members om
       INNER JOIN users u ON om.user_id = u.user_id
       WHERE om.organization_id = $1::uuid
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
         om.created_at ASC`,
      [args.organizationId]
    );

    return { members: rows, count: rows.length };
  } catch (error) {
    return {
      error: "Database error fetching org members: " + error.message,
    };
  }
}

/**
 * Fetches a specific organization member by their user ID.
 * @param {object} args
 * @param {string} args.memberId
 * @param {string} args.organizationId - Injected securely via executionContext
 * @returns {Promise<object>}
 */
async function getOrgMember(args) {
  if (!args.organizationId) {
    return { error: "No organizationId provided in execution context." };
  }
  if (!args.memberId) {
    return { error: "memberId is required." };
  }

  try {
    const { rows } = await pool.query(
      `SELECT
        om.user_id::text,
        om.role,
        om.status,
        om.created_at,
        om.updated_at,
        u.name,
        u.username,
        u.email,
        u.avatar_url
       FROM organization_members om
       INNER JOIN users u ON om.user_id = u.user_id
       WHERE om.organization_id = $1::uuid
         AND om.user_id = $2::uuid
         AND om.deleted = false
       LIMIT 1`,
      [args.organizationId, args.memberId]
    );

    if (rows.length === 0) {
      return { error: "Member not found in this organization." };
    }

    return { member: rows[0] };
  } catch (error) {
    return {
      error: "Database error fetching org member: " + error.message,
    };
  }
}

module.exports = {
  schemas,
  listOrgMembers,
  getOrgMember,
};
