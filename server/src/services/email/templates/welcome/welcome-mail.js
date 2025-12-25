const { MailService } = require("@/services/email/config/mail-service");

async function welcome_message(nome, email, username) {
  try {
    let mailOptions = {
      from: "Weave Notes <hello@gaelgomes.dev>",
      to: email,
      subject: "Bem-vindo ao Weave Notes",
      html: `<!DOCTYPE html>
  <html lang="pt-BR">
  <head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <title>Bem-vindo(a) ao Weave Notes</title>
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
    strong {
      color: #0a0a0a;
      font-weight: 600;
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

    .info-box {
      background: #fafafa;
      border-left: 4px solid #eab308;
      padding: 20px;
      margin: 25px 0;
      border-radius: 0 6px 6px 0;
    }
    .info-box p {
      margin: 0;
      color: #0a0a0a;
      font-size: 15px;
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
        <small>Bem-vindo à plataforma</small>
      </div>

      <div class="main-content">
        <h2>Cadastro Realizado com Sucesso</h2>
        
        <p>Prezado(a) <strong>${nome}</strong>,</p>
        
        <p>Sua conta no Weave Notes foi criada com sucesso. Você agora tem acesso à plataforma de anotações e organização.</p>
        
        <div class="info-box">
          <p>Nome de usuário: <strong>${username}</strong></p>
        </div>

        <div style="text-align: center;">
          <a href="https://notes.gaelgomes.dev" class="button">Acessar Conta</a>
        </div>

        <p style="font-size: 14px; color: #737373;">Caso tenha dúvidas, entre em contato com nossa equipe de suporte.</p>
      </div>

      <div class="footer">
        <p><strong>Weave Notes</strong></p>
        <p><a href="mailto:contact@gaelgomes.dev">contact@gaelgomes.dev</a></p>
        <p class="footer-note">Você recebeu este email porque se cadastrou em nossa plataforma.</p>
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
    console.error("Welcome email failed:", error);
    return {
      success: false,
      error: error.message || "Failed to send welcome email.",
    };
  }
}

module.exports = { welcome_message };
