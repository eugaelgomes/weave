const { pool } = require("../../../services/postgres.client");

const schemas = [
  {
    name: "list_my_projects",
    description: "Retrieves a list of all active projects the user is working on or has access to.",
    parameters: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "Max number of projects to return (default: 10).",
        },
      },
    },
  },
];

/**
 * Fetches user active projects from the database.
 * @param {object} args
 * @param {string} args.userId Injected securely via executionContext
 * @returns {Promise<object>}
 */
async function listMyProjects(args) {
  if (!args.userId) {
    return { error: "No userId provided in execution context." };
  }
  
  const limit = typeof args.limit === "number" && args.limit > 0 ? args.limit : 10;

  try {
    // Querying projects owned by or shared with the user
    const { rows } = await pool.query(
      `SELECT p.id, p.title, p.description, p.status, p.updated_at
       FROM projects p
       WHERE p.deleted = false 
         AND (p.user_id = $1::uuid 
              OR EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = p.id AND pm.user_id = $1::uuid AND pm.deleted = false AND pm.suspended = false))
       ORDER BY p.updated_at DESC
       LIMIT $2`,
      [args.userId, limit]
    );

    return { projects: rows };
  } catch (error) {
    return { error: "Database error fetching projects: " + error.message };
  }
}

module.exports = {
  schemas,
  listMyProjects,
};
