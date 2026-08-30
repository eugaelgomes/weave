const chatRepository = require("../../repositories/chat.repository");
const BaseController = require("../base.controller");

class ChatSharingController extends BaseController {
  async forkSharedChat(req, res) {
    try {
      const userId = this._validateAuthentication(req);
      const token = req.params.token;

      if (!token) {
        return res.status(400).json({ error: "Token required", success: false });
      }

      const newSession = await chatRepository.forkSession(token, userId);

      return res.json({ newSessionId: newSession.id, success: true });
    } catch (error) {
      console.error("[agent-house/chat-sharing] fork session failed", error);
      if (error.message.includes("not found")) {
        return res.status(404).json({ error: "Shared session not found", success: false });
      }
      return res.status(500).json({ error: "Internal server error", success: false });
    }
  }

  async getSharedChatPreview(req, res) {
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
      console.error("[agent-house/chat-sharing] get shared session failed", error);
      return res.status(500).json({ error: "Internal server error", success: false });
    }
  }

  async shareChatSession(req, res) {
    try {
      const userId = this._validateAuthentication(req);
      const sessionId = req.params.sessionId;

      if (!sessionId) {
        return res.status(400).json({ error: "Session ID required", success: false });
      }

      const shareToken = await chatRepository.generateShareToken(sessionId, userId);
      if (!shareToken) {
        return res.status(404).json({ error: "Session not found", success: false });
      }

      return res.json({ shareToken, success: true });
    } catch (error) {
      console.error("[agent-house/chat-sharing] share session failed", error);
      return res.status(500).json({ error: "Internal server error", success: false });
    }
  }
}

module.exports = new ChatSharingController();
