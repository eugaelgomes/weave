const bcrypt = require("bcrypt");
const Sentry = require("@sentry/node");
const LookupApiTokensRepository = require("@/modules/api-tokens/repositories/lookup-api-tokens.repository");
const {
  jwtPayloadSchema,
} = require("@/modules/authentication/schemas/jwt-payload.schema");

/**
 * Middleware that verifies the authentication of the request.
 * Supports two flows:
 * 1. Web User Session: Stateful Sessions via express-session.
 * 2. Public API Authentication: Tokens via header 'Authorization: Bearer wn_prefix.secret'.
 *
 * In production, includes detailed logs for authentication problems.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const verifyToken = async (req, res, next) => {
  const isProduction = process.env.NODE_ENV === "production";

  // 1. Public API Authentication: Tokens via header 'Authorization: Bearer wn_prefix.secret'.
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer wn_")) {
    try {
      const apiTokenRaw = authHeader.split(" ")[1]; // wn_prefix123.secret456
      const tokenParts = apiTokenRaw.split(".");

      if (tokenParts.length !== 2) {
        return res
          .status(401)
          .json({ error: "Invalid or malformed API token." });
      }

      const prefixPart = tokenParts[0]; // wn_abc123
      const secretPart = tokenParts[1]; // def456...
      const keyPrefix = prefixPart.replace("wn_", "");

      // Fetch and validate business rules of the API Token
      const tokenRecord =
        await LookupApiTokensRepository.getTokenByKeyPrefix(keyPrefix);

      if (!tokenRecord) {
        return res
          .status(401)
          .json({ error: "API Token not found or inactive." });
      }

      if (tokenRecord.revoked_at) {
        return res
          .status(401)
          .json({ error: "This API token has been revoked." });
      }

      if (
        tokenRecord.expires_at &&
        new Date() > new Date(tokenRecord.expires_at)
      ) {
        return res.status(401).json({ error: "This API token has expired." });
      }

      const isValid = await bcrypt.compare(secretPart, tokenRecord.token_hash);
      if (!isValid) {
        return res
          .status(401)
          .json({ error: "Invalid API token (Secret incorrect)." });
      }

      // Populates the request data with the token owner
      req.apiToken = {
        id: tokenRecord.id,
        scopes: tokenRecord.scopes || ["read"],
      };

      req.user = {
        apiToken: req.apiToken,
        isApiCall: true,
        organizationId: tokenRecord.organization_id,
        userId: tokenRecord.user_id,
      };

      return next(); // Follows the public API flow
    } catch (error) {
      console.error(
        "[Auth Error] Error validating public API token:",
        error.message
      );
      Sentry.captureException(error);
      return res
        .status(500)
        .json({ error: "Internal error validating the API token." });
    }
  }

  // 2. Web User Session: Stateful Sessions via express-session
  if (!req.session || !req.session.user) {
    // Debug in production to identify the problem of lost requests
    if (isProduction) {
      const debugInfo = {
        cookieKeys: req.cookies ? Object.keys(req.cookies) : [],
        hasCookies: !!req.cookies,
        origin: req.headers.origin,
        path: req.path,
        referer: req.headers.referer,
        sessionExists: !!req.session,
        userAgent: req.headers["user-agent"]?.substring(0, 50),
      };

      console.error("[Auth Error] Session not found", debugInfo);

      Sentry.captureMessage("[Auth Error] Session not found", {
        extra: debugInfo,
        level: "warning",
      });
    }
    return res.status(401).json({
      message: "Access denied. Session or API token not provided.",
    });
  }

  try {
    const parsed = jwtPayloadSchema.safeParse(req.session.user);
    if (!parsed.success) {
      return res.status(401).json({
        message: "Invalid or corrupted session data.",
      });
    }

    // Attaches the validated web credentials to the request
    req.user = parsed.data;

    return next();
  } catch {
    return res.status(401).json({
      message: "Invalid or expired session.",
    });
  }
};

module.exports = {
  verifyToken,
};
