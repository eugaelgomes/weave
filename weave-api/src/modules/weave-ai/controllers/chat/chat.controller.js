/* eslint-disable no-console, sort-keys */
const { randomUUID } = require("crypto");
const chatRepository = require("@/modules/weave-ai/repositories/chat.repository");
const chatParserUtil = require("../../utils/chat-parser.util");
const chatFormatterUtil = require("../../utils/chat-formatter.util");
const chatOrchestratorService = require("../../services/chat-orchestrator.service");
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
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
    res.flushHeaders();

    const result = await chatOrchestratorService.orchestrateChat({
      userId,
      payload,
      organizationId,
      requestId,
      files: req.files,
      userLanguage,
      onChunk: (chunk) => {
        res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
        if (typeof res.flush === "function") res.flush();
      },
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
          `event: error\ndata: ${JSON.stringify({ success: false, error: { code: "PLAN_LIMIT_EXCEEDED", message: error.message } })}\n\n`
        );
        return res.end();
      }
      const { sendPlanLimitExceeded } = require("@/utils/plan-limit-http");
      return sendPlanLimitExceeded(res, {
        resource: "weave_ai",
        limit_key: "weave_ai.config.monthly_messages",
        message: error.message,
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
        ? { name: cause.name, message: cause.message, code: cause.code }
        : cause !== null && cause !== undefined && typeof cause === "object"
          ? { message: String(cause.message || cause) }
          : cause !== null && cause !== undefined
            ? { detail: String(cause) }
            : undefined;

    console.error("[weave-ai/chat] request failed", {
      cause: causeSummary,
      code: normalizedError.code,
      errorCode: error?.code,
      errorName: error?.name,
      constraint: error?.constraint || null,
      detail: error?.detail || null,
      table: error?.table || null,
      column: error?.column || null,
      originalMessage: error?.message || null,
      message: normalizedError.message,
      requestId:
        (typeof req.body?.requestId === "string" && req.body.requestId) ||
        error?.requestId ||
        requestId ||
        null,
      statusCode: normalizedError.statusCode,
    });

    if (userId && payload && payload.sessionId) {
      chatRepository
        .saveMessageIdempotent({
          sessionId: payload.sessionId,
          userId,
          organizationId,
          role: "assistant",
          content: null,
          model: `${payload.model?.name || "unknown"}:${payload.model?.version || "unknown"}`,
          requestId,
          status: "error",
          errorCode: normalizedError.code,
          errorMessage: normalizedError.message,
          agentId: payload.agentId,
        })
        .catch((err) => {
          console.error("[weave-ai/chat] failed to save error message", err);
        });
    }

    if (res.headersSent) {
      res.write(
        `event: error\ndata: ${JSON.stringify({ success: false, error: { code: normalizedError.code, message: normalizedError.message } })}\n\n`
      );
      return res.end();
    }

    return res.status(normalizedError.statusCode).json({
      success: false,
      error: {
        code: normalizedError.code,
        message: normalizedError.message,
      },
    });
  }
}

module.exports = { chat };