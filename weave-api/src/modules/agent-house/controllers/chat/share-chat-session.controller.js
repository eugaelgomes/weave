const chatRepository = require("@/modules/agent-house/repositories/chat.repository");
const chatParserUtil = require("../../utils/chat-parser.util");

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

module.exports = { shareChatSession };
