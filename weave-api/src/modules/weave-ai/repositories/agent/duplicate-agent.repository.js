const { pool } = require("@/database/connection");

async function duplicateAgent(agentId, userId) {
    const query = `
      INSERT INTO ai_user_agent (
        user_id, name, description, project_id, is_active,
        personality, knowledge_files, shared_with,
        created_at, updated_at
      )
      SELECT
        user_id,
        name || ' (Copy)',
        description,
        project_id,
        is_active,
        personality,
        knowledge_files,
        '[]'::jsonb,
        NOW(),
        NOW()
      FROM ai_user_agent
      WHERE id = $1 AND user_id = $2 AND (deleted = false OR deleted IS NULL)
      RETURNING *
    `;

    const result = await pool.query(query, [agentId, userId]);
    return result.rows[0];
  }

module.exports = { duplicateAgent };
