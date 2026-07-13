const { pool } = require("../../services/database/postgres.client");

async function listTaskPriorities(args) {
  if (!args.userId)
    return { error: "No userId provided in execution context." };

  try {
    const query = `
      SELECT id, name, color_hex, sort_order
      FROM task_priorities
      WHERE deleted = false AND is_active = true AND project_id = $1::uuid
      ORDER BY sort_order ASC, name ASC
    `;
    const result = await pool.query(query, [args.projectId]);

    return {
      priorities: result.rows,
      success: true,
    };
  } catch (error) {
    console.error("Error in listTaskPriorities tool:", error);
    return { error: `Database error: ${error.message}` };
  }
}

async function createTaskPriority(args) {
  if (!args.userId)
    return { error: "No userId provided in execution context." };

  try {
    // Basic authorization check - check if user can manage this project
    const accessQuery = `
      SELECT 1 FROM projects 
      WHERE id = $1::uuid AND deleted = false AND (
        user_id = $2::uuid OR 
        EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = $1::uuid AND pm.user_id = $2::uuid AND pm.role IN ('OWNER', 'ADMIN'))
      )
    `;
    const accessRes = await pool.query(accessQuery, [
      args.projectId,
      args.userId,
    ]);

    if (accessRes.rowCount === 0) {
      return {
        error: "You do not have permission to add priorities to this project.",
      };
    }

    const query = `
      INSERT INTO task_priorities (organization_id, user_id, project_id, name, color_hex, sort_order)
      VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5, $6)
      RETURNING id, name, color_hex, sort_order
    `;
    const queryArgs = [
      args.organizationId || null,
      args.userId,
      args.projectId,
      args.name,
      args.colorHex || "#808080",
      args.sortOrder || 0,
    ];

    const result = await pool.query(query, queryArgs);

    return {
      message: "Priority created successfully.",
      priority: result.rows[0],
      success: true,
    };
  } catch (error) {
    console.error("Error in createTaskPriority tool:", error);
    return { error: `Database error: ${error.message}` };
  }
}

async function updateTaskPriority(args) {
  if (!args.userId)
    return { error: "No userId provided in execution context." };

  try {
    const accessQuery = `
      SELECT 1 FROM projects 
      WHERE id = $1::uuid AND deleted = false AND (
        user_id = $2::uuid OR 
        EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = $1::uuid AND pm.user_id = $2::uuid AND pm.role IN ('OWNER', 'ADMIN'))
      )
    `;
    const accessRes = await pool.query(accessQuery, [
      args.projectId,
      args.userId,
    ]);

    if (accessRes.rowCount === 0) {
      return {
        error: "You do not have permission to edit priorities in this project.",
      };
    }

    const updates = [];
    const queryArgs = [args.priorityId, args.projectId];
    let argIdx = 3;

    if (args.name !== undefined) {
      updates.push(`name = $${argIdx++}`);
      queryArgs.push(args.name);
    }
    if (args.colorHex !== undefined) {
      updates.push(`color_hex = $${argIdx++}`);
      queryArgs.push(args.colorHex);
    }
    if (args.sortOrder !== undefined) {
      updates.push(`sort_order = $${argIdx++}`);
      queryArgs.push(args.sortOrder);
    }

    if (updates.length === 0) {
      return { message: "Nenhuma alteração enviada.", success: true };
    }

    const query = `
      UPDATE task_priorities
      SET ${updates.join(", ")}
      WHERE id = $1::uuid AND project_id = $2::uuid AND deleted = false
      RETURNING id, name, color_hex, sort_order
    `;

    const result = await pool.query(query, queryArgs);

    if (result.rowCount === 0) {
      return { error: "Priority not found or already deleted." };
    }

    return {
      message: "Priority updated successfully.",
      priority: result.rows[0],
      success: true,
    };
  } catch (error) {
    console.error("Error in updateTaskPriority tool:", error);
    return { error: `Database error: ${error.message}` };
  }
}

async function deleteTaskPriority(args) {
  if (!args.userId)
    return { error: "No userId provided in execution context." };

  try {
    const accessQuery = `
      SELECT 1 FROM projects 
      WHERE id = $1::uuid AND deleted = false AND (
        user_id = $2::uuid OR 
        EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = $1::uuid AND pm.user_id = $2::uuid AND pm.role IN ('OWNER', 'ADMIN'))
      )
    `;
    const accessRes = await pool.query(accessQuery, [
      args.projectId,
      args.userId,
    ]);

    if (accessRes.rowCount === 0) {
      return {
        error:
          "You do not have permission to delete priorities in this project.",
      };
    }

    const query = `
      UPDATE task_priorities
      SET deleted = true
      WHERE id = $1::uuid AND project_id = $2::uuid AND deleted = false
      RETURNING id
    `;

    const result = await pool.query(query, [args.priorityId, args.projectId]);

    if (result.rowCount === 0) {
      return { error: "Priority not found or already deleted." };
    }

    return {
      message: "Priority deleted successfully.",
      success: true,
    };
  } catch (error) {
    console.error("Error in deleteTaskPriority tool:", error);
    return { error: `Database error: ${error.message}` };
  }
}

module.exports = {
  createTaskPriority,
  deleteTaskPriority,
  listTaskPriorities,
  updateTaskPriority,
};
