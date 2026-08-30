const chatMessagesRepository = require("../../repositories/chat/chat-messages.repository");
const chatSessionsRepository = require("../../repositories/chat/chat-sessions.repository");
const chatFormatterUtil = require("../../utils/chat-formatter.util");
const { getI18n, getLangFromReq } = require("../../utils/agent-house-i18n.util");
const BaseController = require("../base.controller");

class ChatSessionsController extends BaseController {
  async deleteChatSession(req, res) {
    const userLanguage = getLangFromReq(req);
    const t = getI18n(userLanguage);
    try {
      const userId = this._validateAuthentication(req);
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

      const sessions = await chatSessionsRepository.getUserSessions(userId, 200);
      const hasSessionAccess = sessions.some((session) => String(session.id) === String(sessionId));

      if (!hasSessionAccess) {
        return res.status(404).json({
          error: { code: "CHAT_SESSION_NOT_FOUND", message: t.sessionNotFound },
          success: false,
        });
      }

      await chatSessionsRepository.deleteSession(sessionId, userId);

      return res.json({ deleted: true, sessionId, success: true });
    } catch (error) {
      const normalizedError = chatFormatterUtil.normalizeApiError(error, {
        code: "SESSION_DELETE_FAILED",
        message: t.sessionDeleteFailed,
        statusCode: 500,
      });
      console.error("[agent-house/chat-sessions] session delete failed", {
        error: normalizedError,
      });
      return res.status(normalizedError.statusCode).json({
        error: { code: normalizedError.code, message: normalizedError.message },
        success: false,
      });
    }
  }

  async getChatHistory(req, res) {
    const userLanguage = getLangFromReq(req);
    const t = getI18n(userLanguage);
    try {
      const userId = this._validateAuthentication(req);
      const { sessionId, limit, offset } = req.query;

      if (sessionId) {
        const messages = await chatMessagesRepository.getSessionMessages(sessionId, userId);
        return res.json({ messages, success: true });
      }

      const sessions = await chatSessionsRepository.getUserSessions(userId, limit, offset);
      return res.json({ sessions, success: true });
    } catch (error) {
      const normalizedError = chatFormatterUtil.normalizeApiError(error, {
        code: "HISTORY_FETCH_FAILED",
        message: t.historyFetchFailed,
        statusCode: 500,
      });
      console.error("[agent-house/chat-sessions] history fetch failed", {
        error: normalizedError,
      });
      return res.status(normalizedError.statusCode).json({
        error: { code: normalizedError.code, message: normalizedError.message },
        success: false,
      });
    }
  }

  async submitFeedback(req, res) {
    try {
      const userId = this._validateAuthentication(req);
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

      const updated = await chatMessagesRepository.updateMessageFeedback(
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
      console.error("[agent-house/chat-sessions] feedback submit failed", {
        error: normalizedError,
      });
      return res.status(normalizedError.statusCode).json({
        error: { code: normalizedError.code, message: normalizedError.message },
        success: false,
      });
    }
  }
}

module.exports = new ChatSessionsController();
