/**
 * keep in sync with weave-api/src/services/email/templates/due-reminder.js
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
 * @returns {{ subject: string, html: string, text: string }}
 */
function buildDueReminderTemplate({
  locale,
  userPreference,
  recipientName,
  noteTitle,
  dueDate,
  noteUrl,
}) {
  const resolvedLocale = locale
    ? resolveEmailLocale(locale)
    : localeFromUserPreference(userPreference);

  const displayName =
    recipientName || t(resolvedLocale, "common.greetingFallback");
  const safeTitle = noteTitle || t(resolvedLocale, "dueReminder.untitled");
  const dueDateLabel = formatDateForLocale(resolvedLocale, dueDate);

  const subject = t(resolvedLocale, "dueReminder.subject", { noteTitle: safeTitle });
  const { html, text } = buildMailTemplate({
    contentHtml: `
      <div style="margin: 16px 0; padding: 14px; border: 1px solid #E5E7EB; border-radius: 8px; background: #F9FAFB;">
        <p style="margin: 0 0 6px; font-size: 14px; color: #111827;"><strong>${escapeHtml(t(resolvedLocale, "common.note"))}:</strong> ${escapeHtml(safeTitle)}</p>
        <p style="margin: 0; font-size: 14px; color: #111827;"><strong>${escapeHtml(t(resolvedLocale, "common.dueDate"))}:</strong> ${escapeHtml(dueDateLabel)}</p>
      </div>
    `,
    ctaText: t(resolvedLocale, "dueReminder.cta"),
    ctaUrl: noteUrl,
    greeting: `${displayName},`,
    infoText: t(resolvedLocale, "dueReminder.info"),
    introLines: [
      t(resolvedLocale, "dueReminder.intro", {
        dueDateLabel,
        noteTitle: safeTitle,
      }),
    ],
    locale: resolvedLocale,
    preheader: t(resolvedLocale, "dueReminder.preheader"),
    subtitle: t(resolvedLocale, "dueReminder.subtitle"),
    title: t(resolvedLocale, "dueReminder.title"),
  });

  return { html, subject, text };
}

module.exports = { buildDueReminderTemplate };
