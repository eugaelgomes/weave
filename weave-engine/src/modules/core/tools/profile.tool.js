const { pool } = require("../../../services/postgres.client");

const schemas = [
  {
    name: "get_user_profile",
    description:
      "Fetches the current user's profile information (name, timezone, etc). Use this when you need to know who you are talking to.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
];

/**
 * Fetches user profile data from the database.
 * @param {object} args
 * @param {string} args.userId Injected securely via executionContext
 * @param {string} [args.organizationId] Injected securely via executionContext
 * @returns {Promise<object>}
 */
async function getUserProfile(args) {
  if (!args.userId) {
    return { error: "No userId provided in execution context." };
  }

  try {
    const { rows } = await pool.query(
      `SELECT user_id, name, username, email, theme_mode, user_preference, created_at 
       FROM users 
       WHERE user_id = $1::uuid AND deleted = false LIMIT 1`,
      [args.userId]
    );

    if (rows.length === 0) return { error: "User not found." };
    const profile = rows[0];

    let organization = null;
    if (args.organizationId) {
      const { rows: orgRows } = await pool.query(
        `SELECT id, org_name, unique_name 
         FROM organizations 
         WHERE id = $1::uuid AND deleted = false LIMIT 1`,
        [args.organizationId]
      );
      if (orgRows.length > 0) {
        organization = orgRows[0];
      }
    }

    return { profile, organization };
  } catch (error) {
    return { error: "Database error fetching profile: " + error.message };
  }
}

module.exports = {
  schemas,
  getUserProfile,
};
