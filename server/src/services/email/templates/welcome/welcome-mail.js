const { MailService } = require("@/services/email/config/mail-service");

async function welcome_message(nome, email, username) {
  try {
    let mailOptions = {
      from: "CW Notes <hello@gaelgomes.dev>",
      to: email,
      subject: "Bem vindo ao CodaWeb Notes!",
      html: `<!DOCTYPE html>
  <html lang="pt-BR">
  <head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <title>Bem-vindo(a) ao CodaWeb Notes</title>
  <style>
    /* Estilos base */
    html, body {
      margin: 0 auto !important;
      padding: 0 !important;
      height: 100% !important;
      width: 100% !important;
      background: #f4f4f4;
      font-family: 'Segoe UI', 'Arial', sans-serif;
      color: #333;
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
      background: #fffdf7;
      border-radius: 12px;
      box-shadow: 0 6px 18px rgba(0,0,0,0.08);
      overflow: hidden;
      border: 1px solid #e6e6e6;
    }

    /* Cabeçalho */
    .header {
      background: #00be67;
      padding: 25px;
      text-align: center;
      border-bottom: 4px solid #009e57;
    }
    .header h1 {
      margin: 0;
      color: #fff;
      font-size: 28px;
      font-weight: 700;
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 8px;
    }
    .header small {
      display: block;
      color: #cfffec;
      margin-top: 4px;
      font-size: 14px;
    }
    .icon {
      vertical-align: middle;
    }

    /* Conteúdo */
    .main-content {
      padding: 30px 25px;
    }
    h2 {
      font-size: 22px;
      font-weight: 600;
      color: #222;
      margin-bottom: 15px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    p {
      font-size: 15px;
      line-height: 1.6;
      margin: 0 0 18px 0;
      color: #333;
    }
    strong {
      color: #00be67;
    }

    /* Botão */
    .button {
      display: inline-block;
      background: #00be67;
      color: #fff !important;
      padding: 12px 28px;
      border-radius: 6px;
      font-weight: 600;
      text-align: center;
      margin: 20px auto;
      font-size: 15px;
      transition: background .2s ease;
    }
    .button:hover {
      background: #009e57;
    }

    /* Rodapé */
    .footer {
      text-align: center;
      padding: 25px;
      font-size: 12px;
      color: #777;
    }
    .footer p {
      margin: 5px 0;
    }
    .footer a {
      color: #555;
      text-decoration: underline;
    }

    /* Dark mode */
    @media (prefers-color-scheme: dark) {
      body {
        background: #1c1c1c !important;
        color: #eaeaea !important;
      }
      .container {
        background: #2a2a2a !important;
        border: 1px solid #333 !important;
      }
      h2 {
        color: #fff !important;
      }
      p {
        color: #ddd !important;
      }
      .footer {
        color: #aaa !important;
      }
      .footer a {
        color: #bbb !important;
      }
    }

    /* Mobile */
    @media screen and (max-width: 600px) {
      .button {
        display: block !important;
        width: 100% !important;
        box-sizing: border-box;
      }
      .header h1 {
        flex-direction: column;
        gap: 4px;
      }
    }
  </style>
</head>
<body>
  <center style="width: 100%; background-color: #f4f4f4;">
    <table role="presentation" class="container">
      <tr>
        <td class="header">
          <h1>
            <!-- 📒 Ícone de caderno -->
            <svg xmlns="http://www.w3.org/2000/svg" class="icon" width="26" height="26" fill="white" viewBox="0 0 24 24"><path d="M5 2a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12V2H5zm0 2h10v14H5V4z"/><path d="M17 2v20h2a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2h-2z"/></svg>
            CodaWeb Notes
          </h1>
          <small>Organize suas ideias com facilidade</small>
        </td>
      </tr>

      <tr>
        <td class="main-content">
          <h2>
            <!-- 🎉 Ícone de celebração -->
            <svg xmlns="http://www.w3.org/2000/svg" class="icon" width="20" height="20" fill="#00be67" viewBox="0 0 24 24"><path d="M2 22l14-5-9-9-5 14zm6.9-7.1l2.2-2.2 3 3-2.2 2.2-3-3zm9.6-9.6a5 5 0 1 1-7.07 7.07l-1.42-1.42 7.07-7.07 1.42 1.42z"/></svg>
            Bem-vindo(a) ao CodaWeb Notes!
          </h2>
          <p>Olá <strong>${nome}</strong>,</p>
          <p>Seu cadastro foi realizado com sucesso! 🎉 Estamos muito felizes em ter você na comunidade <strong>CodaWeb Notes</strong>, o seu novo espaço para anotações, organização e produtividade.</p>
          <p>Seu nome de usuário é: <strong>${username}</strong></p>

          <div style="text-align: center;">
            <a href="https://notes.codaweb.com.br" class="button">Acessar minha conta</a>
          </div>

          <p>Se precisar de ajuda, é só responder este e-mail. 😉</p>
        </td>
      </tr>
    </table>
    <div class="footer">
      <p>CodaWeb Notes &copy; 2025</p>
      <p>Você recebeu este e-mail porque se cadastrou em nossa plataforma.</p>
      <p>Dúvidas? Entre em contato: <a href="mailto:contact@codaweb.com.br">contact@codaweb.com.br</a></p>
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
