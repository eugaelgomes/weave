const { MailService } = require("@/services/email/config");
const { buildMailTemplate } = require("@/services/email/mail-template");
const { getUserEmailLocale, t } = require("@/services/email/i18n");

/**
 * @param {string} email
 * @param {string} token
 * @param {string} name
 */
async function mail_rescue_pass(email, token, name) {
  const locale = await getUserEmailLocale({ email });
  const env = process.env.NODE_ENV || "development";
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  const resetLink =
    env === "production"
      ? `${frontendUrl}/auth/reset-password?token=${token}`
      : `${frontendUrl}/auth/reset-password?reset_token=${token}`;

  const displayName = name || t(locale, "common.greetingFallback");

  try {
    const { html, text } = buildMailTemplate({
      locale,
      preheader: t(locale, "rescue.preheader"),
      title: t(locale, "rescue.title"),
      subtitle: t(locale, "rescue.subtitle"),
      greeting: `${displayName},`,
      introLines: [t(locale, "rescue.intro1"), t(locale, "rescue.intro2")],
      ctaText: t(locale, "rescue.cta"),
      ctaUrl: resetLink,
      infoText: t(locale, "rescue.info"),
      outroLines: [t(locale, "rescue.outro")],
    });

    await MailService().sendMail({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: t(locale, "rescue.subject"),
      text,
      html,
    });

    return { success: true };
  } catch (error) {
    console.error("Password recovery email failed:", error);
    return {
      success: false,
      error: error.message || "Failed to send password recovery email.",
    };
  }
}

module.exports = { mail_rescue_pass };
