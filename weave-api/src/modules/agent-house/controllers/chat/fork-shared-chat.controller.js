const chatRepository = require("@/modules/agent-house/repositories/chat.repository");
const chatParserUtil = require("../../utils/chat-parser.util");

async function forkSharedChat(req, res) {
  try {
    const userId = chatParserUtil.validateAuthentication(req);
    const token = req.params.token;

    if (!token) {
      return res.status(400).json({ error: "Token required", success: false });
    }

    const newSession = await chatRepository.forkSession(token, userId);

    return res.json({ newSessionId: newSession.id, success: true });
  } catch (error) {
    console.error("[agent-house/chat] fork session failed", error);
    if (error.message.includes("not found")) {
      return res
        .status(404)
        .json({ error: "Shared session not found", success: false });
    }
    return res
      .status(500)
      .json({ error: "Internal server error", success: false });
  }
}

module.exports = { forkSharedChat };
