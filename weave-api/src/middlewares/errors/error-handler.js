const { AppError, fromUnknown } = require("@/errors/app-error");
const { ERROR_CODES, DEFAULT_MESSAGES } = require("@/errors/codes");
const { getPgLogContext } = require("@/errors/pg-error-mapper");

const isProduction = () => process.env.NODE_ENV === "production";

/**
 * @param {import('express').Request} req
 * @returns {string|number|undefined}
 */
const getUserId = (req) => req.user?.userId ?? req.user?.id;

/**
 * @param {AppError} appError
 * @param {unknown} originalError
 * @returns {Record<string, unknown>|undefined}
 */
function buildDevDetails(appError, originalError) {
  if (isProduction() || appError.isOperational) {
    return undefined;
  }

  const details = {
    originalMessage:
      originalError instanceof Error ? originalError.message : String(originalError),
    ...getPgLogContext(originalError),
  };

  if (originalError instanceof Error && originalError.stack) {
    details.stack = originalError.stack;
  }

  return details;
}

/**
 * @param {AppError} appError
 * @returns {Record<string, unknown>}
 */
function buildErrorBody(appError) {
  const body = {
    error: {
      code: appError.code,
      message: appError.message,
      status: appError.statusCode,
    },
  };

  if (appError.body && typeof appError.body === "object") {
    Object.assign(body, appError.body);
  }

  if (appError.details && typeof appError.details === "object") {
    body.error.details = appError.details;
  }

  return body;
}

/**
 * @param {unknown} err
 * @param {import('express').Request} req
 */
function logServerError(err, req) {
  const appError = AppError.isAppError(err) ? err : fromUnknown(err);
  const shouldLog =
    !appError.isOperational || appError.statusCode >= 500 || !isProduction();

  if (!shouldLog) return;

  console.error("[API Error]", {
    requestId: req.requestId,
    method: req.method,
    path: req.originalUrl,
    userId: getUserId(req),
    code: appError.code,
    status: appError.statusCode,
    message: err instanceof Error ? err.message : String(err),
    ...getPgLogContext(err),
    stack: err instanceof Error ? err.stack : undefined,
  });
}

const errorHandler = {
  notFoundHandler: (req, res, next) => {
    const err = AppError.notFound(
      DEFAULT_MESSAGES[ERROR_CODES.ROUTE_NOT_FOUND],
      ERROR_CODES.ROUTE_NOT_FOUND
    );
    next(err);
  },

  globalErrorHandler: (err, req, res, _next) => {
    const originalError = err;
    const appError = AppError.isAppError(err) ? err : fromUnknown(err);

    let clientError = appError;

    if (!appError.isOperational || appError.statusCode >= 500) {
      clientError = AppError.internal();
    }

    const devDetails = buildDevDetails(appError, originalError);
    if (devDetails) {
      clientError.details = devDetails;
    }

    logServerError(originalError, req);

    const statusCode = clientError.statusCode || 500;
    return res.status(statusCode).json(buildErrorBody(clientError));
  },
};

module.exports = { errorHandler };
