const { MailService } = require("@/services/email/config");
const { buildMailTemplate } = require("@/services/email/mail-template");

async function welcome_message(email, organization_name) {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

  try {
    const { html, text } = buildMailTemplate({
      ctaText: "Acessar plataforma",
      ctaUrl: frontendUrl,
      introLines: [`A organizacao ${organization_name} convidou voce para usar o Weave.`],
      preheader: "Voce foi convidado(a) para o Weave.",
      subtitle: "Organizacao",
      title: "Convite para o Weave",
    });

    await MailService().sendMail({
      from: process.env.EMAIL_FROM,
      html,
      subject: `Ola, voce foi convidado para o Weave pela ${organization_name}`,
      text,
      to: email,
    });

    return { success: true };
  } catch (error) {
    console.error("Welcome email failed:", error);
    return {
      error: error.message || "Failed to send welcome email.",
      success: false,
    };
  }
}

module.exports = { welcome_message };
