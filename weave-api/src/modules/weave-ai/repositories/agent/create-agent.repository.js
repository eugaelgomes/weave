const { pool } = require("@/database/connection");

async function createAgent(userId, data) {
    const query = `
      INSERT INTO ai_user_agent (
        user_id, name, description, project_id, is_active, personality,
        created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING *
    `;

    const result = await pool.query(query, [
      userId,
      data.name || "Unnamed Agent",
      data.description || null,
      data.projectId || null,
      data.isActive !== false,
      data.personality || {},
    ]);
    return result.rows[0];
  }

module.exports = { createAgent };
