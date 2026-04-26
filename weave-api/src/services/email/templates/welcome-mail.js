const { MailService } = require("@/services/email/config");
const {
  buildMailTemplate,
  escapeHtml,
} = require("@/services/email/mail-template");

async function welcome_message(nome, email, username, activationToken, code) {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  const encodedEmail = encodeURIComponent(email);
  const activationLink = `${frontendUrl}/auth/?view=confirm&token=${activationToken}&email=${encodedEmail}`;

  try {
    const { html, text } = buildMailTemplate({
      preheader: "Ative sua conta Weave Notes.",
      title: "Bem-vindo(a) ao Weave Notes",
      subtitle: "Ativacao de conta",
      greeting: `Ola ${nome || "usuario"},`,
      introLines: [
        "Sua conta foi criada com sucesso.",
        "Para comecar a usar a plataforma, confirme seu email no botao abaixo.",
      ],
      ctaText: "Ativar conta",
      ctaUrl: activationLink,
      infoText: "Este link expira em 7 dias.",
      contentHtml: `
        <div style="margin: 14px 0; padding: 14px; border: 1px solid #E5E7EB; border-radius: 8px; background: #F9FAFB;">
          <p style="margin: 0; font-size: 14px; color: #111827;"><strong>Usuario:</strong> ${escapeHtml(username || "-")}</p>
        </div>
        <div style="margin: 16px 0 8px; text-align: center;">
          <p style="margin: 0 0 6px; font-size: 13px; color: #6B7280;">Codigo de verificacao</p>
          <p style="margin: 0; font-size: 24px; font-weight: 700; letter-spacing: 4px; color: #111827;">${escapeHtml(code || "")}</p>
        </div>
      `,
      outroLines: [
        "Se preferir, voce tambem pode usar o token de ativacao manual no app.",
        `Token: ${activationToken}`,
        "Se voce nao se cadastrou, ignore este email.",
      ],
      footerNote:
        "Voce recebeu este email porque criou uma conta no Weave Notes.",
    });

    await MailService().sendMail({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: "Bem-vindo ao Weave Notes - Ative sua conta",
      text,
      html,
    });

    return { success: true };
  } catch (error) {
    console.error("Welcome email failed:", error);
    return {
      success: false,
      error: error.message || "Failed to send welcome email.",
    };
  }
}

module.exports = { welcome_message };
