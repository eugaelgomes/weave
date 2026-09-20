const { ABSOLUTE_TIMEOUT_MS } = require("@/middlewares/http/session");

function regenerateSession(req) {
  return new Promise((resolve, reject) => {
    req.session.regenerate((error) => {
      if (error) return reject(error);
      return resolve();
    });
  });
}

function saveSession(req) {
  return new Promise((resolve, reject) => {
    req.session.save((error) => {
      if (error) return reject(error);
      return resolve();
    });
  });
}

async function establishAuthenticatedSession(req, payload, userId) {
  await regenerateSession(req);

  req.session.user = payload;
  req.session.userId = userId;
  req.session.authenticated_at = Date.now();
  req.session.absolute_expires_at = Date.now() + ABSOLUTE_TIMEOUT_MS;
  req.session.ip_address = req.clientIp || req.ip || null;
  req.session.user_agent = req.headers["user-agent"] || null;
  req.session.api_type = "internal";

  await saveSession(req);
}

module.exports = { establishAuthenticatedSession, regenerateSession, saveSession };
