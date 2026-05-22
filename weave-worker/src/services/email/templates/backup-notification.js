/**
 * keep in sync with weave-api/src/services/email/templates/backup-notification.js
 */

const {
  buildMailTemplate,
  escapeHtml,
} = require("../template");
const {
  formatDateForLocale,
  localeFromUserPreference,
  resolveEmailLocale,
  t,
} = require("../i18n");

/**
 * @param {object} params
 * @returns {{ html: string, text: string, subject: string }}
 */
function buildBackupEmailPayload({
  locale,
  userName,
  downloadUrl,
  expiresAt,
  userPreference,
}) {
  const resolvedLocale = locale
    ? resolveEmailLocale(locale)
    : localeFromUserPreference(userPreference);

  const hoursUntilExpiration = Math.max(
    1,
    Math.round((new Date(expiresAt) - new Date()) / (1000 * 60 * 60))
  );
  const expiresLabel = formatDateForLocale(resolvedLocale, expiresAt, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: undefined,
  });
  const displayName = userName || t(resolvedLocale, "common.greetingFallback");

  const { html, text } = buildMailTemplate({
    locale: resolvedLocale,
    preheader: t(resolvedLocale, "backup.preheader"),
    title: t(resolvedLocale, "backup.title"),
    subtitle: t(resolvedLocale, "backup.subtitle"),
    greeting: `${displayName},`,
    introLines: [
      t(resolvedLocale, "backup.intro1"),
      t(resolvedLocale, "backup.intro2"),
    ],
    ctaText: t(resolvedLocale, "backup.cta"),
    ctaUrl: downloadUrl,
    infoText: t(resolvedLocale, "backup.info", {
      hours: hoursUntilExpiration,
      expiresLabel,
    }),
    contentHtml: `
      <div style="margin: 16px 0; padding: 14px; border: 1px solid #E5E7EB; border-radius: 8px; background: #F9FAFB;">
        <p style="margin: 0 0 8px; font-size: 14px; color: #111827;"><strong>${escapeHtml(t(resolvedLocale, "common.format"))}:</strong> ${escapeHtml(t(resolvedLocale, "common.formatCsv"))}</p>
        <p style="margin: 0; font-size: 14px; color: #111827;"><strong>${escapeHtml(t(resolvedLocale, "common.content"))}:</strong> ${escapeHtml(t(resolvedLocale, "common.contentNotesBlocks"))}</p>
      </div>
    `,
    outroLines: [t(resolvedLocale, "backup.outro")],
  });

  return {
    html,
    text,
    subject: t(resolvedLocale, "backup.subject"),
  };
}

module.exports = { buildBackupEmailPayload };
