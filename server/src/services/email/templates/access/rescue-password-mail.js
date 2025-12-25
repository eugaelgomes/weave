const { MailService } = require("@/services/email/config/mail-service");

async function mail_rescue_pass(email, token) {
  const env = process.env.NODE_ENV || "development";
  let resetLink;
  if (env === "production") {
    resetLink = `${process.env.FRONTEND_URL}/auth/reset-password?token=${token}`;
  } else {
    resetLink = `${process.env.FRONTEND_URL}/auth/reset-password?reset_token=${token}`;
  }
  try {
    let mailOptions = {
      from: "Weave Notes <hello@gaelgomes.dev>",
      to: email,
      subject: "Redefinição de senha - Weave Notes",
      text: `Prezado(a),\n\nRecebemos uma solicitação para redefinir a senha da sua conta.\n\nToken de recuperação: ${token}\n\nLink para redefinição: ${resetLink}\n\nEste link expira em 1 hora.\n\nCaso não tenha feito esta solicitação, ignore este email.\n\nAtenciosamente,\nEquipe Weave Notes`,
      html: `
      <!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <title>Redefinição de Senha - Weave Notes</title>
  <style>
    html, body {
      margin: 0 auto !important;
      padding: 0 !important;
      height: 100% !important;
      width: 100% !important;
      background: #fafafa;
      font-family: 'Segoe UI', Arial, sans-serif;
      color: #0a0a0a;
    }

    table {
      border-spacing: 0 !important;
      border-collapse: collapse !important;
      margin: 0 auto !important;
    }

    .container {
      width: 100%;
      max-width: 600px;
      margin: 30px auto;
      background: #ffffff;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      overflow: hidden;
    }

    .header {
      background: #0a0a0a;
      padding: 40px 30px;
      text-align: center;
      border-bottom: 4px solid #eab308;
    }
    .header h1 {
      margin: 0 0 10px 0;
      color: #ffffff;
      font-size: 24px;
      font-weight: 600;
    }
    .header small {
      display: block;
      color: #d4d4d4;
      margin-top: 4px;
      font-size: 14px;
    }

    .main-content {
      padding: 40px 30px;
    }
    h2 {
      font-size: 18px;
      font-weight: 600;
      color: #0a0a0a;
      margin-bottom: 20px;
    }
    p {
      font-size: 15px;
      line-height: 1.6;
      margin: 0 0 18px 0;
      color: #525252;
    }

    .button {
      display: inline-block;
      background: #eab308;
      color: #0a0a0a !important;
      padding: 14px 32px;
      border-radius: 6px;
      font-weight: 600;
      text-align: center;
      margin: 25px 0;
      font-size: 15px;
      text-decoration: none;
    }
    .button:hover {
      background: #ca9a06;
    }

    .token-box {
      background: #fafafa;
      border-left: 4px solid #eab308;
      padding: 20px;
      margin: 25px 0;
      text-align: center;
      font-family: 'Courier New', monospace;
      font-size: 16px;
      font-weight: 600;
      color: #0a0a0a;
      border-radius: 0 6px 6px 0;
    }

    .info-box {
      background: #fafafa;
      border: 1px solid #e5e5e5;
      padding: 15px 20px;
      margin: 20px 0;
      border-radius: 6px;
      font-size: 14px;
      color: #737373;
      text-align: center;
    }

    .footer {
      background: #fafafa;
      padding: 30px;
      text-align: center;
      border-top: 1px solid #e5e5e5;
    }
    .footer p {
      margin: 8px 0;
      font-size: 14px;
      color: #737373;
    }
    .footer a {
      color: #0a0a0a;
      text-decoration: none;
    }
    .footer-note {
      font-size: 12px;
      color: #a3a3a3;
      margin-top: 15px;
    }

    @media screen and (max-width: 600px) {
      .button {
        display: block !important;
        width: 100% !important;
        box-sizing: border-box;
      }
    }
  </style>
</head>
<body>
  <center style="width: 100%; background-color: #fafafa;">
    <div class="container">
      <div class="header">
        <h1>Weave Notes</h1>
        <small>Redefinição de senha</small>
      </div>
      
      <div class="main-content">
        <h2>Solicitação de Redefinição de Senha</h2>
        
        <p>Prezado(a),</p>
        
        <p>Recebemos uma solicitação para redefinir a senha da sua conta. Para prosseguir, utilize o botão abaixo:</p>

        <div style="text-align: center;">
          <a href="${resetLink}" class="button">Redefinir Senha</a>
        </div>

        <div class="info-box">
          Este link expira em 1 hora
        </div>

        <p>Caso o botão não funcione, utilize o token abaixo na página de recuperação:</p>
        
        <div class="token-box">${token}</div>

        <p style="font-size: 14px; color: #737373;">Se você não solicitou esta alteração, ignore este email. Nenhuma modificação será realizada em sua conta.</p>
      </div>

      <div class="footer">
        <p><strong>Weave Notes</strong></p>
        <p><a href="mailto:contact@gaelgomes.dev">contact@gaelgomes.dev</a></p>
        <p class="footer-note">Este email foi enviado automaticamente. Por favor, não responda.</p>
      </div>
    </div>
  </center>
</body>
</html>

      `,
    };
    await MailService().sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to send welcome email." };
  }
}

module.exports = mail_rescue_pass;
