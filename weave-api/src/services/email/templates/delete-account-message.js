const { MailService } = require("@/services/email/config");
const {
  buildMailTemplate,
  escapeHtml,
} = require("@/services/email/mail-template");
const { getUserEmailLocale, t } = require("@/services/email/i18n");

/**
 * @param {string} nome
 * @param {string} email
 * @param {string} username
 */
async function delete_account_notification(nome, email, username) {
  const locale = await getUserEmailLocale({ email });
  const displayName = nome || t(locale, "common.greetingFallback");

  try {
    const { html, text } = buildMailTemplate({
      locale,
      preheader: t(locale, "deleteMessage.preheader"),
      title: t(locale, "deleteMessage.title"),
      subtitle: t(locale, "deleteMessage.subtitle"),
      greeting: `${displayName},`,
      introLines: [t(locale, "deleteMessage.intro")],
      contentHtml: `
        <div style="margin: 16px 0; padding: 14px; border: 1px solid #E5E7EB; border-radius: 8px; background: #F9FAFB;">
          <p style="margin: 0 0 6px; font-size: 14px; color: #111827;"><strong>${escapeHtml(t(locale, "deleteMessage.bodyUser"))}:</strong> ${escapeHtml(username)}</p>
          <p style="margin: 0; font-size: 13px; color: #6B7280;">${escapeHtml(t(locale, "deleteMessage.bodyDetail"))}</p>
        </div>
      `,
      outroLines: [t(locale, "deleteMessage.outro")],
      footerNote: t(locale, "deleteMessage.footer"),
    });

    await MailService().sendMail({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: t(locale, "deleteMessage.subject"),
      text,
      html,
    });

    return { success: true };
  } catch (error) {
    console.error("Delete account email failed:", error);
    return {
      success: false,
      error:
        error.message || "Failed to send delete account notification email.",
    };
  }
}

module.exports = { delete_account_notification };
