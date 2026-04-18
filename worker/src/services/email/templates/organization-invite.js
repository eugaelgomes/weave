const { MailService } = require("@/services/email/config");
const { buildMailTemplate } = require("@/services/email/mail-template");

async function welcome_message(email, organization_name) {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

  try {
    const { html, text } = buildMailTemplate({
      preheader: "Voce foi convidado(a) para o Weave Notes.",
      title: "Convite para o Weave Notes",
      subtitle: "Organizacao",
      introLines: [
        `A organizacao ${organization_name} convidou voce para usar o Weave Notes.`,
      ],
      ctaText: "Acessar plataforma",
      ctaUrl: frontendUrl,
    });

    await MailService().sendMail({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: `Ola, voce foi convidado para o Weave Notes pela ${organization_name}`,
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
