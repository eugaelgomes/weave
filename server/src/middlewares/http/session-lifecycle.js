const { ABSOLUTE_TIMEOUT_MS, SESSION_COOKIE_NAME } = require("./session");
const { detectSameSitePolicy } = require("@/config/allowed-origins");

function clearSessionCookie(res) {
  res.clearCookie(SESSION_COOKIE_NAME, {
    httpOnly: true,
    path: "/",
    sameSite: process.env.NODE_ENV === "production" ? detectSameSitePolicy() : "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

function sessionLifecycleMiddleware(req, res, next) {
  if (!req.session?.user) return next();

  const now = Date.now();
  const absoluteExpiresAt = Number(req.session.absolute_expires_at);

  // Sessions created before absolute expiry was introduced are safely bounded
  // from their first request after the deployment.
  if (!Number.isFinite(absoluteExpiresAt)) {
    req.session.absolute_expires_at = now + ABSOLUTE_TIMEOUT_MS;
    return next();
  }

  if (now < absoluteExpiresAt) return next();

  return req.session.destroy(() => {
    clearSessionCookie(res);
    return next();
  });
}

module.exports = { clearSessionCookie, sessionLifecycleMiddleware };
