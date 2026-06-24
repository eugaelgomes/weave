/**
 * @module weave-ai/controllers/chat.controller
 * @description HTTP Controller handling API routes for Weave AI chat features.
 * Connects Express HTTP requests to the underlying AI orchestrator and handles error formatting/streaming.
 *
 * Dependencies:
 * - `../services/chat-orchestrator.service.js`: For orchestrating the generation request.
 * - `../utils/chat-parser.util`: For request body sanitation.
 * - `../utils/chat-formatter.util`: For response/error formatting.
 */
/* eslint-disable no-console, sort-keys */
const { randomUUID } = require("crypto");
const chatRepository = require("@/modules/weave-ai/repositories/chat.repository");
const { getProvidersWithModels } = require("@/modules/weave-ai/llm-catalog");

const chatParserUtil = require("../utils/chat-parser.util");
const chatFormatterUtil = require("../utils/chat-formatter.util");
const chatOrchestratorService = require("../services/chat-orchestrator.service");
const { getI18n, getLangFromReq } = require("../utils/weave-ai-i18n.util");

class ChatController {
  /**
   * Handles POST /chat. Initiates the AI chat orchestration and returns a Server-Sent Events (SSE) stream.
   *
   * @param {import("express").Request} req - The Express request object.
   * @param {import("express").Response} res - The Express response object.
   * @returns {Promise<void>}
   */
  async chat(req, res) {
    const userLanguage = getLangFromReq(req);
    const t = getI18n(userLanguage);
    let userId = null;
    let payload = null;
    let requestId = null;
    const keepAliveInterval = null;
    let organizationId = null;

    try {
      userId = chatParserUtil.validateAuthentication(req);
      payload = chatParserUtil.parseChatPayload(req);
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

      // Normalize internal application errors to clean HTTP API errors
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

  /**
   * Handles GET /chat/history. Returns the chat history for a session or paginated list of sessions.
   *
   * @param {import("express").Request} req - The Express request object.
   * @param {import("express").Response} res - The Express response object.
   * @returns {Promise<Object>} JSON response containing history or sessions.
   */
  async getChatHistory(req, res) {
    const userLanguage = getLangFromReq(req);
    const t = getI18n(userLanguage);
    try {
      const userId = chatParserUtil.validateAuthentication(req);
      const sessionId = req.query.sessionId;

      if (sessionId) {
        const messages = await chatRepository.getSessionMessages(
          sessionId,
          userId
        );
        return res.json({
          success: true,
          messages,
        });
      }

      const limit = Math.min(Number.parseInt(req.query.limit || "50", 10), 100);
      const offset = Number.parseInt(req.query.offset || "0", 10);

      const sessions = await chatRepository.getUserSessions(
        userId,
        limit,
        offset
      );
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

  /**
   * Handles DELETE /chat/session/:sessionId. Deletes a chat session for the active user.
   *
   * @param {import("express").Request} req - The Express request object.
   * @param {import("express").Response} res - The Express response object.
   * @returns {Promise<Object>} JSON response confirming deletion.
   */
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

  /**
   * Handles GET /chat/models. Returns the available LLM models per provider from the catalog.
   *
   * @param {import("express").Request} req - The Express request object.
   * @param {import("express").Response} res - The Express response object.
   * @returns {Promise<Object>} JSON response containing providers and models.
   */
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

  /**
   * Handles POST /chat/messages/:messageId/feedback. Saves user feedback (rating and comment) for an AI message.
   *
   * @param {import("express").Request} req - The Express request object.
   * @param {import("express").Response} res - The Express response object.
   * @returns {Promise<Object>} JSON response confirming feedback submission.
   */
  async submitFeedback(req, res) {
    const userLanguage = getLangFromReq(req);
    const t = getI18n(userLanguage);
    try {
      const userId = chatParserUtil.validateAuthentication(req);
      const messageId = req.params.messageId;
      const { rating, comment } = req.body;

      if (!messageId) {
        return res.status(400).json({
          success: false,
          error: {
            code: "MESSAGE_ID_REQUIRED",
            message: "A message ID is required to submit feedback.",
          },
        });
      }

      if (rating !== "like" && rating !== "dislike" && rating !== null) {
        return res.status(400).json({
          success: false,
          error: {
            code: "INVALID_RATING",
            message: "Rating must be 'like', 'dislike', or null.",
          },
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
          success: false,
          error: {
            code: "CHAT_MESSAGE_NOT_FOUND",
            message: "Message not found or you don't have access to it.",
          },
        });
      }

      return res.json({
        success: true,
        messageId,
        rating,
      });
    } catch (error) {
      const normalizedError = chatFormatterUtil.normalizeApiError(error, {
        code: "FEEDBACK_SUBMIT_FAILED",
        message: "Failed to submit feedback.",
        statusCode: 500,
      });

      console.error("[weave-ai/chat] feedback submit failed", {
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

  async shareChatSession(req, res) {
    try {
      const userId = chatParserUtil.validateAuthentication(req);
      const sessionId = req.params.sessionId;

      if (!sessionId) {
        return res
          .status(400)
          .json({ success: false, error: "Session ID required" });
      }

      let shareToken = await chatRepository.generateShareToken(
        sessionId,
        userId
      );
      if (!shareToken) {
        return res
          .status(404)
          .json({ success: false, error: "Session not found" });
      }

      return res.json({ success: true, shareToken });
    } catch (error) {
      console.error("[weave-ai/chat] share session failed", error);
      return res
        .status(500)
        .json({ success: false, error: "Internal server error" });
    }
  }

  async getSharedChatPreview(req, res) {
    try {
      const token = req.params.token;
      if (!token) {
        return res
          .status(400)
          .json({ success: false, error: "Token required" });
      }

      const session = await chatRepository.getSharedSessionByToken(token);
      if (!session) {
        return res
          .status(404)
          .json({
            success: false,
            error: "Shared session not found or link expired",
          });
      }

      return res.json({ success: true, session });
    } catch (error) {
      console.error("[weave-ai/chat] get shared session failed", error);
      return res
        .status(500)
        .json({ success: false, error: "Internal server error" });
    }
  }

  async forkSharedChat(req, res) {
    try {
      const userId = chatParserUtil.validateAuthentication(req);
      const token = req.params.token;

      if (!token) {
        return res
          .status(400)
          .json({ success: false, error: "Token required" });
      }

      const newSession = await chatRepository.forkSession(token, userId);

      return res.json({ success: true, newSessionId: newSession.id });
    } catch (error) {
      console.error("[weave-ai/chat] fork session failed", error);
      if (error.message.includes("not found")) {
        return res
          .status(404)
          .json({ success: false, error: "Shared session not found" });
      }
      return res
        .status(500)
        .json({ success: false, error: "Internal server error" });
    }
  }
}

module.exports = new ChatController();
