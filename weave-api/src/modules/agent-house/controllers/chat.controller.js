const { randomUUID } = require("crypto");
const chatRepository = require("@/modules/agent-house/repositories/chat.repository");
const chatParserUtil = require("../utils/chat-parser.util");
const chatFormatterUtil = require("../utils/chat-formatter.util");
const chatOrchestratorService = require("../utils/chat-orchestrator.util");
const { getI18n, getLangFromReq } = require("../utils/agent-house-i18n.util");
const { getProvidersWithModels } = require("@/modules/agent-house/services/llm-catalog.service");

async function chat(req, res) {
  const userLanguage = getLangFromReq(req);
  const t = getI18n(userLanguage);
  let userId = null;
  let payload = null;
  let requestId = null;
  let keepAliveInterval = null;
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
      organizationId,
      payload,
      requestId,
      userId,
      userLanguage,
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

    console.error("[agent-house/chat] request failed", {
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
          console.error("[agent-house/chat] failed to save error message", err);
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

async function deleteChatSession(req, res) {
  const userLanguage = getLangFromReq(req);
  const t = getI18n(userLanguage);
  try {
    const userId = chatParserUtil.validateAuthentication(req);
    const sessionId = req.params.sessionId;

    if (!sessionId) {
      return res.status(400).json({
        error: {
          code: "SESSION_ID_REQUIRED",
          message: "A session ID is required to delete.",
        },
        success: false,
      });
    }

    const sessions = await chatRepository.getUserSessions(userId, 200);
    const hasSessionAccess = sessions.some(
      (session) => String(session.id) === String(sessionId)
    );

    if (!hasSessionAccess) {
      return res.status(404).json({
        error: { code: "CHAT_SESSION_NOT_FOUND", message: t.sessionNotFound },
        success: false,
      });
    }

    await chatRepository.deleteSession(sessionId, userId);

    return res.json({ deleted: true, sessionId, success: true });
  } catch (error) {
    const normalizedError = chatFormatterUtil.normalizeApiError(error, {
      code: "SESSION_DELETE_FAILED",
      message: t.sessionDeleteFailed,
      statusCode: 500,
    });
    console.error("[agent-house/chat] session delete failed", {
      error: normalizedError,
    });
    return res.status(normalizedError.statusCode).json({
      error: { code: normalizedError.code, message: normalizedError.message },
      success: false,
    });
  }
}

async function forkSharedChat(req, res) {
  try {
    const userId = chatParserUtil.validateAuthentication(req);
    const token = req.params.token;

    if (!token) {
      return res.status(400).json({ error: "Token required", success: false });
    }

    const newSession = await chatRepository.forkSession(token, userId);

    return res.json({ newSessionId: newSession.id, success: true });
  } catch (error) {
    console.error("[agent-house/chat] fork session failed", error);
    if (error.message.includes("not found")) {
      return res
        .status(404)
        .json({ error: "Shared session not found", success: false });
    }
    return res
      .status(500)
      .json({ error: "Internal server error", success: false });
  }
}

async function getAvailableModels(req, res) {
  const userLanguage = getLangFromReq(req);
  const t = getI18n(userLanguage);
  try {
    const isAgentCall = req.query.agent === "true";
    const includeDeprecations = req.query.include_deprecations === "true";
    const allProviders = await getProvidersWithModels();

    let availableModels = allProviders.map((provider) => ({
      id: provider.id,
      isDefault: provider.isDefault,
      logoUrl: provider.logoUrl,
      models: provider.models
        .filter((model) => {
          if (isAgentCall) return model.supportedForAgents !== false;
          return true;
        })
        .map((model) => ({
          contextWindow: model.contextWindow,
          deprecated: model.deprecated,
          description: model.description,
          features: model.features,
          id: model.id,
          maxOutputTokens: model.maxOutputTokens,
          name: model.name,
          tags: model.tags,
          version: model.version,
        })),
      name: provider.name,
    }));

    if (!includeDeprecations) {
      availableModels = availableModels.map((provider) => ({
        ...provider,
        models: provider.models.filter((model) => !model.deprecated),
      }));
    }

    return res.json({ providers: availableModels, success: true });
  } catch (error) {
    const normalizedError = chatFormatterUtil.normalizeApiError(error, {
      code: "MODELS_FETCH_FAILED",
      message: t.modelsFetchFailed,
      statusCode: 500,
    });
    console.error("[agent-house/chat] models fetch failed", {
      error: normalizedError,
    });
    return res.status(normalizedError.statusCode).json({
      error: { code: normalizedError.code, message: normalizedError.message },
      success: false,
    });
  }
}

async function getChatHistory(req, res) {
  const userLanguage = getLangFromReq(req);
  const t = getI18n(userLanguage);
  try {
    const userId = chatParserUtil.validateAuthentication(req);
    const { sessionId, limit, offset } = req.query;

    if (sessionId) {
      const messages = await chatRepository.getSessionMessages(
        sessionId,
        userId
      );
      return res.json({ messages, success: true });
    }

    const sessions = await chatRepository.getUserSessions(
      userId,
      limit,
      offset
    );
    return res.json({ sessions, success: true });
  } catch (error) {
    const normalizedError = chatFormatterUtil.normalizeApiError(error, {
      code: "HISTORY_FETCH_FAILED",
      message: t.historyFetchFailed,
      statusCode: 500,
    });
    console.error("[agent-house/chat] history fetch failed", {
      error: normalizedError,
    });
    return res.status(normalizedError.statusCode).json({
      error: { code: normalizedError.code, message: normalizedError.message },
      success: false,
    });
  }
}

async function getSharedChatPreview(req, res) {
  try {
    const token = req.params.token;
    if (!token) {
      return res.status(400).json({ error: "Token required", success: false });
    }

    const session = await chatRepository.getSharedSessionByToken(token);
    if (!session) {
      return res.status(404).json({
        error: "Shared session not found or link expired",
        success: false,
      });
    }

    return res.json({ session, success: true });
  } catch (error) {
    console.error("[agent-house/chat] get shared session failed", error);
    return res
      .status(500)
      .json({ error: "Internal server error", success: false });
  }
}

async function shareChatSession(req, res) {
  try {
    const userId = chatParserUtil.validateAuthentication(req);
    const sessionId = req.params.sessionId;

    if (!sessionId) {
      return res
        .status(400)
        .json({ error: "Session ID required", success: false });
    }

    const shareToken = await chatRepository.generateShareToken(
      sessionId,
      userId
    );
    if (!shareToken) {
      return res
        .status(404)
        .json({ error: "Session not found", success: false });
    }

    return res.json({ shareToken, success: true });
  } catch (error) {
    console.error("[agent-house/chat] share session failed", error);
    return res
      .status(500)
      .json({ error: "Internal server error", success: false });
  }
}

async function submitFeedback(req, res) {
  try {
    const userId = chatParserUtil.validateAuthentication(req);
    const messageId = req.params.messageId;
    const { rating, comment } = req.body;

    if (!messageId) {
      return res.status(400).json({
        error: {
          code: "MESSAGE_ID_REQUIRED",
          message: "A message ID is required to submit feedback.",
        },
        success: false,
      });
    }

    const updated = await chatRepository.updateMessageFeedback(
      messageId,
      userId,
      rating,
      comment || null
    );

    if (!updated) {
      return res.status(404).json({
        error: {
          code: "CHAT_MESSAGE_NOT_FOUND",
          message: "Message not found or you don't have access to it.",
        },
        success: false,
      });
    }

    return res.json({ messageId, rating, success: true });
  } catch (error) {
    const normalizedError = chatFormatterUtil.normalizeApiError(error, {
      code: "FEEDBACK_SUBMIT_FAILED",
      message: "Failed to submit feedback.",
      statusCode: 500,
    });
    console.error("[agent-house/chat] feedback submit failed", {
      error: normalizedError,
    });
    return res.status(normalizedError.statusCode).json({
      error: { code: normalizedError.code, message: normalizedError.message },
      success: false,
    });
  }
}

module.exports = {
  chat,
  deleteChatSession,
  forkSharedChat,
  getAvailableModels,
  getChatHistory,
  getSharedChatPreview,
  shareChatSession,
  submitFeedback,
};
