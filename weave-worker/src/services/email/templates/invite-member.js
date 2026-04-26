const { MailService } = require("@/services/email/config");
const { buildMailTemplate, escapeHtml } = require("@/services/email/mail-template");

async function send_organization_invite(
  invitedEmail,
  organizationName,
  inviterName,
  inviteToken,
  role,
) {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  const acceptInviteLink = `${frontendUrl}/auth?invite_token=${inviteToken}`;

  const roleTranslation = {
    owner: "Proprietario",
    admin: "Administrador",
    member: "Membro",
    viewer: "Visualizador",
    guest: "Convidado",
    super_admin: "Super administrador",
  };

  const translatedRole = roleTranslation[role] || role;

  try {
    const { html, text } = buildMailTemplate({
      preheader: "Convite para participar de uma organizacao.",
      title: "Voce foi convidado(a)",
      subtitle: "Convite para organizacao",
      introLines: [
        `${inviterName} convidou voce para entrar na organizacao ${organizationName}.`,
      ],
      ctaText: "Aceitar convite",
      ctaUrl: acceptInviteLink,
      infoText: "Este convite expira em 7 dias.",
      contentHtml: `
        <div style="margin: 16px 0; padding: 14px; border: 1px solid #E5E7EB; border-radius: 8px; background: #F9FAFB;">
          <p style="margin: 0 0 6px; font-size: 14px; color: #111827;"><strong>Organizacao:</strong> ${escapeHtml(organizationName)}</p>
          <p style="margin: 0; font-size: 14px; color: #111827;"><strong>Cargo:</strong> ${escapeHtml(translatedRole)}</p>
        </div>
        <p style="margin: 12px 0 0; font-size: 13px; color: #6B7280;">Token do convite: <strong>${escapeHtml(inviteToken)}</strong></p>
      `,
    });

    await MailService().sendMail({
      from: process.env.EMAIL_FROM,
      to: invitedEmail,
      subject: `Convite para ${organizationName} - Weave Notes`,
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
