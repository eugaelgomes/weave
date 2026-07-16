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
      ctaText: t(locale, "rescue.cta"),
      ctaUrl: resetLink,
      greeting: `${displayName},`,
      infoText: t(locale, "rescue.info"),
      introLines: [t(locale, "rescue.intro1"), t(locale, "rescue.intro2")],
      locale,
      outroLines: [t(locale, "rescue.outro")],
      preheader: t(locale, "rescue.preheader"),
      subtitle: t(locale, "rescue.subtitle"),
      title: t(locale, "rescue.title"),
    });

    await MailService().sendMail({
      from: process.env.EMAIL_FROM,
      html,
      subject: t(locale, "rescue.subject"),
      text,
      to: email,
    });

    return { success: true };
  } catch (error) {
    console.error("Password recovery email failed:", error);
    return {
      error: error.message || "Failed to send password recovery email.",
      success: false,
    };
  }
}

module.exports = { mail_rescue_pass };
