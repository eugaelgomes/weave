const { MailService } = require("@/services/email/config");
const { buildMailTemplate, escapeHtml } = require("@/services/email/mail-template");
const {
  resolveEmailLocale,
  resolveEmailLocaleFromAcceptLanguage,
  t,
} = require("@/services/email/i18n");

/**
 * @param {string} nome
 * @param {string} email
 * @param {string} username
 * @param {string} activationToken
 * @param {string} [acceptLanguage]
 * @param {string} [localeHint]
 */
async function welcome_message(nome, email, username, activationToken, acceptLanguage, localeHint) {
  const locale = localeHint
    ? resolveEmailLocale(localeHint)
    : resolveEmailLocaleFromAcceptLanguage(acceptLanguage);

  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  const encodedEmail = encodeURIComponent(email);
  const activationLink = `${frontendUrl}/auth/?view=confirm&token=${activationToken}&email=${encodedEmail}`;

  const displayName = nome || t(locale, "common.greetingFallback");

  try {
    const { html, text } = buildMailTemplate({
      contentHtml: `
        <div style="margin: 14px 0; padding: 14px; border: 1px solid #E5E7EB; border-radius: 8px; background: #F9FAFB;">
          <p style="margin: 0; font-size: 14px; color: #111827;"><strong>${escapeHtml(t(locale, "common.username"))}:</strong> ${escapeHtml(username || "-")}</p>
        </div>
      `,
      ctaText: t(locale, "welcome.cta"),
      ctaUrl: activationLink,
      footerNote: t(locale, "welcome.footer"),
      greeting: `${displayName},`,
      infoText: t(locale, "welcome.info"),
      introLines: [t(locale, "welcome.intro1"), t(locale, "welcome.intro2")],
      locale,
      outroLines: [t(locale, "welcome.outro1")],
      preheader: t(locale, "welcome.preheader"),
      subtitle: t(locale, "welcome.subtitle"),
      title: t(locale, "welcome.title"),
    });

    await MailService().sendMail({
      from: process.env.EMAIL_FROM,
      html,
      subject: t(locale, "welcome.subject"),
      text,
      to: email,
    });

    return { success: true };
  } catch (error) {
    console.error("Welcome email failed:", error);
    return {
      error: error.message || "Failed to send welcome email.",
      success: false,
    };
  }
}

module.exports = { welcome_message };
