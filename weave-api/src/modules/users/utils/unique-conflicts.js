/**
 * @typedef {"email"|"username"|"phone_number"} UniqueUserField
 */

/**
 * @param {unknown} value
 * @returns {boolean}
 */
const isNonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;

/**
 * @param {UniqueUserField} field
 * @returns {string}
 */
const getUniqueFieldMessage = (field) => {
  if (field === "email") return "Email already in use";
  if (field === "username") return "Username already in use";
  return "Phone number already in use";
};

/**
 * @param {UniqueUserField} field
 * @returns {{code: string, field: UniqueUserField, message: string, conflicts: Record<UniqueUserField, {available: boolean, reason: string}>}}
 */
const buildUniqueConflictPayload = (field) => ({
  code: "USER_UNIQUE_CONFLICT",
  conflicts: {
    [field]: {
      available: false,
      reason: "already_in_use",
    },
  },
  field,
  message: getUniqueFieldMessage(field),
});

/**
 * @param {unknown} rawValue
 * @returns {string|null}
 */
const normalizeEmail = (rawValue) => {
  if (!isNonEmptyString(rawValue)) return null;
  return rawValue.trim().toLowerCase();
};

/**
 * @param {unknown} rawValue
 * @returns {string|null}
 */
const normalizeUsername = (rawValue) => {
  if (!isNonEmptyString(rawValue)) return null;
  return rawValue.trim();
};

/**
 * @param {unknown} rawValue
 * @returns {string|null}
 */
const normalizePhoneNumber = (rawValue) => {
  if (!isNonEmptyString(rawValue)) return null;
  return rawValue.trim();
};

/**
 * @param {Error & { code?: string, constraint?: string, detail?: string }} error
 * @returns {UniqueUserField|null}
 */
const getUniqueFieldFromPgError = (error) => {
  if (!error || error.code !== "23505") return null;

  const constraint = String(error.constraint || "").toLowerCase();

  // Explicit validation by constraint name
  if (constraint === "users_email_key" || constraint === "uq_users_email_lower") {
    return "email";
  }

  if (constraint === "users_username_key") {
    return "username";
  }

  if (constraint === "users_phone_number_key" || constraint === "phone_number") {
    return "phone_number";
  }

  // Fallback to detail string matching for legacy migrations
  const detail = String(error.detail || "").toLowerCase();

  if (detail.includes("(email)") || detail.includes("lower(email)")) {
    return "email";
  }

  if (detail.includes("(username)")) {
    return "username";
  }

  if (detail.includes("(phone_number)")) {
    return "phone_number";
  }

  return null;
};

module.exports = {
  buildUniqueConflictPayload,
  getUniqueFieldFromPgError,
  normalizeEmail,
  normalizePhoneNumber,
  normalizeUsername,
};
