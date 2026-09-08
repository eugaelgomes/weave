const { MailService } = require("@/services/email/config");
const { buildMailTemplate, escapeHtml } = require("@/services/email/mail-template");
const { getUserEmailLocale, t } = require("@/services/email/i18n");

/**
 * @param {string} email
 * @param {string} code
 * @param {string} name
 */
async function mail_login_code(email, code, name) {
  const locale = await getUserEmailLocale({ email });
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  const loginUrl = `${frontendUrl}/auth/?view=signin&login=${encodeURIComponent(
    email
  )}&code=${encodeURIComponent(code)}`;
  const displayName = name || t(locale, "common.greetingFallback");

  try {
    const { html, text } = buildMailTemplate({
      contentHtml: `
        <div style="margin: 20px 0; padding: 18px; border: 1px solid #E5E7EB; border-radius: 12px; background: #F9FAFB; text-align: center;">
          <div style="font-size: 32px; font-weight: 700; letter-spacing: 0.35em; color: #111827;">${escapeHtml(
            code
          )}</div>
        </div>
      `,
      ctaText: t(locale, "loginCode.cta"),
      ctaUrl: loginUrl,
      greeting: `${displayName},`,
      infoText: t(locale, "loginCode.info"),
      introLines: [t(locale, "loginCode.intro1"), t(locale, "loginCode.intro2")],
      locale,
      outroLines: [t(locale, "loginCode.outro")],
      preheader: t(locale, "loginCode.preheader"),
      subtitle: t(locale, "loginCode.subtitle"),
      title: t(locale, "loginCode.title"),
    });

    await MailService().sendMail({
      from: process.env.EMAIL_FROM,
      html,
      subject: t(locale, "loginCode.subject"),
      text,
      to: email,
    });

    return { success: true };
  } catch (error) {
    console.error("Login code email failed:", error);
    return {
      error: error.message || "Failed to send login code email.",
      success: false,
    };
  }
}

module.exports = { mail_login_code };
