const LogApiRequestsRepository = require("@/modules/api-tokens/repositories/log-api-requests.repository");

/**
 * Express middleware that records every authenticated Public API request
 * (`req.user.isApiCall === true`) into `public_api_request_logs`.
 *
 * IMPORTANT: This middleware is registered BEFORE per-route `verifyToken`
 * calls, so `req.user` is not populated yet at entry time. The `isApiCall`
 * guard is therefore deferred to the `res.on('finish')` callback, which fires
 * only after the full middleware chain — including `verifyToken` — has run.
 *
 * Strategy: fire-and-forget so the insert never delays nor breaks the response.
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
function logPublicApiRequest(req, res, next) {
  const startedAt = Date.now();

  res.on("finish", () => {
    // Guard here — verifyToken has already run by now.
    if (!req.user?.isApiCall) {
      return;
    }

    const durationMs = Date.now() - startedAt;

    // Capture error_code injected by AppError handlers (if any).
    const errorCode = res.locals?.errorCode ?? null;

    void LogApiRequestsRepository.insert({
      apiTokenId: req.apiToken?.id ?? null,
      apiVersion: req.apiVersion ?? "v1",
      durationMs,
      errorCode,
      httpMethod: req.method,
      ipAddress: req.clientIp ?? null,
      organizationId: req.user?.organizationId ?? null,
      originHeader: req.headers["origin"] ?? null,
      path: req.originalUrl ?? req.path,
      refererHeader: req.headers["referer"] ?? null,
      requestId: req.requestId ?? null,
      scopesRequired: res.locals?.scopesRequired ?? null,
      statusCode: res.statusCode,
      userAgent: req.headers["user-agent"] ?? null,
      userId: req.user?.userId ?? null,
    }).catch((err) => {
      // Never break the response for a logging failure.
      console.error("[PublicApiLog] Failed to insert request log:", err.message);
    });
  });

  return next();
}

module.exports = { logPublicApiRequest };
