const { ERROR_CODES } = require("@/errors/codes");
const {
  getUniqueFieldFromPgError,
  buildUniqueConflictPayload,
} = require("@/modules/users/utils/unique-conflicts");

/**
 * @typedef {Error & {
 *   code?: string,
 *   constraint?: string,
 *   detail?: string,
 *   table?: string,
 *   column?: string,
 * }} PgError
 */

/**
 * @param {unknown} error
 * @returns {error is PgError}
 */
const isPgError = (error) =>
  Boolean(error && typeof error === "object" && "code" in error);

/**
 * Maps a Postgres error to a safe operational result when possible.
 *
 * @param {unknown} error
 * @returns {{
 *   mapped: boolean,
 *   statusCode?: number,
 *   code?: string,
 *   message?: string,
 *   body?: Record<string, unknown>,
 * }}
 */
function mapPgError(error) {
  if (!isPgError(error)) {
    return { mapped: false };
  }

  const uniqueField = getUniqueFieldFromPgError(error);
  if (uniqueField) {
    const payload = buildUniqueConflictPayload(uniqueField);
    return {
      body: payload,
      code: payload.code,
      mapped: true,
      message: payload.message,
      statusCode: 409,
    };
  }

  const pgCode = String(error.code || "");

  if (pgCode === "23503") {
    return {
      code: ERROR_CODES.VALIDATION_ERROR,
      mapped: true,
      message: "Referenced resource does not exist or is invalid.",
      statusCode: 400,
    };
  }

  if (pgCode === "22P02") {
    return {
      code: ERROR_CODES.VALIDATION_ERROR,
      mapped: true,
      message: "Invalid identifier format.",
      statusCode: 400,
    };
  }

  return { mapped: false };
}

/**
 * Extracts safe diagnostic fields for server logs (never sent to clients in production).
 *
 * @param {unknown} error
 * @returns {Record<string, string|undefined>}
 */
function getPgLogContext(error) {
  if (!isPgError(error)) return {};
  return {
    column: error.column,
    constraint: error.constraint,
    detail: error.detail,
    pgCode: error.code,
    table: error.table,
  };
}

module.exports = { getPgLogContext, isPgError, mapPgError };
