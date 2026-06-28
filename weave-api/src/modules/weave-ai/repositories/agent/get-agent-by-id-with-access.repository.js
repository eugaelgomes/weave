const { pool } = require("@/database/connection");

async function getAgentByIdWithAccess(agentId, userId) {
    const query = `
      SELECT
        a.id, a.user_id, a.name, a.description, a.project_id, a.is_active,
        a.personality, a.knowledge_files, a.shared_with,
        a.created_at, a.updated_at,
        p.title AS project_title
      FROM ai_user_agent a
      LEFT JOIN projects p ON p.id = a.project_id AND p.deleted = false
      WHERE a.id = $1
        AND (a.deleted = false OR a.deleted IS NULL)
        AND (
          a.user_id = $2
          OR EXISTS (
            SELECT 1
            FROM jsonb_array_elements(COALESCE(a.shared_with, '[]'::jsonb)) AS shared_entry
            WHERE shared_entry->>'userId' = $2::text
          )
        )
      LIMIT 1
    `;

    const result = await pool.query(query, [agentId, userId]);
    return result.rows[0];
  }

module.exports = { getAgentByIdWithAccess };
