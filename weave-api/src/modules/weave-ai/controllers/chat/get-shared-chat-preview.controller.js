const chatRepository = require("@/modules/weave-ai/repositories/chat.repository");

async function getSharedChatPreview(req, res) {
  try {
    const token = req.params.token;
    if (!token) {
      return res.status(400).json({ success: false, error: "Token required" });
    }

    const session = await chatRepository.getSharedSessionByToken(token);
    if (!session) {
      return res.status(404).json({ success: false, error: "Shared session not found or link expired" });
    }

    return res.json({ success: true, session });
  } catch (error) {
    console.error("[weave-ai/chat] get shared session failed", error);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
}

module.exports = { getSharedChatPreview };