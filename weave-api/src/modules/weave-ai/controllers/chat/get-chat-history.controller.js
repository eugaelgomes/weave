const chatRepository = require("@/modules/weave-ai/repositories/chat.repository");
const chatParserUtil = require("../../utils/chat-parser.util");
const chatFormatterUtil = require("../../utils/chat-formatter.util");
const { getI18n, getLangFromReq } = require("../../utils/weave-ai-i18n.util");

async function getChatHistory(req, res) {
  const userLanguage = getLangFromReq(req);
  const t = getI18n(userLanguage);
  try {
    const userId = chatParserUtil.validateAuthentication(req);
    const { sessionId, limit, offset } = req.query;

    if (sessionId) {
      const messages = await chatRepository.getSessionMessages(sessionId, userId);
      return res.json({ success: true, messages });
    }

    const sessions = await chatRepository.getUserSessions(userId, limit, offset);
    return res.json({ success: true, sessions });
  } catch (error) {
    const normalizedError = chatFormatterUtil.normalizeApiError(error, {
      code: "HISTORY_FETCH_FAILED",
      message: t.historyFetchFailed,
      statusCode: 500,
    });
    console.error("[weave-ai/chat] history fetch failed", { error: normalizedError });
    return res.status(normalizedError.statusCode).json({
      success: false,
      error: { code: normalizedError.code, message: normalizedError.message },
    });
  }
}

module.exports = { getChatHistory };