const { pool } = require("@/database/connection");

async function saveMessage(data) {
    const {
      sessionId,
      userId,
      organizationId = null,
      role,
      content,
      model,
      metadata = {},
      requestId = null,
      provider = null,
      status = "ok",
      errorCode = null,
      errorMessage = null,
      latencyMs = null,
      inputTokens = null,
      outputTokens = null,
      totalTokens = null,
      agentId = null,
      allowEdit = false,
      toolCalls = null,
      toolCallId = null,
    } = data;

    const query = `
    INSERT INTO ai_chat_messages (
      session_id,
      user_id,
      organization_id,
      role,
      content,
      model,
      metadata,
      request_id,
      provider,
      status,
      error_code,
      error_message,
      latency_ms,
      input_tokens,
      output_tokens,
      total_tokens,
      agent_id,
      allow_edit,
      tool_calls,
      tool_call_id,
      created_at
    )
    VALUES (
      $1, $2, $3, $4, $5, $6,
      $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, NOW()
    )
    RETURNING *
  `;

    const result = await pool.query(query, [
      sessionId,
      userId,
      organizationId,
      role,
      content,
      model,
      JSON.stringify(metadata),
      requestId,
      provider,
      status,
      errorCode,
      errorMessage,
      latencyMs,
      inputTokens,
      outputTokens,
      totalTokens,
      agentId,
      allowEdit,
      toolCalls ? JSON.stringify(toolCalls) : null,
      toolCallId,
    ]);

    // Update the session summary with recent statistics
    await pool.query(
      `
        UPDATE ai_chat_sessions
        SET
          updated_at = NOW(),
          last_message_at = NOW(),
          last_model = $2,
          last_provider = COALESCE($3, last_provider),
          message_count = COALESCE(message_count, 0) + 1,
          total_tokens = COALESCE(total_tokens, 0) + COALESCE($4, 0)
        WHERE id = $1 AND COALESCE(deleted, false) = false
      `,
      [sessionId, model, provider, totalTokens]
    );

    return result.rows[0];
  }

module.exports = { saveMessage };
