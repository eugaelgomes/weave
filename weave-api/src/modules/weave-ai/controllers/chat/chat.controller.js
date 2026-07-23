const { randomUUID } = require("crypto");
const chatRepository = require("@/modules/weave-ai/repositories/chat.repository");
const chatParserUtil = require("../../utils/chat-parser.util");
const chatFormatterUtil = require("../../utils/chat-formatter.util");
const chatOrchestratorService = require("../../utils/chat-orchestrator.util");
const { getI18n, getLangFromReq } = require("../../utils/weave-ai-i18n.util");

async function chat(req, res) {
  const userLanguage = getLangFromReq(req);
  const t = getI18n(userLanguage);
  let userId = null;
  let payload = null;
  let requestId = null;
  const keepAliveInterval = null;
  let organizationId = null;

  try {
    userId = chatParserUtil.validateAuthentication(req);
    payload = req.body;
    organizationId = req.user?.organizationId || req.user?.org_id || null;
    requestId = payload.requestId || randomUUID();

    res.writeHead(200, {
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream",
    });
    res.flushHeaders();

    const result = await chatOrchestratorService.orchestrateChat({
      files: req.files,
      onChunk: (chunk) => {
        res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
        if (typeof res.flush === "function") res.flush();
      },
      organizationId,
      payload,
      requestId,
      userId,
      userLanguage,
    });

    res.write(`data: ${JSON.stringify({ success: true, ...result })}\n\n`);
    return res.end();
  } catch (error) {
    if (keepAliveInterval) {
      clearInterval(keepAliveInterval);
    }
    if (error.code === "PLAN_LIMIT_EXCEEDED") {
      if (res.headersSent) {
        res.write(
          `event: error\ndata: ${JSON.stringify({ error: { code: "PLAN_LIMIT_EXCEEDED", message: error.message }, success: false })}\n\n`
        );
        return res.end();
      }
      const { sendPlanLimitExceeded } = require("@/modules/plans/utils/plan-limit-http.util");
      return sendPlanLimitExceeded(res, {
        limit_key: "weave_ai.config.monthly_messages",
        message: error.message,
        resource: "weave_ai",
      });
    }

    const normalizedError = chatFormatterUtil.normalizeApiError(error, {
      code: "CHAT_PROCESSING_FAILED",
      message: t.processChatFailed,
      statusCode: 500,
    });
    const cause = error?.cause;
    const causeSummary =
      cause instanceof Error
        ? { code: cause.code, message: cause.message, name: cause.name }
        : cause !== null && cause !== undefined && typeof cause === "object"
          ? { message: String(cause.message || cause) }
          : cause !== null && cause !== undefined
            ? { detail: String(cause) }
            : undefined;

    console.error("[weave-ai/chat] request failed", {
      cause: causeSummary,
      code: normalizedError.code,
      column: error?.column || null,
      constraint: error?.constraint || null,
      detail: error?.detail || null,
      errorCode: error?.code,
      errorName: error?.name,
      message: normalizedError.message,
      originalMessage: error?.message || null,
      requestId:
        (typeof req.body?.requestId === "string" && req.body.requestId) ||
        error?.requestId ||
        requestId ||
        null,
      statusCode: normalizedError.statusCode,
      table: error?.table || null,
    });

    if (userId && payload && payload.sessionId) {
      chatRepository
        .saveMessageIdempotent({
          agentId: payload.agentId,
          content: null,
          errorCode: normalizedError.code,
          errorMessage: normalizedError.message,
          model: `${payload.model?.name || "unknown"}:${payload.model?.version || "unknown"}`,
          organizationId,
          requestId,
          role: "assistant",
          sessionId: payload.sessionId,
          status: "error",
          userId,
        })
        .catch((err) => {
          console.error("[weave-ai/chat] failed to save error message", err);
        });
    }

    if (res.headersSent) {
      res.write(
        `event: error\ndata: ${JSON.stringify({ error: { code: normalizedError.code, message: normalizedError.message }, success: false })}\n\n`
      );
      return res.end();
    }

    return res.status(normalizedError.statusCode).json({
      error: {
        code: normalizedError.code,
        message: normalizedError.message,
      },
      success: false,
    });
  }
}

module.exports = { chat };
