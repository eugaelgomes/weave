const { MailService } = require("@/services/email/config");
const { buildMailTemplate, escapeHtml } = require("@/services/email/mail-template");
const { getUserEmailLocale, resolveEmailLocale, t } = require("@/services/email/i18n");

/**
 * Queues a generic one-time verification code email.
 *
 * @param {{code: string, email: string, localeHint?: string, name?: string}} params
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function send_code({ code, email, localeHint, name }) {
  const locale = localeHint ? resolveEmailLocale(localeHint) : await getUserEmailLocale({ email });
  const displayName = name || t(locale, "common.greetingFallback");

  try {
    const { html, text: templateText } = buildMailTemplate({
      contentHtml: `
        <div style="margin: 20px 0; padding: 18px; border: 1px solid #E5E7EB; border-radius: 12px; background: #F9FAFB; text-align: center;">
          <div style="font-size: 32px; font-weight: 700; letter-spacing: 0.35em; color: #111827;">${escapeHtml(code)}</div>
        </div>
      `,
      greeting: `${displayName},`,
      infoText: t(locale, "verificationCode.info"),
      introLines: [t(locale, "verificationCode.intro")],
      locale,
      outroLines: [t(locale, "verificationCode.outro")],
      preheader: t(locale, "verificationCode.preheader"),
      subtitle: t(locale, "verificationCode.subtitle"),
      title: t(locale, "verificationCode.title"),
    });

    const text = `${templateText}\n\n${t(locale, "verificationCode.codeLabel")}: ${code}`;

    await MailService().sendMail({
      from: process.env.EMAIL_FROM,
      html,
      subject: t(locale, "verificationCode.subject"),
      text,
      to: email,
    });

    return { success: true };
  } catch (error) {
    console.error("Verification code email failed:", error);
    return { error: error.message || "Failed to send verification code email.", success: false };
  }
}

module.exports = { send_code };
