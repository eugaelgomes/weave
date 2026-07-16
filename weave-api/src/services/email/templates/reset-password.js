const { MailService } = require("@/services/email/config");
const {
  buildMailTemplate,
  escapeHtml,
} = require("@/services/email/mail-template");
const { getUserEmailLocale, t } = require("@/services/email/i18n");

/**
 * @param {string} currentEmail
 * @param {string} newEmail
 * @param {string} token
 */
async function sendEmailChangeValidation(currentEmail, newEmail, token) {
  const locale = await getUserEmailLocale({ email: currentEmail });
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  const validationLink = `${frontendUrl}/auth/validate-email?token=${token}`;

  try {
    const { html, text } = buildMailTemplate({
      contentHtml: `
        <div style="margin: 16px 0; padding: 14px; border: 1px solid #E5E7EB; border-radius: 8px; background: #F9FAFB;">
          <p style="margin: 0 0 6px; font-size: 14px; color: #111827;"><strong>${escapeHtml(t(locale, "common.currentEmail"))}:</strong> ${escapeHtml(currentEmail)}</p>
          <p style="margin: 0; font-size: 14px; color: #111827;"><strong>${escapeHtml(t(locale, "common.newEmail"))}:</strong> ${escapeHtml(newEmail)}</p>
        </div>
      `,
      ctaText: t(locale, "reset.cta"),
      ctaUrl: validationLink,
      infoText: t(locale, "reset.info"),
      introLines: [t(locale, "reset.intro1"), t(locale, "reset.intro2")],
      locale,
      outroLines: [t(locale, "reset.outro")],
      preheader: t(locale, "reset.preheader"),
      subtitle: t(locale, "reset.subtitle"),
      title: t(locale, "reset.title"),
    });

    await MailService().sendMail({
      from: process.env.EMAIL_FROM,
      html,
      subject: t(locale, "reset.subject"),
      text,
      to: newEmail,
    });

    return { success: true };
  } catch (error) {
    console.error("Error sending email change validation:", error);
    return { error: "Failed to send validation email.", success: false };
  }
}

module.exports = { sendEmailChangeValidation };
