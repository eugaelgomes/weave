const { pool } = require("@/database/connection");

async function getAgentsByProject(projectId, userId) {
    const query = `
      SELECT
        a.id, a.user_id, a.name, a.description, a.project_id, a.is_active,
        a.personality, a.knowledge_files, a.shared_with,
        a.created_at, a.updated_at
      FROM ai_user_agent a
      WHERE a.project_id = $1
        AND a.user_id = $2
        AND (a.deleted = false OR a.deleted IS NULL)
      ORDER BY a.updated_at DESC
    `;

    const result = await pool.query(query, [projectId, userId]);
    return result.rows;
  }

module.exports = { getAgentsByProject };
