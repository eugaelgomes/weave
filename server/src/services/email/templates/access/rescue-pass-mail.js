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
      from: "CW Notes <hello@gaelgomes.dev>",
      to: email,
      subject: "Recuperar minha senha - Weave Notes",
      text: `Seu token de recuperação é: ${token}. Acesse ${resetLink} para redefinir sua senha.`,
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
    /* Estilos base (modo claro) */
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

    .header {
      background: #00be67;
      padding: 20px;
      text-align: center;
      border-bottom: 4px solid #009e57;
    }
    .header h1 {
      margin: 0;
      color: #fff;
      font-size: 26px;
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

    .main-content {
      padding: 30px 25px;
    }
    h2 {
      font-size: 20px;
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

    .token-box {
      background: #fff9c4;
      border-left: 6px solid #fbc02d;
      padding: 15px;
      margin: 20px 0;
      text-align: center;
      font-family: 'Courier New', monospace;
      font-size: 18px;
      font-weight: bold;
      color: #444;
      box-shadow: 2px 2px 6px rgba(0,0,0,0.1);
    }

    .footer {
      dispay: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      padding: 25px;
      font-size: 12px;
      color: #777;
    }
    .footer p {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 6px;
      margin: 5px 0;
    }
    .footer a {
      color: #555;
      text-decoration: underline;
    }

    /* Dark mode automático */
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
      .token-box {
        background: #fff176 !important;
        border-left: 6px solid #fdd835 !important;
        color: #222 !important;
        box-shadow: 2px 2px 6px rgba(0,0,0,0.3) !important;
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
            Weave Notes
          </h1>
          <small>Suas anotações sempre seguras</small>
        </td>
      </tr>

      <tr>
        <td class="main-content">
          <h2>
            <!-- 🔑 Ícone de chave -->
            <svg xmlns="http://www.w3.org/2000/svg" class="icon" width="20" height="20" fill="#00be67" viewBox="0 0 24 24"><path d="M12 4a4 4 0 0 0-3.995 3.8L8 8a4 4 0 0 0 7.446 2H18l4 4-2 2-2-2-2 2-2-2h-1.553A4.002 4.002 0 0 0 12 4z"/></svg>
            Redefinição de Senha
          </h2>
          <p>Olá,</p>
          <p>Recebemos um pedido para redefinir a senha da sua conta. Para continuar, clique no botão abaixo:</p>

          <div style="text-align: center;">
            <a href="${resetLink}" class="button">Redefinir Senha</a>
          </div>

          <p style="text-align: center; font-size: 13px; color: #888;">Este link expira em 1 hora.</p>

          <p>Se o botão não funcionar, utilize o token abaixo na página de recuperação:</p>
          <div class="token-box">${token}</div>

          <p>Se você não fez essa solicitação, basta ignorar este e-mail. Nenhuma alteração será feita na sua conta.</p>
        </td>
      </tr>
    </table>
    <div class="footer">
      <p>
        <!-- 📝 Ícone de nota -->
        <svg xmlns="http://www.w3.org/2000/svg" class="icon" width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M3 4a1 1 0 0 1 1-1h10l5 5v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4zm11 0v4h4l-4-4z"/></svg>
        Weave Notes &copy; 2025
      </p>
      <p>Dúvidas? Entre em contato: <a href="mailto:contact@gaelgomes.dev">contact@gaelgomes.dev</a></p>
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
