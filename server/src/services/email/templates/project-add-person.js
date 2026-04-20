const { MailService } = require("@/services/email/config");
const {
  buildMailTemplate,
  escapeHtml,
} = require("@/services/email/mail-template");

const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

async function inviteProjectMember(
  nome,
  email,
  projectName,
  projectId,
  addedByName
) {
  const firstName = (nome || "").split(" ")[0] || "Ola";
  const projectUrl = `${frontendUrl}/app/home/projects/${projectId}`;

  try {
    const { html, text } = buildMailTemplate({
      preheader: "Voce foi adicionado(a) a um projeto.",
      title: "Novo projeto compartilhado com voce",
      subtitle: "Colaboracao em projetos",
      greeting: `Ola ${firstName},`,
      introLines: [
        `${addedByName} adicionou voce como colaborador(a) no projeto abaixo.`,
      ],
      ctaText: "Acessar projeto",
      ctaUrl: projectUrl,
      contentHtml: `
        <div style="margin: 16px 0; padding: 14px; border: 1px solid #E5E7EB; border-radius: 8px; background: #F9FAFB;">
          <p style="margin: 0 0 6px; font-size: 14px; color: #111827;"><strong>Projeto:</strong> ${escapeHtml(projectName || "Sem titulo")}</p>
          <p style="margin: 0; font-size: 13px; color: #6B7280;">ID: ${escapeHtml(projectId)}</p>
        </div>
      `,
      outroLines: [
        "Agora voce pode visualizar e colaborar no projeto normalmente.",
      ],
      footerNote:
        "Voce recebeu este email porque foi adicionado a um projeto no Weave Notes.",
    });

    await MailService().sendMail({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: `${firstName}, voce foi adicionado ao projeto "${projectName || ""}"`,
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
