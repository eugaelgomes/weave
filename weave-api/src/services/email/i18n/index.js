/**
 * Email i18n — keep in sync with weave-worker/src/services/email/i18n/
 */

const { executeQuery } = require("@/database/connection");

const ptBR = require("./locales/pt-br");
const enUS = require("./locales/en-us");
const esES = require("./locales/es-es");

/** @typedef {"pt-BR"|"en-US"|"es-ES"} EmailLocale */

const LOCALES = /** @type {const} */ ({
  "pt-BR": ptBR,
  "en-US": enUS,
  "es-ES": esES,
});

const DEFAULT_LOCALE = /** @type {EmailLocale} */ ("pt-BR");

/**
 * @param {unknown} raw
 * @returns {EmailLocale}
 */
function resolveEmailLocale(raw) {
  if (!raw || typeof raw !== "string") {
    return DEFAULT_LOCALE;
  }

  const normalized = raw.trim().replace(/_/g, "-");

  if (normalized in LOCALES) {
    return /** @type {EmailLocale} */ (normalized);
  }

  const lower = normalized.toLowerCase();

  if (lower.startsWith("pt")) return "pt-BR";
  if (lower.startsWith("en")) return "en-US";
  if (lower.startsWith("es")) return "es-ES";

  return DEFAULT_LOCALE;
}

/**
 * @param {string} acceptLanguage
 * @returns {EmailLocale}
 */
function resolveEmailLocaleFromAcceptLanguage(acceptLanguage) {
  if (!acceptLanguage || typeof acceptLanguage !== "string") {
    return DEFAULT_LOCALE;
  }

  const parts = acceptLanguage.split(",").map((p) => p.trim().split(";")[0]);
  for (const part of parts) {
    const resolved = resolveEmailLocale(part);
    if (resolved !== DEFAULT_LOCALE || part.toLowerCase().startsWith("pt")) {
      return resolved;
    }
  }

  return resolveEmailLocale(parts[0]);
}

/**
 * @param {EmailLocale} locale
 * @param {string} key
 * @param {Record<string, string|number>} [vars]
 * @returns {string}
 */
function t(locale, key, vars = {}) {
  const catalog = LOCALES[locale] || LOCALES[DEFAULT_LOCALE];
  let text = catalog[key] || LOCALES[DEFAULT_LOCALE][key] || key;

  for (const [name, value] of Object.entries(vars)) {
    text = text.replace(new RegExp(`\\{${name}\\}`, "g"), String(value));
  }

  return text;
}

/**
 * @param {EmailLocale} locale
 * @param {string} role
 * @returns {string}
 */
function getRoleLabel(locale, role) {
  const key = `role.${role}`;
  const label = t(locale, key);
  return label === key ? role : label;
}

/**
 * @param {EmailLocale} locale
 * @param {string} reportType
 * @returns {string}
 */
function getReportTypeLabel(locale, reportType) {
  const key = `reportType.${reportType}`;
  const label = t(locale, key);
  return label === key ? t(locale, "reportType.default") : label;
}

/**
 * @param {object} [params]
 * @param {string|number} [params.userId]
 * @param {string} [params.email]
 * @returns {Promise<EmailLocale>}
 */
async function getUserEmailLocale({ userId, email } = {}) {
  if (!userId && !email) {
    return DEFAULT_LOCALE;
  }

  const rows = await executeQuery(
    `
      SELECT user_preference
      FROM users
      WHERE deleted = false
        AND (
          ($1::uuid IS NOT NULL AND user_id = $1::uuid)
          OR ($2::text IS NOT NULL AND LOWER(email) = LOWER($2::text))
        )
      LIMIT 1
    `,
    [userId || null, email || null]
  );

  const prefs = rows[0]?.user_preference;
  const interfaceLocale =
    prefs && typeof prefs === "object" && prefs.language
      ? prefs.language.interface
      : undefined;

  return resolveEmailLocale(interfaceLocale);
}

/**
 * @param {EmailLocale} locale
 * @param {string|Date} value
 * @param {Intl.DateTimeFormatOptions} [options]
 * @returns {string}
 */
function formatDateForLocale(locale, value, options = {}) {
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleString(locale, {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "UTC",
    ...options,
  });
}

module.exports = {
  DEFAULT_LOCALE,
  formatDateForLocale,
  getReportTypeLabel,
  getRoleLabel,
  getUserEmailLocale,
  resolveEmailLocale,
  resolveEmailLocaleFromAcceptLanguage,
  t,
};
