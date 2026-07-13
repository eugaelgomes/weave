/**
 * @module weave-engine/modules/core/tools/actions/project.action
 * @description Implementation logic for the project AI tools.
 */
const { pool } = require("../../services/database/postgres.client");

/**
 * Checks basic access to a project.
 */
async function checkProjectAccess(projectId, userId, organizationId) {
  let accessQuery = `
    SELECT 1 FROM projects p
    WHERE p.id = $1::uuid AND p.deleted = false
      AND (
        p.user_id = $2::uuid 
        OR p.visibility IN ('ORG_WIDE', 'PUBLIC')
        OR EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = p.id AND pm.user_id = $2::uuid AND pm.deleted = false)
      )
  `;
  const accessArgs = [projectId, userId];
  if (organizationId) {
    accessQuery += ` AND p.organization_id = $3::uuid`;
    accessArgs.push(organizationId);
  } else {
    accessQuery += ` AND p.organization_id IS NULL`;
  }
  const result = await pool.query(accessQuery, accessArgs);
  return result.rowCount > 0;
}

async function listMyProjects(args) {
  if (!args.userId)
    return { error: "No userId provided in execution context." };
  const limit =
    typeof args.limit === "number" && args.limit > 0 ? args.limit : 10;
  try {
    let query = `
      SELECT 
        p.id, p.public_project_id, p.title, p.description, p.status, p.updated_at,
        (SELECT count(*) FROM notes n WHERE n.project_id = p.id AND n.deleted = false) as total_tasks,
        (SELECT count(*) FROM project_stages ps WHERE ps.project_id = p.id) as total_stages
       FROM projects p
       WHERE p.deleted = false 
         AND (
           p.user_id = $1::uuid 
           OR p.visibility IN ('ORG_WIDE', 'PUBLIC')
           OR EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = p.id AND pm.user_id = $1::uuid AND pm.deleted = false)
         )
    `;
    const queryArgs = [args.userId];
    if (args.organizationId) {
      query += ` AND p.organization_id = $2::uuid`;
      queryArgs.push(args.organizationId);
    } else {
      query += ` AND p.organization_id IS NULL`;
    }
    query += ` ORDER BY p.updated_at DESC LIMIT $${queryArgs.length + 1}`;
    queryArgs.push(limit);
    const { rows } = await pool.query(query, queryArgs);
    return { projects: rows };
  } catch (error) {
    return { error: "Database error fetching projects: " + error.message };
  }
}

async function getProjectDetails(args) {
  if (!args.userId || !args.projectId)
    return { error: "Missing context or projectId." };
  try {
    const hasAccess = await checkProjectAccess(
      args.projectId,
      args.userId,
      args.organizationId
    );
    if (!hasAccess)
      return {
        error: "Project not found or you don't have permission to view it.",
      };

    const { rows } = await pool.query(
      `SELECT
        p.id, p.public_project_id, p.title, p.description, p.status, p.properties, p.created_at, p.updated_at,
        (
          SELECT jsonb_agg(jsonb_build_object('id', ps.id, 'name', ps.name, 'position', ps.position))
          FROM project_stages ps WHERE ps.project_id = p.id
        ) as stages,
        (
          SELECT jsonb_agg(jsonb_build_object(
            'id', n.id, 'title', n.title, 'status', n.status, 
            'stage_id', n.project_stage_id, 'updated_at', n.updated_at
          ))
          FROM notes n WHERE n.project_id = p.id AND n.deleted = false
        ) as tasks,
        (
          SELECT jsonb_agg(jsonb_build_object('user_id', pm.user_id, 'name', u.name, 'role', pm.role))
          FROM project_members pm 
          INNER JOIN users u ON pm.user_id = u.user_id
          WHERE pm.project_id = p.id AND pm.deleted = false
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

async function createProject(args) {
  if (!args.userId)
    return { error: "No userId provided in execution context." };
  try {
    const { title, description, status, visibility, methodology } = args;
    const query = `
      INSERT INTO projects (title, description, status, visibility, methodology, user_id, organization_id)
      VALUES ($1, $2, $3, $4, $5, $6::uuid, $7::uuid)
      RETURNING id, public_project_id, title, status, visibility;
    `;
    const values = [
      title,
      description || null,
      status || "OPEN",
      visibility || "PRIVATE",
      methodology || "KANBAN",
      args.userId,
      args.organizationId || null,
    ];
    const { rows } = await pool.query(query, values);
    return { message: "Project created successfully.", project: rows[0] };
  } catch (error) {
    return { error: "Database error creating project: " + error.message };
  }
}

async function updateProject(args) {
  if (!args.userId || !args.projectId)
    return { error: "Missing context or projectId." };
  try {
    const hasAccess = await checkProjectAccess(
      args.projectId,
      args.userId,
      args.organizationId
    );
    if (!hasAccess) return { error: "Project not found or no permission." };

    const setClauses = [];
    const values = [];
    let paramCount = 1;

    if (args.title !== undefined) {
      setClauses.push(`title = $${paramCount++}`);
      values.push(args.title);
    }
    if (args.description !== undefined) {
      setClauses.push(`description = $${paramCount++}`);
      values.push(args.description);
    }
    if (args.status !== undefined) {
      setClauses.push(`status = $${paramCount++}`);
      values.push(args.status);
    }
    if (args.visibility !== undefined) {
      setClauses.push(`visibility = $${paramCount++}`);
      values.push(args.visibility);
    }
    if (args.methodology !== undefined) {
      setClauses.push(`methodology = $${paramCount++}`);
      values.push(args.methodology);
    }

    if (setClauses.length === 0) return { error: "No fields to update." };

    values.push(args.projectId);

    const updateQuery = `
      UPDATE projects 
      SET ${setClauses.join(", ")}
      WHERE id = $${paramCount}::uuid AND deleted = false
      RETURNING id, title, status;
    `;

    const { rows } = await pool.query(updateQuery, values);
    return { message: "Project updated successfully.", project: rows[0] };
  } catch (error) {
    return { error: "Database error updating project: " + error.message };
  }
}

async function getProjectStages(args) {
  if (!args.userId || !args.projectId)
    return { error: "Missing context or projectId." };
  try {
    const hasAccess = await checkProjectAccess(
      args.projectId,
      args.userId,
      args.organizationId
    );
    if (!hasAccess) return { error: "Project not found or no permission." };

    const { rows } = await pool.query(
      `SELECT id, name, position FROM project_stages WHERE project_id = $1::uuid ORDER BY position ASC`,
      [args.projectId]
    );
    return { stages: rows };
  } catch (error) {
    return { error: "Database error fetching stages: " + error.message };
  }
}

async function createProjectStage(args) {
  if (!args.userId || !args.projectId)
    return { error: "Missing context or projectId." };
  try {
    const hasAccess = await checkProjectAccess(
      args.projectId,
      args.userId,
      args.organizationId
    );
    if (!hasAccess) return { error: "Project not found or no permission." };

    const position = typeof args.position === "number" ? args.position : 0;

    const { rows } = await pool.query(
      `INSERT INTO project_stages (project_id, name, position) VALUES ($1::uuid, $2, $3) RETURNING id, name, position`,
      [args.projectId, args.name, position]
    );
    return { message: "Stage created.", stage: rows[0] };
  } catch (error) {
    return { error: "Database error creating stage: " + error.message };
  }
}

async function updateProjectStage(args) {
  if (!args.userId || !args.projectId || !args.stageId)
    return { error: "Missing required parameters." };
  try {
    const hasAccess = await checkProjectAccess(
      args.projectId,
      args.userId,
      args.organizationId
    );
    if (!hasAccess) return { error: "Project not found or no permission." };

    const setClauses = [];
    const values = [];
    let paramCount = 1;

    if (args.name !== undefined) {
      setClauses.push(`name = $${paramCount++}`);
      values.push(args.name);
    }
    if (args.position !== undefined) {
      setClauses.push(`position = $${paramCount++}`);
      values.push(args.position);
    }

    if (setClauses.length === 0) return { error: "No fields to update." };

    values.push(args.stageId, args.projectId);

    const updateQuery = `
      UPDATE project_stages 
      SET ${setClauses.join(", ")}
      WHERE id = $${paramCount}::uuid AND project_id = $${paramCount + 1}::uuid
      RETURNING id, name, position;
    `;

    const { rows } = await pool.query(updateQuery, values);
    return { message: "Stage updated.", stage: rows[0] };
  } catch (error) {
    return { error: "Database error updating stage: " + error.message };
  }
}

async function getProjectCollaborators(args) {
  if (!args.userId || !args.projectId)
    return { error: "Missing context or projectId." };
  try {
    const hasAccess = await checkProjectAccess(
      args.projectId,
      args.userId,
      args.organizationId
    );
    if (!hasAccess) return { error: "Project not found or no permission." };

    const { rows } = await pool.query(
      `SELECT pm.id, pm.user_id, u.name, u.email, pm.role 
       FROM project_members pm
       JOIN users u ON u.user_id = pm.user_id
       WHERE pm.project_id = $1::uuid AND pm.deleted = false`,
      [args.projectId]
    );
    return { collaborators: rows };
  } catch (error) {
    return { error: "Database error fetching collaborators: " + error.message };
  }
}

async function addProjectCollaborator(args) {
  if (!args.userId || !args.projectId || !args.userId)
    return { error: "Missing parameters." };
  try {
    const hasAccess = await checkProjectAccess(
      args.projectId,
      args.userId,
      args.organizationId
    );
    if (!hasAccess) return { error: "Project not found or no permission." };

    const { rows } = await pool.query(
      `INSERT INTO project_members (project_id, user_id, role) 
       VALUES ($1::uuid, $2::uuid, $3) 
       ON CONFLICT (project_id, user_id) 
       DO UPDATE SET role = EXCLUDED.role, deleted = false
       RETURNING id, role`,
      [args.projectId, args.userId, args.role]
    );
    return { collaborator: rows[0], message: "Collaborator added." };
  } catch (error) {
    return { error: "Database error adding collaborator: " + error.message };
  }
}

async function updateProjectCollaborator(args) {
  if (!args.userId || !args.projectId || !args.collaboratorUserId)
    return { error: "Missing parameters." };
  try {
    const hasAccess = await checkProjectAccess(
      args.projectId,
      args.userId,
      args.organizationId
    );
    if (!hasAccess) return { error: "Project not found or no permission." };

    const { rows } = await pool.query(
      `UPDATE project_members SET role = $1 
       WHERE project_id = $2::uuid AND user_id = $3::uuid AND deleted = false
       RETURNING id, role`,
      [args.role, args.projectId, args.collaboratorUserId]
    );
    return { collaborator: rows[0], message: "Collaborator updated." };
  } catch (error) {
    return { error: "Database error updating collaborator: " + error.message };
  }
}

async function removeProjectCollaborator(args) {
  if (!args.userId || !args.projectId || !args.collaboratorUserId)
    return { error: "Missing parameters." };
  try {
    const hasAccess = await checkProjectAccess(
      args.projectId,
      args.userId,
      args.organizationId
    );
    if (!hasAccess) return { error: "Project not found or no permission." };

    await pool.query(
      `UPDATE project_members SET deleted = true 
       WHERE project_id = $1::uuid AND user_id = $2::uuid`,
      [args.projectId, args.collaboratorUserId]
    );
    return { message: "Collaborator removed." };
  } catch (error) {
    return { error: "Database error removing collaborator: " + error.message };
  }
}

module.exports = {
  addProjectCollaborator,
  createProject,
  createProjectStage,
  getProjectCollaborators,
  getProjectDetails,
  getProjectStages,
  listMyProjects,
  removeProjectCollaborator,
  updateProject,
  updateProjectCollaborator,
  updateProjectStage,
};
