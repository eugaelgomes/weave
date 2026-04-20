const { MailService } = require("@/services/email/config");
const {
  buildMailTemplate,
  escapeHtml,
} = require("@/services/email/mail-template");

async function mail_rescue_pass(email, token, name) {
  const env = process.env.NODE_ENV || "development";
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  const resetLink =
    env === "production"
      ? `${frontendUrl}/auth/reset-password?token=${token}`
      : `${frontendUrl}/auth/reset-password?reset_token=${token}`;

  try {
    const { html, text } = buildMailTemplate({
      preheader: "Solicitacao de redefinicao de senha.",
      title: "Redefinicao de Senha",
      subtitle: "Seguranca da conta",
      greeting: `Ola ${name || "usuario"},`,
      introLines: [
        "Recebemos uma solicitacao para redefinir a senha da sua conta.",
        "Se voce fez essa solicitacao, use o botao abaixo para continuar.",
      ],
      ctaText: "Redefinir senha",
      ctaUrl: resetLink,
      infoText: "Este link expira em 1 hora.",
      contentHtml: `
        <div style="margin: 14px 0 20px; padding: 12px 14px; border: 1px dashed #EAB308; border-radius: 8px; background: #FFFBEB; text-align: center;">
          <p style="margin: 0; font-size: 12px; color: #6B7280;">Token de recuperacao</p>
          <p style="margin: 6px 0 0; font-size: 16px; color: #111827; font-weight: 700; letter-spacing: 1px;">${escapeHtml(token)}</p>
        </div>
      `,
      outroLines: [
        "Se voce nao solicitou esta alteracao, ignore este email. Nenhuma mudanca sera realizada.",
      ],
    });

    await MailService().sendMail({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: "Redefinicao de senha - Weave Notes",
      text,
      html,
    });

    return { success: true };
  } catch (error) {
    console.error("Password recovery email failed:", error);
    return {
      success: false,
      error: error.message || "Failed to send password recovery email.",
    };
  }
}

module.exports = { mail_rescue_pass };
