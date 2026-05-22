const { MailService } = require("@/services/email/config");
const {
  buildMailTemplate,
  escapeHtml,
} = require("@/services/email/mail-template");
const { formatDateForLocale, getUserEmailLocale, t } = require("@/services/email/i18n");

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
      locale,
      preheader: t(locale, "deleteRequest.preheader"),
      title: t(locale, "deleteRequest.title"),
      subtitle: t(locale, "deleteRequest.subtitle"),
      greeting: `${displayName},`,
      introLines: [
        t(locale, "deleteRequest.intro1"),
        t(locale, "deleteRequest.intro2"),
      ],
      ctaText: t(locale, "deleteRequest.cta"),
      ctaUrl: confirmationLink,
      infoText: t(locale, "deleteRequest.info", { expiration }),
      contentHtml: `
        <div style="margin: 16px 0; padding: 14px; border: 1px solid #E5E7EB; border-radius: 8px; background: #F9FAFB;">
          <p style="margin: 0 0 6px; font-size: 14px; color: #111827;"><strong>${escapeHtml(t(locale, "common.username"))}:</strong> ${escapeHtml(username)}</p>
          <p style="margin: 0; font-size: 13px; color: #6B7280;">${escapeHtml(t(locale, "deleteRequest.bodyDetail"))}</p>
        </div>
      `,
      outroLines: [t(locale, "deleteRequest.outro")],
      footerNote: t(locale, "deleteRequest.footer"),
    });

    await MailService().sendMail({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: t(locale, "deleteRequest.subject"),
      text,
      html,
    });

    return { success: true };
  } catch (error) {
    console.error("Delete account request email failed:", error);
    return {
      success: false,
      error:
        error.message ||
        "Failed to send delete account confirmation request email.",
    };
  }
}

module.exports = { delete_account_request };
