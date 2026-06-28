const chatRepository = require("@/modules/weave-ai/repositories/chat.repository");
const chatParserUtil = require("../../utils/chat-parser.util");

async function shareChatSession(req, res) {
  try {
    const userId = chatParserUtil.validateAuthentication(req);
    const sessionId = req.params.sessionId;

    if (!sessionId) {
      return res.status(400).json({ success: false, error: "Session ID required" });
    }

    const shareToken = await chatRepository.generateShareToken(sessionId, userId);
    if (!shareToken) {
      return res.status(404).json({ success: false, error: "Session not found" });
    }

    return res.json({ success: true, shareToken });
  } catch (error) {
    console.error("[weave-ai/chat] share session failed", error);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
}

module.exports = { shareChatSession };