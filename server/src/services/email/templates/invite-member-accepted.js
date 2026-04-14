const { MailService } = require("@/services/email/config");
const { buildMailTemplate, escapeHtml } = require("@/services/email/mail-template");

async function send_organization_invite_accepted(
  toEmail,
  organizationName,
  areaName,
  areasUrl,
) {
  const safeOrg = organizationName || "organizacao";

  try {
    const { html, text } = buildMailTemplate({
      preheader: "Convite aceito com sucesso.",
      title: `Bem-vindo(a) a ${safeOrg}`,
      subtitle: "Convite aceito",
      introLines: ["Seu acesso foi confirmado e voce ja faz parte da organizacao."],
      ctaText: "Abrir areas da organizacao",
      ctaUrl: areasUrl,
      contentHtml: `
        <div style="margin: 16px 0; padding: 14px; border: 1px solid #E5E7EB; border-radius: 8px; background: #F9FAFB;">
          <p style="margin: 0 0 6px; font-size: 14px; color: #111827;"><strong>Organizacao:</strong> ${escapeHtml(safeOrg)}</p>
          ${areaName ? `<p style="margin: 0; font-size: 14px; color: #111827;"><strong>Area:</strong> ${escapeHtml(areaName)}</p>` : ""}
        </div>
      `,
      outroLines: [`Se o botao nao funcionar, copie este link: ${areasUrl}`],
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
