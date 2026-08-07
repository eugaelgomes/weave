const chatRepository = require("@/modules/agent-house/repositories/chat.repository");

async function getSharedChatPreview(req, res) {
  try {
    const token = req.params.token;
    if (!token) {
      return res.status(400).json({ error: "Token required", success: false });
    }

    const session = await chatRepository.getSharedSessionByToken(token);
    if (!session) {
      return res.status(404).json({
        error: "Shared session not found or link expired",
        success: false,
      });
    }

    return res.json({ session, success: true });
  } catch (error) {
    console.error("[agent-house/chat] get shared session failed", error);
    return res
      .status(500)
      .json({ error: "Internal server error", success: false });
  }
}

module.exports = { getSharedChatPreview };
