const chatRepository = require("@/modules/weave-ai/repositories/chat.repository");
const chatParserUtil = require("../../utils/chat-parser.util");
const chatFormatterUtil = require("../../utils/chat-formatter.util");
const { getI18n, getLangFromReq } = require("../../utils/weave-ai-i18n.util");

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
    console.error("[weave-ai/chat] session delete failed", {
      error: normalizedError,
    });
    return res.status(normalizedError.statusCode).json({
      error: { code: normalizedError.code, message: normalizedError.message },
      success: false,
    });
  }
}

module.exports = { deleteChatSession };
