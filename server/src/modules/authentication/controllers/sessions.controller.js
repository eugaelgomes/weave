const { sessionStore } = require("@/middlewares/http/session");
const { clearSessionCookie } = require("@/middlewares/http/session-lifecycle");
const crypto = require("crypto");

function toPublicSessionId(sessionId) {
  return crypto.createHmac("sha256", process.env.SESSION_SECRET).update(sessionId).digest("hex");
}

function destroySession(sessionId) {
  return new Promise((resolve, reject) => {
    sessionStore.destroy(sessionId, (error) => {
      if (error) return reject(error);
      return resolve();
    });
  });
}

class SessionsController {
  async list(req, res, next) {
    try {
      const sessions = await sessionStore.listUserSessions(req.user.userId);
      return res.json({
        data: sessions.map((session) => ({
          current: session.sid === req.sessionID,
          expires_at: session.expire,
          id: toPublicSessionId(session.sid),
          ip_address: session.ip_address,
          last_active: session.last_active,
          user_agent: session.user_agent,
        })),
        success: true,
      });
    } catch (error) {
      return next(error);
    }
  }

  async revoke(req, res, next) {
    try {
      const targetSessionId = req.params.sessionId;
      const sessions = await sessionStore.listUserSessions(req.user.userId);
      const targetSession = sessions.find(
        (session) => toPublicSessionId(session.sid) === targetSessionId
      );
      if (!targetSession) {
        return res.status(404).json({ error: "Session not found.", success: false });
      }

      await destroySession(targetSession.sid);
      if (targetSession.sid === req.sessionID) clearSessionCookie(res);
      return res.json({ success: true });
    } catch (error) {
      return next(error);
    }
  }

  async revokeOthers(req, res, next) {
    try {
      const revoked = await sessionStore.destroyOtherUserSessions(req.user.userId, req.sessionID);
      return res.json({ data: { revoked }, success: true });
    } catch (error) {
      return next(error);
    }
  }
}

module.exports = new SessionsController();
