/**
 * @module weave-engine/modules/core/tools/actions/project.action
 * @description Implementation logic for the project.action AI tool.
 */
const { pool } = require("../../services/database/postgres.client");

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

  const limit =
    typeof args.limit === "number" && args.limit > 0 ? args.limit : 10;

  try {
    // Querying projects owned by or shared with the user
    const { rows } = await pool.query(
      `SELECT 
        p.id, p.public_project_id, p.title, p.description, p.status, p.updated_at,
        (SELECT count(*) FROM notes n WHERE n.project_id = p.id AND n.deleted = false) as total_tasks,
        (SELECT count(*) FROM notes n WHERE n.project_id = p.id AND n.deleted = false AND n.status = 'ARCHIVED') as archived_tasks,
        (SELECT count(*) FROM project_stages ps WHERE ps.project_id = p.id) as total_stages,
        (
          SELECT jsonb_agg(jsonb_build_object('name', u.name, 'avatar_url', u.avatar_url, 'role', pm.role))
          FROM project_members pm 
          INNER JOIN users u ON pm.user_id = u.user_id
          WHERE pm.project_id = p.id AND pm.deleted = false AND pm.suspended = false
        ) as collaborators
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

/**
 * Fetches detailed project information from the database, including stages and tasks.
 * @param {object} args
 * @param {string} args.projectId The ID of the project
 * @param {string} args.userId Injected securely via executionContext
 * @returns {Promise<object>}
 */
async function getProjectDetails(args) {
  if (!args.userId) {
    return { error: "No userId provided in execution context." };
  }
  if (!args.projectId) {
    return { error: "No projectId provided." };
  }

  try {
    // Ensure the user has access to this project
    const accessCheck = await pool.query(
      `SELECT 1 FROM projects p
       WHERE p.id = $1::uuid AND p.deleted = false
         AND (p.user_id = $2::uuid 
              OR EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = p.id AND pm.user_id = $2::uuid AND pm.deleted = false AND pm.suspended = false))`,
      [args.projectId, args.userId]
    );

    if (accessCheck.rowCount === 0) {
      return {
        error: "Project not found or you don't have permission to view it.",
      };
    }

    const { rows } = await pool.query(
      `SELECT
        p.id, p.public_project_id, p.title, p.description, p.status, p.properties, p.created_at, p.updated_at, p.projects_files,
        (
          SELECT jsonb_agg(jsonb_build_object('id', ps.id, 'name', ps.name, 'position', ps.position))
          FROM project_stages ps WHERE ps.project_id = p.id
        ) as stages,
        (
          SELECT jsonb_agg(jsonb_build_object(
            'id', n.id, 'public_note_id', n.public_note_id, 'title', n.title, 'status', n.status, 
            'stage_id', n.project_stage_id, 'priority_id', n.priority_id, 
            'tags', n.tags, 'updated_at', n.updated_at
          ))
          FROM notes n WHERE n.project_id = p.id AND n.deleted = false
        ) as tasks,
        (
          SELECT jsonb_agg(jsonb_build_object('user_id', pm.user_id, 'name', u.name, 'email', u.email, 'avatar_url', u.avatar_url, 'role', pm.role))
          FROM project_members pm 
          INNER JOIN users u ON pm.user_id = u.user_id
          WHERE pm.project_id = p.id AND pm.deleted = false AND pm.suspended = false
        ) as collaborators
       FROM projects p
       WHERE p.id = $1::uuid`,
      [args.projectId]
    );

    return { project: rows[0] || null };
  } catch (error) {
    return {
      error: "Database error fetching project details: " + error.message,
    };
  }
}

module.exports = {
  listMyProjects,
  getProjectDetails,
};
