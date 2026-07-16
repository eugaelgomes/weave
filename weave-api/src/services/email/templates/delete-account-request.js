const { MailService } = require("@/services/email/config");
const {
  buildMailTemplate,
  escapeHtml,
} = require("@/services/email/mail-template");
const {
  formatDateForLocale,
  getUserEmailLocale,
  t,
} = require("@/services/email/i18n");

/**
 * @param {string} nome
 * @param {string} email
 * @param {string} username
 * @param {string} token
 */
async function delete_account_request(nome, email, username, token) {
  const locale = await getUserEmailLocale({ email });

  try {
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const confirmationLink = `${frontendUrl}/auth/confirm-delete-account?token=${token}`;
    const expiration = formatDateForLocale(
      locale,
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      { dateStyle: "medium", timeStyle: undefined, timeZone: undefined }
    );

    const displayName = nome || t(locale, "common.greetingFallback");

    const { html, text } = buildMailTemplate({
      contentHtml: `
        <div style="margin: 16px 0; padding: 14px; border: 1px solid #E5E7EB; border-radius: 8px; background: #F9FAFB;">
          <p style="margin: 0 0 6px; font-size: 14px; color: #111827;"><strong>${escapeHtml(t(locale, "common.username"))}:</strong> ${escapeHtml(username)}</p>
          <p style="margin: 0; font-size: 13px; color: #6B7280;">${escapeHtml(t(locale, "deleteRequest.bodyDetail"))}</p>
        </div>
      `,
      ctaText: t(locale, "deleteRequest.cta"),
      ctaUrl: confirmationLink,
      footerNote: t(locale, "deleteRequest.footer"),
      greeting: `${displayName},`,
      infoText: t(locale, "deleteRequest.info", { expiration }),
      introLines: [
        t(locale, "deleteRequest.intro1"),
        t(locale, "deleteRequest.intro2"),
      ],
      locale,
      outroLines: [t(locale, "deleteRequest.outro")],
      preheader: t(locale, "deleteRequest.preheader"),
      subtitle: t(locale, "deleteRequest.subtitle"),
      title: t(locale, "deleteRequest.title"),
    });

    await MailService().sendMail({
      from: process.env.EMAIL_FROM,
      html,
      subject: t(locale, "deleteRequest.subject"),
      text,
      to: email,
    });

    return { success: true };
  } catch (error) {
    console.error("Delete account request email failed:", error);
    return {
      error:
        error.message ||
        "Failed to send delete account confirmation request email.",
      success: false,
    };
  }
}

module.exports = { delete_account_request };
