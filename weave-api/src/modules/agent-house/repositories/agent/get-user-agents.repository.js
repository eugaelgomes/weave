const { pool } = require("@/database/connection");

async function getUserAgents(userId, filters = {}) {
    const conditions = [
      "a.user_id = $1",
      "(a.deleted = false OR a.deleted IS NULL)",
    ];
    const values = [userId];
    let paramIndex = 2;

    if (filters.projectId) {
      conditions.push(`a.project_id = $${paramIndex}`);
      values.push(filters.projectId);
      paramIndex++;
    }

    if (filters.isActive !== undefined) {
      conditions.push(`a.is_active = $${paramIndex}`);
      values.push(filters.isActive);
      paramIndex++;
    }

    if (filters.search) {
      conditions.push(
        `(a.name ILIKE $${paramIndex} OR a.description ILIKE $${paramIndex})`
      );
      values.push(`%${filters.search}%`);
      paramIndex++;
    }

    const query = `
      SELECT
        a.id, a.user_id, a.name, a.description, a.project_id, a.is_active,
        a.personality, a.knowledge_files, a.shared_with,
        a.created_at, a.updated_at,
        p.title AS project_title
      FROM ai_user_agent a
      LEFT JOIN projects p ON p.id = a.project_id AND p.deleted = false
      WHERE ${conditions.join(" AND ")}
      ORDER BY a.updated_at DESC
    `;

    const result = await pool.query(query, values);
    return result.rows;
  }

module.exports = { getUserAgents };
