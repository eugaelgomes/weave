const { MailService } = require("@/services/email/config");
const {
  buildMailTemplate,
  escapeHtml,
} = require("@/services/email/mail-template");
const { getUserEmailLocale, t } = require("@/services/email/i18n");

/**
 * @param {object} params
 * @param {string} params.locale
 * @param {string} params.noteName
 * @param {string} params.ownerName
 * @param {string} params.noteUrl
 */
function createCollabTemplate({ locale, noteName, ownerName, noteUrl }) {
  const subject = t(locale, "collab.subject", { noteName });
  const { html, text } = buildMailTemplate({
    locale,
    preheader: t(locale, "collab.preheader"),
    title: t(locale, "collab.title"),
    subtitle: t(locale, "collab.subtitle"),
    introLines: [t(locale, "collab.intro", { ownerName })],
    ctaText: t(locale, "collab.cta"),
    ctaUrl: noteUrl,
    contentHtml: `
      <div style="margin: 16px 0; padding: 14px; border: 1px solid #E5E7EB; border-radius: 8px; background: #F9FAFB;">
        <p style="margin: 0 0 6px; font-size: 14px; color: #111827;"><strong>${escapeHtml(t(locale, "common.note"))}:</strong> ${escapeHtml(noteName)}</p>
        <p style="margin: 0; font-size: 13px; color: #6B7280;">${escapeHtml(t(locale, "collab.permission"))}</p>
      </div>
    `,
    outroLines: [t(locale, "collab.outro", { ownerName })],
  });

  return { subject, html, text };
}

/**
 * @param {string} collaboratorEmail
 * @param {string} collaboratorName
 * @param {string} noteName
 * @param {string} ownerName
 * @param {string|null} [notePublicId]
 */
async function collabMail(
  collaboratorEmail,
  collaboratorName,
  noteName,
  ownerName,
  notePublicId = null
) {
  try {
    const locale = await getUserEmailLocale({ email: collaboratorEmail });
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const notePath = notePublicId
      ? `/app/notes/view/${notePublicId}`
      : "/app/notes";
    const noteUrl = `${frontendUrl}/auth/?redirect=${encodeURIComponent(notePath)}`;

    const emailTemplate = createCollabTemplate({
      locale,
      noteName,
      ownerName,
      noteUrl,
    });

    await MailService().sendMail({
      from: process.env.EMAIL_FROM,
      to: collaboratorEmail,
      subject: emailTemplate.subject,
      text: emailTemplate.text,
      html: emailTemplate.html,
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error.message || "Falha ao enviar email de notificacao.",
    };
  }
}

module.exports = { collabMail, createCollabTemplate };
