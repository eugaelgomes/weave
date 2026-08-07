const { pool } = require("@/database/connection");

async function getSessionMessagesForContext(sessionId, userId, limit = 20) {
    const query = `
    SELECT role, content, model, created_at, tool_calls, tool_call_id
    FROM (
      SELECT role, content, model, created_at, tool_calls, tool_call_id
      FROM ai_chat_messages
      WHERE session_id = $1
        AND user_id = $2
        AND (COALESCE(content, '') <> '' OR tool_calls IS NOT NULL)
        AND role IN ('user', 'assistant', 'tool')
        AND EXISTS (
          SELECT 1
          FROM ai_chat_sessions s
          WHERE s.id = ai_chat_messages.session_id
            AND s.user_id = $2
            AND COALESCE(s.deleted, false) = false
        )
      ORDER BY created_at DESC
      LIMIT $3
    ) recent_messages
    ORDER BY created_at ASC
  `;

    const normalizedLimit =
      Number.isFinite(Number(limit)) && Number(limit) > 0 ? Number(limit) : 20;
    const result = await pool.query(query, [
      sessionId,
      userId,
      normalizedLimit,
    ]);
    return result.rows;
  }

module.exports = { getSessionMessagesForContext };
