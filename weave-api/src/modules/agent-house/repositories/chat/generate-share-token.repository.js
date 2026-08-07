const { pool } = require("@/database/connection");

async function generateShareToken(sessionId, userId) {
    const { randomBytes } = require("crypto");
    const token = randomBytes(16).toString("hex");

    const query = `
      UPDATE ai_chat_sessions
      SET share_token = $1, updated_at = NOW()
      WHERE id = $2
        AND user_id = $3
        AND COALESCE(deleted, false) = false
      RETURNING share_token
    `;

    const result = await pool.query(query, [token, sessionId, userId]);
    return result.rows[0]?.share_token || null;
  }

module.exports = { generateShareToken };
