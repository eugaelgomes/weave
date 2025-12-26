const { MailService } = require("@/services/email/config/index");

/**
 * Envia convite para participar de uma organização
 */
async function send_organization_invite(
  invitedEmail,
  organizationName,
  inviterName,
  inviteToken,
  role
) {
  const env = process.env.NODE_ENV || "development";
  const acceptInviteLink = `${process.env.FRONTEND_URL}/organization/accept-invite?token=${inviteToken}`;

  const roleTranslation = {
    owner: "Proprietário",
    admin: "Administrador",
    member: "Membro",
    viewer: "Visualizador",
  };

  const translatedRole = roleTranslation[role] || role;

  try {
    const mailOptions = {
      from: "Weave Notes <hello@gaelgomes.dev>",
      to: invitedEmail,
      subject: `Convite para ${organizationName} - Weave Notes`,
      html: `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Convite para Organização - Weave Notes</title>
  <style>
    body { margin: 0 auto !important; padding: 0 !important; background: #fafafa; font-family: 'Segoe UI', Arial, sans-serif; color: #0a0a0a; }
    .container { width: 100%; max-width: 600px; margin: 30px auto; background: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden; }
    .header { background: #0a0a0a; padding: 40px 30px; text-align: center; border-bottom: 4px solid #eab308; }
    .header h1 { margin: 0; color: #ffffff; font-size: 24px; }
    .header small { color: #d4d4d4; font-size: 14px; }
    .main-content { padding: 40px 30px; }
    .button { display: inline-block; background: #eab308; color: #0a0a0a !important; padding: 14px 32px; border-radius: 6px; font-weight: 600; text-decoration: none; margin: 25px 0; }
    .info-box { background: #fafafa; border-left: 4px solid #eab308; padding: 20px; margin: 25px 0; border-radius: 0 6px 6px 0; }
    .token-box { background: #fafafa; border: 1px dashed #eab308; padding: 15px; margin: 20px 0; text-align: center; font-family: monospace; font-weight: bold; }
    .warning-box { background: #fef3c7; padding: 15px; border-radius: 6px; font-size: 14px; color: #92400e; text-align: center; }
    .footer { background: #fafafa; padding: 30px; text-align: center; border-top: 1px solid #e5e5e5; font-size: 14px; color: #737373; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Weave Notes</h1>
      <small>Convite para organização</small>
    </div>
    <div class="main-content">
      <h2>Você foi convidado!</h2>
      <p>Olá,</p>
      <p><strong>${inviterName}</strong> convidou você para fazer parte da organização <strong>${organizationName}</strong>.</p>
      <div class="info-box">
        <p><strong>Organização:</strong> ${organizationName}</p>
        <p><strong>Cargo:</strong> ${translatedRole}</p>
      </div>
      <div style="text-align: center;">
        <a href="${acceptInviteLink}" class="button">Aceitar Convite</a>
      </div>
      <div class="warning-box">⚠️ Este convite expira em 7 dias</div>
      <p>Se o botão não funcionar, use o código: <strong>${inviteToken}</strong></p>
    </div>
    <div class="footer">
      <p><strong>Weave Notes</strong></p>
      <p>contact@gaelgomes.dev</p>
    </div>
  </div>
</body>
</html>`,
    };

    await MailService().sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error("Organization invite email failed:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Envia mensagem de boas-vindas e ativação de conta
 */
async function welcome_message(nome, email, activationToken, username) {
  const activationLink = `${process.env.FRONTEND_URL}/activate?token=${activationToken}`;

  try {
    const mailOptions = {
      from: "Weave Notes <hello@gaelgomes.dev>",
      to: email,
      subject: `Bem-vindo(a) ao Weave Notes`,
      html: `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Ative sua Conta - Weave Notes</title>
  <style>
    body { margin: 0; background: #fafafa; font-family: sans-serif; }
    .container { max-width: 600px; margin: 30px auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .header { background: #0a0a0a; padding: 30px; text-align: center; color: #fff; border-bottom: 4px solid #eab308; }
    .content { padding: 40px 30px; color: #525252; }
    .button { display: inline-block; background: #eab308; color: #0a0a0a; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; }
    .footer { padding: 20px; text-align: center; font-size: 12px; color: #a3a3a3; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h1>Weave Notes</h1></div>
    <div class="content">
      <h2>Bem-vindo(a), ${nome}!</h2>
      <p>Sua conta foi criada. Para começar, ative-a clicando abaixo:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${activationLink}" class="button">Ativar Minha Conta</a>
      </div>
      <p>Usuário: <strong>${username}</strong></p>
      <p>Token de ativação: <code>${activationToken}</code></p>
    </div>
    <div class="footer">Weave Notes &copy; 2024</div>
  </div>
</body>
</html>`,
    };

    await MailService().sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error("Welcome email failed:", error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  send_organization_invite,
  welcome_message,
};
