/**
 * Stable machine-readable API error codes (SCREAMING_SNAKE_CASE).
 * @readonly
 */
const ERROR_CODES = {
  AUTH_REQUIRED: "AUTH_REQUIRED",
  BLOCK_CONFLICT: "BLOCK_CONFLICT",
  EMAIL_NOT_VERIFIED: "EMAIL_NOT_VERIFIED",
  FILE_TOO_LARGE: "FILE_TOO_LARGE",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  INVALID_FILE_TYPE: "INVALID_FILE_TYPE",
  NOTE_CONFLICT: "NOTE_CONFLICT",
  NOTE_NOT_FOUND: "NOTE_NOT_FOUND",
  PLAN_LIMIT_EXCEEDED: "PLAN_LIMIT_EXCEEDED",
  PROJECT_FORBIDDEN: "PROJECT_FORBIDDEN",
  RESOURCE_NOT_FOUND: "RESOURCE_NOT_FOUND",
  ROUTE_NOT_FOUND: "ROUTE_NOT_FOUND",
  USER_UNIQUE_CONFLICT: "USER_UNIQUE_CONFLICT",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  WORKSPACE_FORBIDDEN: "WORKSPACE_FORBIDDEN",
  WORKSPACE_UNIQUE_CONFLICT: "WORKSPACE_UNIQUE_CONFLICT",
};

/**
 * Default English client messages keyed by error code.
 * @type {Record<string, string>}
 */
const DEFAULT_MESSAGES = {
  [ERROR_CODES.INTERNAL_ERROR]: "Unexpected server error. Please try again later.",
  [ERROR_CODES.VALIDATION_ERROR]: "Invalid request. Please review your input.",
  [ERROR_CODES.RESOURCE_NOT_FOUND]: "The requested resource was not found.",
  [ERROR_CODES.AUTH_REQUIRED]: "Authentication is required to perform this action.",
  [ERROR_CODES.ROUTE_NOT_FOUND]: "The requested route was not found.",
  [ERROR_CODES.USER_UNIQUE_CONFLICT]: "This value is already in use.",
  [ERROR_CODES.WORKSPACE_UNIQUE_CONFLICT]: "This workspace identifier is already in use.",
  [ERROR_CODES.NOTE_NOT_FOUND]: "Note not found.",
  [ERROR_CODES.FILE_TOO_LARGE]: "Attached file exceeds the allowed size.",
  [ERROR_CODES.INVALID_FILE_TYPE]: "Attached file type is not allowed.",
};

module.exports = { DEFAULT_MESSAGES, ERROR_CODES };
