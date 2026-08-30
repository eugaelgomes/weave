const { randomUUID } = require("crypto");
const chatRepository = require("../../repositories/chat/chat-messages.repository");

const chatFormatterUtil = require("../../utils/chat-formatter.util");
const chatOrchestratorService = require("../../services/chat/chat-orchestrator.service");
const { getI18n, getLangFromReq } = require("../../utils/agent-house-i18n.util");
const BaseController = require("../base.controller");

class ChatEngineController extends BaseController {
  async chat(req, res) {
    const userLanguage = getLangFromReq(req);
    const t = getI18n(userLanguage);
    let userId = null;
    let payload = null;
    let requestId = null;
    let keepAliveInterval = null;
    let workspaceId = null;

    try {
      userId = this._validateAuthentication(req);
      // For chat, we also need chatParserUtil validations, but those are internal to chat
      // We'll keep the parser util for now if it does specific payload validation
      payload = req.body;
      workspaceId = this._extractWorkspaceId(req);
      requestId = payload.requestId || randomUUID();

      res.writeHead(200, {
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Content-Type": "text/event-stream",
      });
      res.flushHeaders();

      keepAliveInterval = setInterval(() => {
        res.write(":\n\n");
        if (typeof res.flush === "function") res.flush();
      }, 15000);

      const result = await chatOrchestratorService.orchestrateChat({
        files: req.files,
        onChunk: (chunk) => {
          res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
          if (typeof res.flush === "function") res.flush();
        },
        payload,
        requestId,
        userId,
        userLanguage,
        workspaceId,
      });

      res.write(`data: ${JSON.stringify({ success: true, ...result })}\n\n`);
      return res.end();
    } catch (error) {
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

      console.error("[agent-house/chat-engine] request failed", {
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
            requestId,
            role: "assistant",
            sessionId: payload.sessionId,
            status: "error",
            userId,
            workspaceId,
          })
          .catch((err) => {
            console.error("[agent-house/chat-engine] failed to save error message", err);
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
    } finally {
      if (keepAliveInterval) {
        clearInterval(keepAliveInterval);
      }
    }
  }
}

module.exports = new ChatEngineController();
