const chatRepository = require("@/modules/agent-house/repositories/chat.repository");
const chatParserUtil = require("../../utils/chat-parser.util");
const chatFormatterUtil = require("../../utils/chat-formatter.util");

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

module.exports = { submitFeedback };
