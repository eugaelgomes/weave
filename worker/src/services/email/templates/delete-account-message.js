const { MailService } = require("@/services/email/config");
const { buildMailTemplate, escapeHtml } = require("@/services/email/mail-template");

async function delete_account_notification(nome, email, username) {
  try {
    const { html, text } = buildMailTemplate({
      preheader: "Sua conta foi excluida com sucesso.",
      title: "Conta excluida",
      subtitle: "Confirmacao de exclusao",
      greeting: `Ola ${nome || "usuario"},`,
      introLines: [
        "Sua conta no Weave Notes foi excluida permanentemente conforme solicitado.",
      ],
      contentHtml: `
        <div style="margin: 16px 0; padding: 14px; border: 1px solid #E5E7EB; border-radius: 8px; background: #F9FAFB;">
          <p style="margin: 0 0 6px; font-size: 14px; color: #111827;"><strong>Usuario removido:</strong> ${escapeHtml(username)}</p>
          <p style="margin: 0; font-size: 13px; color: #6B7280;">Todos os dados vinculados foram apagados de forma definitiva.</p>
        </div>
      `,
      outroLines: [
        "Se voce nao reconhece esta acao, entre em contato com nosso suporte imediatamente.",
      ],
      footerNote:
        "Voce recebeu este email como confirmacao da exclusao da sua conta.",
    });

    await MailService().sendMail({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: "Conta excluida com sucesso - Weave Notes",
      text,
      html,
    });

    return { success: true };
  } catch (error) {
    console.error("Delete account email failed:", error);
    return {
      success: false,
      error:
        error.message || "Failed to send delete account notification email.",
    };
  }
}

module.exports = { delete_account_notification };
