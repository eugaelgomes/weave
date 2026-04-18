const { MailService } = require("@/services/email/config");
const { buildMailTemplate, escapeHtml } = require("@/services/email/mail-template");

async function delete_account_request(nome, email, username, token) {
  try {
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const confirmationLink = `${frontendUrl}/auth/confirm-delete-account?token=${token}`;
    const expiration = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000,
    ).toLocaleDateString("pt-BR");

    const { html, text } = buildMailTemplate({
      preheader: "Confirmacao de exclusao de conta.",
      title: "Confirmar exclusao de conta",
      subtitle: "Acao irreversivel",
      greeting: `Ola ${nome || "usuario"},`,
      introLines: [
        "Recebemos uma solicitacao para excluir permanentemente sua conta.",
        "Se deseja continuar, confirme no botao abaixo.",
      ],
      ctaText: "Confirmar exclusao da conta",
      ctaUrl: confirmationLink,
      infoText: `Este link expira em 7 dias (${expiration}).`,
      contentHtml: `
        <div style="margin: 16px 0; padding: 14px; border: 1px solid #E5E7EB; border-radius: 8px; background: #F9FAFB;">
          <p style="margin: 0 0 6px; font-size: 14px; color: #111827;"><strong>Usuario:</strong> ${escapeHtml(username)}</p>
          <p style="margin: 0; font-size: 13px; color: #6B7280;">Apos a confirmacao, dados e configuracoes serao removidos definitivamente.</p>
        </div>
      `,
      outroLines: [
        "Se voce nao solicitou essa exclusao, ignore este email e considere alterar sua senha.",
      ],
      footerNote:
        "Voce recebeu este email porque uma solicitacao de exclusao foi feita para esta conta.",
    });

    await MailService().sendMail({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: "Confirmacao de exclusao de conta - Weave Notes",
      text,
      html,
    });

    return { success: true };
  } catch (error) {
    console.error("Delete account request email failed:", error);
    return {
      success: false,
      error:
        error.message ||
        "Failed to send delete account confirmation request email.",
    };
  }
}

module.exports = { delete_account_request };
