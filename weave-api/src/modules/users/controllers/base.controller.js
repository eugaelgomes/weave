const SigninRepository = require("@/modules/authentication/repositories/signin.repository");
const { AppError, fromUnknown } = require("@/errors");
const {
  buildUniqueConflictPayload,
  getUniqueFieldFromPgError,
} = require("@/modules/users/utils/unique-conflicts");

/**
 * Shared utilities for user module controllers (datetime, timezone, HTTP errors).
 */
class BaseController {
  constructor() {
    this.signinRepository = SigninRepository;
  }

  /**
   * @returns {string} Current datetime as `YYYY-MM-DD HH:mm:ss` (UTC).
   */
  _getCurrentDateTime() {
    return new Date().toISOString().slice(0, 19).replace("T", " ");
  }

  /**
   * @param {string} timezone IANA identifier (e.g. `America/Sao_Paulo`).
   * @returns {boolean}
   */
  _isValidTimezone(timezone) {
    const ALL_TIMEZONES = Intl.supportedValuesOf("timeZone");
    return ALL_TIMEZONES.includes(timezone);
  }

  /**
   * @param {Error} error
   * @param {import('express').Response} res
   * @param {import('express').NextFunction} next
   * @returns {import('express').Response|void}
   */
  _handleError(error, res, next) {
    console.error(`[Controller Error]: ${error.message}`, {
      stack: error.stack,
    });

    const uniqueField = getUniqueFieldFromPgError(error);
    if (uniqueField) {
      return res.status(409).json(buildUniqueConflictPayload(uniqueField));
    }

    return next(fromUnknown(error));
  }

  /**
   * @param {import('express').Request} req
   * @returns {string|number} `req.user.userId` when authenticated.
   * @throws {import('@/errors/app-error').AppError} When the request has no authenticated user.
   */
  _validateAuthentication(req) {
    if (!req.user || !req.user.userId) {
      throw AppError.unauthorized();
    }
    return req.user.userId;
  }
}
module.exports = BaseController;
