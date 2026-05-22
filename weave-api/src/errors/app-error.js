const { ERROR_CODES, DEFAULT_MESSAGES } = require("@/errors/codes");
const { mapPgError } = require("@/errors/pg-error-mapper");

/**
 * Operational HTTP error with a stable code and safe client message.
 */
class AppError extends Error {
  /**
   * @param {string} code
   * @param {string} message
   * @param {number} [statusCode=500]
   * @param {{ isOperational?: boolean, details?: Record<string, unknown>, body?: Record<string, unknown> }} [options]
   */
  constructor(code, message, statusCode = 500, options = {}) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = options.isOperational !== false;
    this.details = options.details;
    this.body = options.body;
  }

  /**
   * @param {unknown} error
   * @returns {error is AppError}
   */
  static isAppError(error) {
    return error instanceof AppError;
  }

  /**
   * @param {string} message
   * @param {string} [code]
   */
  static badRequest(message, code = ERROR_CODES.VALIDATION_ERROR) {
    return new AppError(code, message, 400);
  }

  /**
   * @param {string} [message]
   * @param {string} [code]
   */
  static unauthorized(
    message = DEFAULT_MESSAGES[ERROR_CODES.AUTH_REQUIRED],
    code = ERROR_CODES.AUTH_REQUIRED
  ) {
    return new AppError(code, message, 401);
  }

  /**
   * @param {string} message
   * @param {string} [code]
   */
  static forbidden(message, code = ERROR_CODES.ORG_FORBIDDEN) {
    return new AppError(code, message, 403);
  }

  /**
   * @param {string} message
   * @param {string} [code]
   */
  static notFound(
    message = DEFAULT_MESSAGES[ERROR_CODES.RESOURCE_NOT_FOUND],
    code = ERROR_CODES.RESOURCE_NOT_FOUND
  ) {
    return new AppError(code, message, 404);
  }

  /**
   * @param {string} message
   * @param {string} [code]
   * @param {Record<string, unknown>} [body]
   */
  static conflict(message, code = ERROR_CODES.VALIDATION_ERROR, body) {
    return new AppError(code, message, 409, { body });
  }

  /**
   * @param {string} [code]
   */
  static internal(code = ERROR_CODES.INTERNAL_ERROR) {
    const message =
      DEFAULT_MESSAGES[ERROR_CODES.INTERNAL_ERROR] ||
      "Unexpected server error. Please try again later.";
    return new AppError(code, message, 500, { isOperational: false });
  }
}

/**
 * @param {string} message
 * @returns {boolean}
 */
function looksLikeInternalErrorMessage(message) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("violates") ||
    normalized.includes("constraint") ||
    normalized.includes("column") ||
    normalized.includes("relation") ||
    normalized.includes("syntax error") ||
    normalized.includes("stack trace") ||
    normalized.length > 240
  );
}

/**
 * Maps legacy `throw new Error("...")` patterns to operational AppError when safe.
 *
 * @param {Error} error
 * @returns {AppError|null}
 */
function mapLegacyOperationalError(error) {
  if (!(error instanceof Error)) return null;
  const message = error.message?.trim();
  if (!message || looksLikeInternalErrorMessage(message)) return null;

  if (/required|invalid|must be|cannot be empty/i.test(message)) {
    return AppError.badRequest(message);
  }

  if (/access denied|forbidden|permission/i.test(message)) {
    return AppError.forbidden(message);
  }

  if (/not found/i.test(message)) {
    return AppError.notFound(message);
  }

  if (/conflict|already exists|already in use/i.test(message)) {
    return AppError.conflict(message);
  }

  return null;
}

/**
 * Normalizes any thrown value into an AppError for the global error handler.
 *
 * @param {unknown} error
 * @param {string} [fallbackCode]
 * @returns {AppError}
 */
function fromUnknown(error, fallbackCode = ERROR_CODES.INTERNAL_ERROR) {
  if (AppError.isAppError(error)) {
    return error;
  }

  const legacyMapped = mapLegacyOperationalError(error);
  if (legacyMapped) {
    return legacyMapped;
  }

  const pgMapped = mapPgError(error);
  if (pgMapped.mapped) {
    return new AppError(
      pgMapped.code || fallbackCode,
      pgMapped.message || DEFAULT_MESSAGES[fallbackCode] || "Request failed.",
      pgMapped.statusCode || 500,
      { body: pgMapped.body }
    );
  }

  if (error && typeof error === "object" && "statusCode" in error) {
    const statusCode = Number(error.statusCode) || 500;
    const message =
      typeof error.message === "string" && error.message.trim()
        ? error.message.trim()
        : DEFAULT_MESSAGES[fallbackCode] || "Request failed.";

    if (statusCode >= 500) {
      return AppError.internal(fallbackCode);
    }

    return new AppError(fallbackCode, message, statusCode, {
      isOperational: true,
    });
  }

  return AppError.internal(fallbackCode);
}

module.exports = { AppError, fromUnknown };
