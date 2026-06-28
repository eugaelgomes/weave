const chatRepository = require("@/modules/weave-ai/repositories/chat.repository");
const chatParserUtil = require("../../utils/chat-parser.util");

async function forkSharedChat(req, res) {
  try {
    const userId = chatParserUtil.validateAuthentication(req);
    const token = req.params.token;

    if (!token) {
      return res.status(400).json({ success: false, error: "Token required" });
    }

    const newSession = await chatRepository.forkSession(token, userId);

    return res.json({ success: true, newSessionId: newSession.id });
  } catch (error) {
    console.error("[weave-ai/chat] fork session failed", error);
    if (error.message.includes("not found")) {
      return res.status(404).json({ success: false, error: "Shared session not found" });
    }
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
}

module.exports = { forkSharedChat };