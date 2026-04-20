const { MailService } = require("@/services/email/config");
const {
  buildMailTemplate,
  escapeHtml,
} = require("@/services/email/mail-template");

async function sendEmailChangeValidation(currentEmail, newEmail, token) {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  const validationLink = `${frontendUrl}/auth/validate-email?token=${token}`;

  try {
    const { html, text } = buildMailTemplate({
      preheader: "Valide a mudanca de email da sua conta.",
      title: "Confirmacao de mudanca de email",
      subtitle: "Seguranca da conta",
      introLines: [
        "Recebemos uma solicitacao para alterar o email da sua conta.",
        "Use o botao abaixo para validar essa alteracao.",
      ],
      ctaText: "Confirmar novo email",
      ctaUrl: validationLink,
      infoText: "Este link expira em 1 hora.",
      contentHtml: `
        <div style="margin: 16px 0; padding: 14px; border: 1px solid #E5E7EB; border-radius: 8px; background: #F9FAFB;">
          <p style="margin: 0 0 6px; font-size: 14px; color: #111827;"><strong>Email atual:</strong> ${escapeHtml(currentEmail)}</p>
          <p style="margin: 0; font-size: 14px; color: #111827;"><strong>Novo email:</strong> ${escapeHtml(newEmail)}</p>
        </div>
        <div style="margin: 12px 0 0; padding: 12px 14px; border: 1px dashed #EAB308; border-radius: 8px; background: #FFFBEB; text-align: center;">
          <p style="margin: 0; font-size: 12px; color: #6B7280;">Token de validacao</p>
          <p style="margin: 6px 0 0; font-size: 16px; color: #111827; font-weight: 700; letter-spacing: 1px;">${escapeHtml(token)}</p>
        </div>
      `,
      outroLines: ["Se voce nao solicitou essa alteracao, ignore este email."],
    });

    await MailService().sendMail({
      from: process.env.EMAIL_FROM,
      to: newEmail,
      subject: "Validacao de mudanca de email - Weave Notes",
      text,
      html,
    });

    return { success: true };
  } catch (error) {
    console.error("Error sending email change validation:", error);
    return { success: false, error: "Failed to send validation email." };
  }
}

module.exports = { sendEmailChangeValidation };
