/* eslint-disable no-console, sort-keys */
const { randomUUID } = require("crypto");
const chatRepository = require("@/modules/weave-ai/repositories/chat.repository");
const { getProvidersWithModels } = require("@/modules/weave-ai/llm-catalog");

const chatParserUtil = require("../utils/chat-parser.util");
const chatFormatterUtil = require("../utils/chat-formatter.util");
const chatOrchestratorService = require("../services/chat-orchestrator.service");
const { getI18n, getLangFromReq } = require("../utils/weave-ai-i18n.util");

class ChatController {
  async chat(req, res) {
    const userLanguage = getLangFromReq(req);
    const t = getI18n(userLanguage);
    let userId = null;
    let payload = null;
    let requestId = null;

    try {
      userId = chatParserUtil.validateAuthentication(req);
      payload = chatParserUtil.parseChatPayload(req);
      const organizationId = req.user?.organizationId || null;
      requestId = payload.requestId || randomUUID();

      const result = await chatOrchestratorService.orchestrateChat({
        userId,
        payload,
        organizationId,
        requestId,
        files: req.files,
        userLanguage,
      });

      return res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      if (error.code === "PLAN_LIMIT_EXCEEDED") {
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
      return res.status(normalizedError.statusCode).json({
        success: false,
        error: {
          code: normalizedError.code,
          message: normalizedError.message,
        },
      });
    }
  }

  async getChatHistory(req, res) {
    const userLanguage = getLangFromReq(req);
    const t = getI18n(userLanguage);
    try {
      const userId = chatParserUtil.validateAuthentication(req);
      const limit = Math.min(Number.parseInt(req.query.limit || "50", 10), 100);

      const sessions = await chatRepository.getUserSessions(userId, limit);
      return res.json({
        success: true,
        sessions,
      });
    } catch (error) {
      const normalizedError = chatFormatterUtil.normalizeApiError(error, {
        code: "HISTORY_FETCH_FAILED",
        message: t.historyFetchFailed,
        statusCode: 500,
      });

      console.error("[weave-ai/chat] history fetch failed", {
        error: normalizedError,
      });

      return res.status(normalizedError.statusCode).json({
        success: false,
        error: {
          code: normalizedError.code,
          message: normalizedError.message,
        },
      });
    }
  }

  async deleteChatSession(req, res) {
    const userLanguage = getLangFromReq(req);
    const t = getI18n(userLanguage);
    try {
      const userId = chatParserUtil.validateAuthentication(req);
      const sessionId = req.params.sessionId;

      if (!sessionId) {
        return res.status(400).json({
          success: false,
          error: {
            code: "SESSION_ID_REQUIRED",
            message: "A session ID is required to delete.",
          },
        });
      }

      const sessions = await chatRepository.getUserSessions(userId, 200);
      const hasSessionAccess = sessions.some(
        (session) => String(session.id) === String(sessionId)
      );

      if (!hasSessionAccess) {
        return res.status(404).json({
          success: false,
          error: {
            code: "CHAT_SESSION_NOT_FOUND",
            message: t.sessionNotFound,
          },
        });
      }

      await chatRepository.deleteSession(sessionId, userId);

      return res.json({
        success: true,
        deleted: true,
        sessionId,
      });
    } catch (error) {
      const normalizedError = chatFormatterUtil.normalizeApiError(error, {
        code: "SESSION_DELETE_FAILED",
        message: t.sessionDeleteFailed,
        statusCode: 500,
      });

      console.error("[weave-ai/chat] session delete failed", {
        error: normalizedError,
      });

      return res.status(normalizedError.statusCode).json({
        success: false,
        error: {
          code: normalizedError.code,
          message: normalizedError.message,
        },
      });
    }
  }

  async getAvailableModels(req, res) {
    const userLanguage = getLangFromReq(req);
    const t = getI18n(userLanguage);
    try {
      const isAgentCall = req.query.agent === "true";
      const includeDeprecations = req.query.include_deprecations === "true";
      const allProviders = getProvidersWithModels();

      let availableModels = allProviders.map((provider) => ({
        id: provider.id,
        name: provider.name,
        logoUrl: provider.logoUrl,
        isDefault: provider.isDefault,
        models: provider.models
          .filter((model) => {
            if (isAgentCall) return model.supportedForAgents !== false;
            return true;
          })
          .map((model) => ({
            id: model.id,
            name: model.name,
            version: model.version,
            description: model.description,
            contextWindow: model.contextWindow,
            maxOutputTokens: model.maxOutputTokens,
            features: model.features,
            tags: model.tags,
            deprecated: model.deprecated,
          })),
      }));

      if (!includeDeprecations) {
        availableModels = availableModels.map((provider) => ({
          ...provider,
          models: provider.models.filter((model) => !model.deprecated),
        }));
      }

      return res.json({
        success: true,
        providers: availableModels,
      });
    } catch (error) {
      const normalizedError = chatFormatterUtil.normalizeApiError(error, {
        code: "MODELS_FETCH_FAILED",
        message: t.modelsFetchFailed,
        statusCode: 500,
      });

      console.error("[weave-ai/chat] models fetch failed", {
        error: normalizedError,
      });

      return res.status(normalizedError.statusCode).json({
        success: false,
        error: {
          code: normalizedError.code,
          message: normalizedError.message,
        },
      });
    }
  }
}

module.exports = new ChatController();
