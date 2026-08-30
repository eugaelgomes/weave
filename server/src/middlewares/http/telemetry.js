const { performance } = require("perf_hooks");

/**
 * Builds the standard metadata object for API responses.
 * @param {import('express').Request} req
 * @returns {Record<string, unknown>}
 */
function buildMeta(req) {
  const durationMs = req.startTime
    ? Math.round((performance.now() - req.startTime) * 100) / 100
    : 0;
  return {
    durationMs,
    requestId: req.requestId,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Attaches standard response helpers (res.apiSuccess) and captures HTTP telemetry on finish.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
function telemetryMiddleware(req, res, next) {
  req.startTime = performance.now();

  // Attach standardized response formatters
  res.apiSuccess = (data = {}, statusCode = 200, additionalMeta = {}) => {
    return res.status(statusCode).json({
      data,
      meta: {
        ...buildMeta(req),
        ...additionalMeta,
      },
      success: true,
    });
  };

  res.apiPaginated = (items = [], paginationInfo = {}, statusCode = 200) => {
    return res.status(statusCode).json({
      data: items,
      meta: buildMeta(req),
      pagination: paginationInfo,
      success: true,
    });
  };

  // Log on response finish
  res.on("finish", () => {
    const duration = req.startTime ? performance.now() - req.startTime : 0;

    // Do not log OPTIONS requests or health checks heavily
    if (req.method === "OPTIONS" || req.path === "/api/v1/health") return;

    const logPayload = {
      durationMs: Math.round(duration * 100) / 100,
      ip: req.clientIp || req.ip,
      method: req.method,
      path: req.originalUrl || req.path,
      requestId: req.requestId,
      status: res.statusCode,
    };

    if (req.user) {
      logPayload.userId = req.user.userId || req.user.id;
    }
    if (req.workspace) {
      logPayload.orgId = req.workspace.id;
    }

    const logMessage = `[HTTP OUT] ${req.method} ${logPayload.path} - ${res.statusCode} (${logPayload.durationMs}ms)`;

    if (res.statusCode >= 500) {
      console.error(logMessage, logPayload);
    } else if (res.statusCode >= 400) {
      console.warn(logMessage, logPayload);
    } else {
      console.info(logMessage, logPayload);
    }
  });

  next();
}

module.exports = { buildMeta, telemetryMiddleware };
