const { MailService } = require("@/services/email/config");
const {
  buildMailTemplate,
  escapeHtml,
} = require("@/services/email/mail-template");
const { getUserEmailLocale, t } = require("@/services/email/i18n");

const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

/**
 * @param {string} nome
 * @param {string} email
 * @param {string} projectName
 * @param {string} projectId
 * @param {string} addedByName
 */
async function inviteProjectMember(
  nome,
  email,
  projectName,
  projectId,
  addedByName
) {
  const locale = await getUserEmailLocale({ email });
  const firstName = (nome || "").split(" ")[0] || t(locale, "common.greetingFallback");
  const projectUrl = `${frontendUrl}/app/home`;

  const safeProjectName = projectName || t(locale, "project.untitled");

  try {
    const { html, text } = buildMailTemplate({
      locale,
      preheader: t(locale, "project.preheader"),
      title: t(locale, "project.title"),
      subtitle: t(locale, "project.subtitle"),
      greeting: `${firstName},`,
      introLines: [
        t(locale, "project.intro", { addedByName }),
      ],
      ctaText: t(locale, "project.cta"),
      ctaUrl: projectUrl,
      contentHtml: `
        <div style="margin: 16px 0; padding: 14px; border: 1px solid #E5E7EB; border-radius: 8px; background: #F9FAFB;">
          <p style="margin: 0; font-size: 14px; color: #111827;"><strong>${escapeHtml(t(locale, "common.project"))}:</strong> ${escapeHtml(safeProjectName)}</p>
        </div>
      `,
      outroLines: [t(locale, "project.outro")],
      footerNote: t(locale, "project.footer"),
    });

    await MailService().sendMail({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: t(locale, "project.subject", {
        firstName,
        projectName: safeProjectName,
      }),
      text,
      html,
    });

    return { success: true };
  } catch (error) {
    console.error("Project invitation email failed:", error);
    return {
      success: false,
      error: error.message || "Failed to send project invitation email.",
    };
  }
}

module.exports = { inviteProjectMember };
