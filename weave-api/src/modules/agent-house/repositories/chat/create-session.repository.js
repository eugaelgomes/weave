const { pool } = require("@/database/connection");

async function createSession(userId) {
    const query = `
    INSERT INTO ai_chat_sessions (user_id, title, created_at, updated_at)
    VALUES ($1, $2, NOW(), NOW())
    RETURNING *
  `;

    const result = await pool.query(query, [userId, "Nova Conversa"]);
    return result.rows[0];
  }

module.exports = { createSession };
