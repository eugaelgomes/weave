const { MailService } = require("@/services/email/config");
const {
  buildMailTemplate,
  escapeHtml,
} = require("@/services/email/mail-template");

async function send_organization_invite_accepted(
  toEmail,
  organizationName,
  homeUrl
) {
  const safeOrg = organizationName || "organizacao";

  try {
    const { html, text } = buildMailTemplate({
      preheader: "Convite aceito com sucesso.",
      title: `Bem-vindo(a) a ${safeOrg}`,
      subtitle: "Sua conta esta pronta para uso",
      introLines: [
        "Seu acesso foi confirmado e voce ja pode usar o Weave Notes.",
        "Aqui voce centraliza planejamento, execucao e colaboracao em um unico lugar.",
      ],
      ctaText: "Ir para Home",
      ctaUrl: homeUrl,
      contentHtml: `
        <div style="margin: 16px 0; padding: 14px; border: 1px solid #E5E7EB; border-radius: 8px; background: #F9FAFB;">
          <p style="margin: 0 0 6px; font-size: 14px; color: #111827;"><strong>Organizacao:</strong> ${escapeHtml(safeOrg)}</p>
          <p style="margin: 0; font-size: 13px; color: #374151;">No Weave Notes voce pode:</p>
          <ul style="margin: 8px 0 0 18px; padding: 0; color: #374151; font-size: 13px; line-height: 1.6;">
            <li>Criar notas e organizar ideias com blocos.</li>
            <li>Trabalhar em projetos com etapas, prioridades e prazos.</li>
            <li>Compartilhar conteudo e colaborar com seu time.</li>
            <li>Centralizar arquivos, links e contexto em um so lugar.</li>
          </ul>
        </div>
      `,
      outroLines: [`Se o botao nao funcionar, copie este link: ${homeUrl}`],
    });

    await MailService().sendMail({
      from: process.env.EMAIL_FROM,
      to: toEmail,
      subject: `Bem-vindo a ${safeOrg} - Weave Notes`,
      text,
      html,
    });

    return { success: true };
  } catch (error) {
    console.error("Invite accepted email failed:", error);
    return { success: false, error: error.message };
  }
}

module.exports = { send_organization_invite_accepted };
