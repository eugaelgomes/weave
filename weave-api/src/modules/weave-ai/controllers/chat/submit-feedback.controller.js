const chatRepository = require("@/modules/weave-ai/repositories/chat.repository");
const chatParserUtil = require("../../utils/chat-parser.util");
const chatFormatterUtil = require("../../utils/chat-formatter.util");

async function submitFeedback(req, res) {
  try {
    const userId = chatParserUtil.validateAuthentication(req);
    const messageId = req.params.messageId;
    const { rating, comment } = req.body;

    if (!messageId) {
      return res.status(400).json({
        success: false,
        error: { code: "MESSAGE_ID_REQUIRED", message: "A message ID is required to submit feedback." },
      });
    }

    const updated = await chatRepository.updateMessageFeedback(messageId, userId, rating, comment || null);

    if (!updated) {
      return res.status(404).json({
        success: false,
        error: { code: "CHAT_MESSAGE_NOT_FOUND", message: "Message not found or you don't have access to it." },
      });
    }

    return res.json({ success: true, messageId, rating });
  } catch (error) {
    const normalizedError = chatFormatterUtil.normalizeApiError(error, {
      code: "FEEDBACK_SUBMIT_FAILED",
      message: "Failed to submit feedback.",
      statusCode: 500,
    });
    console.error("[weave-ai/chat] feedback submit failed", { error: normalizedError });
    return res.status(normalizedError.statusCode).json({
      success: false,
      error: { code: normalizedError.code, message: normalizedError.message },
    });
  }
}

module.exports = { submitFeedback };