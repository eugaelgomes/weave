const { pool } = require("../../services/database/postgres.client");
const { logger } = require("../../services/logger");

async function getActiveSprint(args) {
  const { projectId } = args;
  try {
    const query = `
      SELECT *
      FROM project_sprints
      WHERE project_id = $1
        AND status = 'active'
        AND deleted = false
      ORDER BY sprint_number DESC
      LIMIT 1
    `;
    const result = await pool.query(query, [projectId]);
    if (result.rows.length === 0) {
      return {
        message: "No active sprint found for this project.",
        sprint: null,
        success: true,
      };
    }
    return { sprint: result.rows[0], success: true };
  } catch (error) {
    logger.error("Failed to get active sprint", { error: error.message });
    return { error: "Database error while fetching active sprint." };
  }
}

async function getProjectSprints(args) {
  const { projectId, limit = 20 } = args;
  try {
    const query = `
      SELECT *
      FROM project_sprints
      WHERE project_id = $1
        AND deleted = false
      ORDER BY sprint_number DESC
      LIMIT $2
    `;
    const result = await pool.query(query, [projectId, limit]);
    return { sprints: result.rows, success: true };
  } catch (error) {
    logger.error("Failed to get project sprints", { error: error.message });
    return { error: "Database error while fetching project sprints." };
  }
}

async function createSprint(args) {
  const {
    projectId,
    title,
    goal,
    startDate,
    endDate,
    workableDays = [1, 2, 3, 4, 5],
  } = args;
  try {
    // Get next sprint number
    const numQuery = `
      SELECT COALESCE(MAX(sprint_number), 0) + 1 AS next_number
      FROM project_sprints
      WHERE project_id = $1 AND deleted = false
    `;
    const numResult = await pool.query(numQuery, [projectId]);
    const sprintNumber = numResult.rows[0].next_number;

    const query = `
      INSERT INTO project_sprints (
        project_id, sprint_number, title, goal, status,
        start_date, end_date, workable_days
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    const result = await pool.query(query, [
      projectId,
      sprintNumber,
      title,
      goal || null,
      "planned", // default status
      startDate,
      endDate,
      workableDays,
    ]);
    return {
      message: "Sprint created successfully.",
      sprint: result.rows[0],
      success: true,
    };
  } catch (error) {
    logger.error("Failed to create sprint", { error: error.message });
    return { error: `Database error while creating sprint: ${error.message}` };
  }
}

async function completeSprint(args) {
  const { sprintId, summary } = args;
  try {
    const query = `
      UPDATE project_sprints
      SET status = 'completed',
          completed_at = NOW(),
          summary = COALESCE($2, summary),
          updated_at = NOW()
      WHERE id = $1 AND deleted = false
      RETURNING *
    `;
    const result = await pool.query(query, [sprintId, summary || null]);
    if (result.rows.length === 0) {
      return { error: "Sprint not found or already deleted." };
    }
    return {
      message: "Sprint completed successfully.",
      sprint: result.rows[0],
      success: true,
    };
  } catch (error) {
    logger.error("Failed to complete sprint", { error: error.message });
    return { error: "Database error while completing sprint." };
  }
}

module.exports = {
  complete_sprint: completeSprint,
  create_sprint: createSprint,
  get_active_sprint: getActiveSprint,
  get_project_sprints: getProjectSprints,
};
