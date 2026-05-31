const { MailService } = require("@/services/email/config");
const {
  buildMailTemplate,
  escapeHtml,
} = require("@/services/email/mail-template");
const {
  getRoleLabel,
  resolveEmailLocale,
  t,
} = require("@/services/email/i18n");
const { buildAuthInviteUrl } = require("@/utils/frontend-url");

/**
 * @param {string} invitedEmail
 * @param {string} organizationName
 * @param {string} inviterName
 * @param {string} inviteToken
 * @param {string} role
 * @param {string} [inviterLocale]
 */
async function send_organization_invite(
  invitedEmail,
  organizationName,
  inviterName,
  inviteToken,
  role,
  inviterLocale
) {
  const locale = resolveEmailLocale(inviterLocale);
  const acceptInviteLink = buildAuthInviteUrl(inviteToken);
  const translatedRole = getRoleLabel(locale, role);

  try {
    const { html, text } = buildMailTemplate({
      locale,
      preheader: t(locale, "invite.preheader"),
      title: t(locale, "invite.title"),
      subtitle: t(locale, "invite.subtitle"),
      introLines: [
        t(locale, "invite.intro", { inviterName, organizationName }),
      ],
      ctaText: t(locale, "invite.cta"),
      ctaUrl: acceptInviteLink,
      infoText: t(locale, "invite.info"),
      contentHtml: `
        <div style="margin: 16px 0; padding: 14px; border: 1px solid #E5E7EB; border-radius: 8px; background: #F9FAFB;">
          <p style="margin: 0 0 6px; font-size: 14px; color: #111827;"><strong>${escapeHtml(t(locale, "common.organization"))}:</strong> ${escapeHtml(organizationName)}</p>
          <p style="margin: 0; font-size: 14px; color: #111827;"><strong>${escapeHtml(t(locale, "common.role"))}:</strong> ${escapeHtml(translatedRole)}</p>
        </div>
      `,
    });

    await MailService().sendMail({
      from: process.env.EMAIL_FROM,
      to: invitedEmail,
      subject: t(locale, "invite.subject", { organizationName }),
      text,
      html,
    });

    return { success: true };
  } catch (error) {
    console.error("Organization invite email failed:", error);
    return { success: false, error: error.message };
  }
}

module.exports = { send_organization_invite };
