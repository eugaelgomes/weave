const { pool } = require("@/services/db");

/**
 * Cria uma nova sessão de chat
 */
async function createSession(userId) {
  const query = `
    INSERT INTO ai_chat_sessions (user_id, title, created_at, updated_at)
    VALUES ($1, $2, NOW(), NOW())
    RETURNING *
  `;

  const result = await pool.query(query, [userId, "Nova Conversa"]);
  return result.rows[0];
}

/**
 * Atualiza título da sessão
 */
async function updateSessionTitle(sessionId, title) {
  const query = `
    UPDATE ai_chat_sessions
    SET title = $1, updated_at = NOW()
    WHERE id = $2
    RETURNING *
  `;

  const result = await pool.query(query, [title, sessionId]);
  return result.rows[0];
}

/**
 * Salva uma mensagem
 */
async function saveMessage(data) {
  const { sessionId, userId, role, content, model, metadata = {} } = data;

  const query = `
    INSERT INTO ai_chat_messages (
      session_id, user_id, role, content, model, metadata, created_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, NOW())
    RETURNING *
  `;

  const result = await pool.query(query, [
    sessionId,
    userId,
    role,
    content,
    model,
    JSON.stringify(metadata),
  ]);

  // Atualiza timestamp da sessão
  await pool.query(
    "UPDATE ai_chat_sessions SET updated_at = NOW() WHERE id = $1",
    [sessionId]
  );

  return result.rows[0];
}

/**
 * Busca mensagens de uma sessão
 */
async function getSessionMessages(sessionId, userId) {
  const query = `
    SELECT * FROM ai_chat_messages
    WHERE session_id = $1 AND user_id = $2
    ORDER BY created_at ASC
  `;

  const result = await pool.query(query, [sessionId, userId]);
  return result.rows;
}

/**
 * Busca todas as sessões de um usuário
 */
async function getUserSessions(userId, limit = 50) {
  const query = `
    SELECT 
      s.id,
      s.title,
      s.created_at,
      s.updated_at,
      COUNT(m.id) as message_count
    FROM ai_chat_sessions s
    LEFT JOIN ai_chat_messages m ON m.session_id = s.id
    WHERE s.user_id = $1
    GROUP BY s.id, s.title, s.created_at, s.updated_at
    ORDER BY s.updated_at DESC
    LIMIT $2
  `;

  const result = await pool.query(query, [userId, limit]);
  return result.rows;
}

/**
 * Conta mensagens de uma sessão
 */
async function getSessionMessageCount(sessionId) {
  const query = `
    SELECT COUNT(*) as count
    FROM ai_chat_messages
    WHERE session_id = $1
  `;

  const result = await pool.query(query, [sessionId]);
  return parseInt(result.rows[0].count);
}

/**
 * Deleta uma sessão e suas mensagens
 */
async function deleteSession(sessionId, userId) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Deleta mensagens
    await client.query(
      "DELETE FROM ai_chat_messages WHERE session_id = $1 AND user_id = $2",
      [sessionId, userId]
    );

    // Deleta sessão
    await client.query(
      "DELETE FROM ai_chat_sessions WHERE id = $1 AND user_id = $2",
      [sessionId, userId]
    );

    await client.query("COMMIT");
    return true;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  createSession,
  updateSessionTitle,
  saveMessage,
  getSessionMessages,
  getUserSessions,
  getSessionMessageCount,
  deleteSession,
};
