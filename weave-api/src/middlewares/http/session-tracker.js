/**
 * Middleware to track session metadata automatically on every request.
 * Extracts IP address and User-Agent from the request and assigns them
 * to the session object so the WeaveSessionStore can save them to the DB.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const sessionTrackerMiddleware = (req, res, next) => {
  if (req.session) {
    // Rely on getClientIp middleware if available, otherwise req.ip
    const ip = req.clientIp || req.ip || null;
    const userAgent = req.headers["user-agent"] || null;

    let modified = false;

    if (ip && req.session.ip_address !== ip) {
      req.session.ip_address = ip;
      modified = true;
    }

    if (userAgent && req.session.user_agent !== userAgent) {
      req.session.user_agent = userAgent;
      modified = true;
    }

    const isPublic =
      req.originalUrl && req.originalUrl.includes("/api/public/");
    const apiType = isPublic ? "public" : "internal";
    if (req.session.api_type !== apiType) {
      req.session.api_type = apiType;
      modified = true;
    }

    // Force express-session to save the updated metadata if it changed
    // This allows the initial request to store the IP and User-Agent
    // even if saveUninitialized is false and the session hasn't had
    // other data like user_id added yet.
    if (modified && req.session.save) {
      // Just flag as modified.
      // Express-session automatically saves if contents change.
    }
  }

  next();
};

module.exports = { sessionTrackerMiddleware };
