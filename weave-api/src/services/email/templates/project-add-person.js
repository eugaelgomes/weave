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
  addedByName,
  projectPublicId = null
) {
  const locale = await getUserEmailLocale({ email });
  const firstName =
    (nome || "").split(" ")[0] || t(locale, "common.greetingFallback");
  const targetId = projectPublicId || projectId;
  const projectUrl = `${frontendUrl}/auth/?redirect=${encodeURIComponent(`/app/projects/${targetId}`)}`;

  const safeProjectName = projectName || t(locale, "project.untitled");

  try {
    const { html, text } = buildMailTemplate({
      contentHtml: `
        <div style="margin: 16px 0; padding: 14px; border: 1px solid #E5E7EB; border-radius: 8px; background: #F9FAFB;">
          <p style="margin: 0; font-size: 14px; color: #111827;"><strong>${escapeHtml(t(locale, "common.project"))}:</strong> ${escapeHtml(safeProjectName)}</p>
        </div>
      `,
      ctaText: t(locale, "project.cta"),
      ctaUrl: projectUrl,
      footerNote: t(locale, "project.footer"),
      greeting: `${firstName},`,
      introLines: [t(locale, "project.intro", { addedByName })],
      locale,
      outroLines: [t(locale, "project.outro")],
      preheader: t(locale, "project.preheader"),
      subtitle: t(locale, "project.subtitle"),
      title: t(locale, "project.title"),
    });

    await MailService().sendMail({
      from: process.env.EMAIL_FROM,
      html,
      subject: t(locale, "project.subject", {
        firstName,
        projectName: safeProjectName,
      }),
      text,
      to: email,
    });

    return { success: true };
  } catch (error) {
    console.error("Project invitation email failed:", error);
    return {
      error: error.message || "Failed to send project invitation email.",
      success: false,
    };
  }
}

module.exports = { inviteProjectMember };
