const { MailService } = require("@/services/email/config/mail-service");

async function delete_account_notification(nome, email, username) {
  try {
    let mailOptions = {
      from: "CW Notes <hello@gaelgomes.dev>",
      to: email,
      subject: "Conta excluída com sucesso - CodaWeb Notes",
      html: `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <title>Conta Excluída - CodaWeb Notes</title>
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
      background: #e74c3c;
      padding: 25px;
      text-align: center;
      border-bottom: 4px solid #c0392b;
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
      color: #fdeaea;
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
      color: #e74c3c;
    }

    /* Caixa de informação importante */
    .info-box {
      background: #fff3cd;
      border-left: 6px solid #ffc107;
      padding: 20px;
      margin: 20px 0;
      border-radius: 0 6px 6px 0;
      box-shadow: 2px 2px 6px rgba(0,0,0,0.1);
    }
    .info-box h3 {
      margin: 0 0 10px 0;
      color: #856404;
      font-size: 16px;
      font-weight: 600;
    }
    .info-box p {
      margin: 0;
      color: #856404;
      font-size: 14px;
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
      .info-box {
        background: #3a3a2f !important;
        border-left: 6px solid #ffc107 !important;
      }
      .info-box h3, .info-box p {
        color: #ffc107 !important;
      }
    }

    /* Mobile */
    @media screen and (max-width: 600px) {
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
            <!-- 🗑️ Ícone de lixeira -->
            <svg xmlns="http://www.w3.org/2000/svg" class="icon" width="26" height="26" fill="white" viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
            CodaWeb Notes
          </h1>
          <small>Conta excluída com sucesso</small>
        </td>
      </tr>

      <tr>
        <td class="main-content">
          <h2>
            <!-- ✅ Ícone de confirmação -->
            <svg xmlns="http://www.w3.org/2000/svg" class="icon" width="20" height="20" fill="#e74c3c" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
            Conta excluída com sucesso
          </h2>
          <p>Olá <strong>${nome}</strong>,</p>
          <p>Sua conta no <strong>CodaWeb Notes</strong> foi excluída permanentemente conforme solicitado.</p>
          <p>Nome de usuário excluído: <strong>${username}</strong></p>

          <div class="info-box">
            <h3>⚠️ Informações importantes:</h3>
            <p>• Todos os seus dados foram removidos permanentemente de nossos servidores</p>
            <p>• Suas anotações e configurações não poderão ser recuperadas</p>
            <p>• Você pode criar uma nova conta a qualquer momento com o mesmo email</p>
          </div>

          <p>Lamentamos vê-lo partir. Se mudou de ideia, você sempre será bem-vindo de volta à nossa comunidade! 😊</p>
          
          <p>Se esta exclusão não foi solicitada por você, entre em contato conosco imediatamente.</p>
        </td>
      </tr>
    </table>
    <div class="footer">
      <p>CodaWeb Notes &copy; 2025</p>
      <p>Você recebeu este e-mail como confirmação da exclusão da sua conta.</p>
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
    console.error("Delete account email failed:", error);
    return {
      success: false,
      error: error.message || "Failed to send delete account notification email.",
    };
  }
}

module.exports = { delete_account_notification };