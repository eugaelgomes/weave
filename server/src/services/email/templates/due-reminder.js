const { MailService } = require("@/services/email/config");
const { buildMailTemplate, escapeHtml } = require("@/services/email/mail-template");
const {
  formatDateForLocale,
  getUserEmailLocale,
  resolveEmailLocale,
  t,
} = require("@/services/email/i18n");

/**
 * @param {object} params
 * @returns {{ subject: string, html: string, text: string }}
 */
function buildDueReminderTemplate({ locale, recipientName, noteTitle, dueDateLabel, noteUrl }) {
  const resolvedLocale = resolveEmailLocale(locale);
  const displayName = recipientName || t(resolvedLocale, "common.greetingFallback");
  const safeTitle = noteTitle || t(resolvedLocale, "dueReminder.untitled");

  const subject = t(resolvedLocale, "dueReminder.subject", {
    noteTitle: safeTitle,
  });
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

/**
 * @param {string} toEmail
 * @param {string} recipientName
 * @param {string} noteTitle
 * @param {Date|string} dueDate
 * @param {string|null} [notePublicId]
 */
async function sendDueReminderEmail(
  toEmail,
  recipientName,
  noteTitle,
  dueDate,
  notePublicId = null
) {
  try {
    const locale = await getUserEmailLocale({ email: toEmail });
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const notePath = notePublicId ? `/app/notes/${notePublicId}` : "/app/notes";
    const noteUrl = `${frontendUrl}/auth/?redirect=${encodeURIComponent(notePath)}`;

    const dueDateLabel = formatDateForLocale(locale, dueDate);

    const emailTemplate = buildDueReminderTemplate({
      dueDateLabel,
      locale,
      noteTitle,
      noteUrl,
      recipientName,
    });

    await MailService().sendMail({
      from: process.env.EMAIL_FROM,
      html: emailTemplate.html,
      subject: emailTemplate.subject,
      text: emailTemplate.text,
      to: toEmail,
    });

    return { success: true };
  } catch (error) {
    return {
      error: error.message || "Falha ao enviar lembrete de prazo.",
      success: false,
    };
  }
}

module.exports = { buildDueReminderTemplate, sendDueReminderEmail };
