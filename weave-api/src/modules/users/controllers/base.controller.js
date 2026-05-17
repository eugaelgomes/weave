const SigninRepository = require("@/modules/authentication/repositories/signin.repository");
const {
  buildUniqueConflictPayload,
  getUniqueFieldFromPgError,
} = require("@/modules/users/utils/unique-conflicts");

/**
 * Controller base dos módulos de usuário: utilitários de data, fuso horário e erros HTTP.
 */
class BaseController {
  constructor() {
    this.signinRepository = SigninRepository;
  }

  /**
   * @returns {string} Data/hora atual no formato `YYYY-MM-DD HH:mm:ss` (UTC).
   */
  _getCurrentDateTime() {
    return new Date().toISOString().slice(0, 19).replace("T", " ");
  }

  /**
   * @param {string} timezone Identificador IANA (ex.: `America/Sao_Paulo`).
   * @returns {boolean}
   */
  _isValidTimezone(timezone) {
    const ALL_TIMEZONES = Intl.supportedValuesOf("timeZone");
    return ALL_TIMEZONES.includes(timezone);
  }

  /**
   * @param {Error} error
   * @param {import('express').Response} res
   * @param {import('express').NextFunction} [_next]
   * @returns {import('express').Response|void}
   */
  _handleError(error, res, _next) {
    console.error(`[Controller Error]: ${error.message}`, {
      stack: error.stack,
    });

    const uniqueField = getUniqueFieldFromPgError(error);
    if (uniqueField) {
      return res.status(409).json(buildUniqueConflictPayload(uniqueField));
    }

    if (
      error.message.includes("obrigatório") ||
      error.message.includes("required") ||
      error.message.includes("Invalid")
    ) {
      return res.status(400).json({ error: error.message });
    }
    if (
      error.message.includes("não encontrada") ||
      error.message.includes("not found") ||
      error.message.includes("negado") ||
      error.message.includes("denied") ||
      error.message.includes("Access denied")
    ) {
      return res.status(404).json({ error: error.message });
    }

    return res.status(500).json({ error: "Internal server error." });
  }

  /**
   * @param {import('express').Request} req
   * @returns {string|number} `req.user.userId` quando autenticado.
   * @throws {Error} When the request has no authenticated user.
   */
  _validateAuthentication(req) {
    if (!req.user || !req.user.userId) {
      throw new Error("Access denied: user is not authenticated");
    }
    return req.user.userId;
  }
}
module.exports = BaseController;
