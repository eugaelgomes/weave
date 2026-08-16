const { MailService } = require("@/services/email/config");
const { buildMailTemplate, escapeHtml } = require("@/services/email/mail-template");
const { getUserEmailLocale, t } = require("@/services/email/i18n");

/**
 * @param {string} toEmail
 * @param {string} organizationName
 * @param {string} homeUrl
 */
async function send_organization_invite_accepted(toEmail, organizationName, homeUrl) {
  const locale = await getUserEmailLocale({ email: toEmail });
  const safeOrg = organizationName || t(locale, "common.organization");

  try {
    const { html, text } = buildMailTemplate({
      contentHtml: `
        <div style="margin: 16px 0; padding: 14px; border: 1px solid #E5E7EB; border-radius: 8px; background: #F9FAFB;">
          <p style="margin: 0 0 6px; font-size: 14px; color: #111827;"><strong>${escapeHtml(t(locale, "common.organization"))}:</strong> ${escapeHtml(safeOrg)}</p>
          <p style="margin: 0; font-size: 13px; color: #374151;">${escapeHtml(t(locale, "inviteAccepted.featuresIntro"))}</p>
          <ul style="margin: 8px 0 0 18px; padding: 0; color: #374151; font-size: 13px; line-height: 1.6;">
            <li>${escapeHtml(t(locale, "inviteAccepted.feature1"))}</li>
            <li>${escapeHtml(t(locale, "inviteAccepted.feature2"))}</li>
            <li>${escapeHtml(t(locale, "inviteAccepted.feature3"))}</li>
            <li>${escapeHtml(t(locale, "inviteAccepted.feature4"))}</li>
          </ul>
        </div>
      `,
      ctaText: t(locale, "inviteAccepted.cta"),
      ctaUrl: homeUrl,
      introLines: [t(locale, "inviteAccepted.intro1"), t(locale, "inviteAccepted.intro2")],
      locale,
      preheader: t(locale, "inviteAccepted.preheader"),
      subtitle: t(locale, "inviteAccepted.subtitle"),
      title: t(locale, "inviteAccepted.title", { organizationName: safeOrg }),
    });

    await MailService().sendMail({
      from: process.env.EMAIL_FROM,
      html,
      subject: t(locale, "inviteAccepted.subject", {
        organizationName: safeOrg,
      }),
      text,
      to: toEmail,
    });

    return { success: true };
  } catch (error) {
    console.error("Invite accepted email failed:", error);
    return { error: error.message, success: false };
  }
}

module.exports = { send_organization_invite_accepted };
