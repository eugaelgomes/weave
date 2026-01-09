const { MailService } = require("@/services/email/config/index");

async function delete_account_request(nome, email, username, token) {
  try {
    const confirmationLink = `${process.env.FRONTEND_URL}/auth/confirm-delete-account?token=${token}`;

    let mailOptions = {
      from: "Weave Notes <hello@gaelgomes.dev>",
      to: email,
      subject: "Confirmação de exclusão de conta - Weave Notes",
      html: `<!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <meta name="x-apple-disable-message-reformatting">
      <title>Confirmar Exclusão de Conta - Weave Notes</title>
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
          border-bottom: 4px solid #dc2626;
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
    
        .warning-box {
          background: #fef2f2;
          border-left: 4px solid #dc2626;
          padding: 20px;
          margin: 25px 0;
          border-radius: 0 6px 6px 0;
        }
        .warning-box h3 {
          margin: 0 0 12px 0;
          color: #dc2626;
          font-size: 15px;
          font-weight: 600;
        }
        .warning-box p {
          margin: 8px 0;
          color: #525252;
          font-size: 14px;
        }
        .warning-box ul {
          margin: 12px 0;
          padding-left: 20px;
          color: #525252;
          font-size: 14px;
        }
        .warning-box li {
          margin: 6px 0;
        }
    
        .btn-container {
          text-align: center;
          margin: 30px 0;
        }
        .btn {
          display: inline-block;
          padding: 14px 32px;
          background: #dc2626;
          color: #ffffff !important;
          text-decoration: none;
          border-radius: 6px;
          font-weight: 600;
          font-size: 15px;
          transition: background 0.2s;
        }
        .btn:hover {
          background: #b91c1c;
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
      </style>
    </head>
    <body>
      <center style="width: 100%; background-color: #fafafa;">
        <div class="container">
          <div class="header">
            <h1>Weave Notes</h1>
            <small>Confirmação de exclusão de conta</small>
          </div>
    
          <div class="main-content">
            <h2>Solicitação de Exclusão de Conta</h2>
            
            <p>Prezado(a) <strong>${nome}</strong>,</p>
            
            <p>Recebemos uma solicitação para excluir permanentemente sua conta no Weave Notes.</p>
            
            <p>Nome de usuário: <strong>${username}</strong></p>
    
            <div class="warning-box">
              <h3>Atenção: Esta ação é irreversível</h3>
              <p>Ao confirmar a exclusão, os seguintes dados serão permanentemente removidos:</p>
              <ul>
                <li>Todas as suas anotações e rascunhos</li>
                <li>Projetos e organizações que você criou</li>
                <li>Configurações e preferências pessoais</li>
                <li>Histórico de atividades</li>
                <li>Avatar e informações de perfil</li>
              </ul>
              <p><strong>Este processo não pode ser desfeito.</strong></p>
            </div>
    
            <div class="btn-container">
              <a href="${confirmationLink}" class="btn">Confirmar Exclusão da Conta</a>
            </div>
    
            <p style="font-size: 13px; color: #737373; text-align: center;">Ou copie e cole este link no seu navegador:</p>
            <p style="font-size: 12px; color: #a3a3a3; word-break: break-all; text-align: center;">${confirmationLink}</p>
    
            <p style="font-size: 14px; color: #737373; margin-top: 25px;">
              <strong>Não solicitou esta exclusão?</strong><br>
              Se você não pediu para excluir sua conta, ignore este email. Sua conta permanecerá ativa e segura. 
              Por segurança, considere alterar sua senha.
            </p>
    
            <p style="font-size: 13px; color: #a3a3a3;">
              Este link expira em <strong>7 dias</strong> (${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR')}).
            </p>
          </div>
    
          <div class="footer">
            <p><strong>Weave Notes</strong></p>
            <p><a href="mailto:contact@gaelgomes.dev">contact@gaelgomes.dev</a></p>
            <p class="footer-note">Você recebeu este email porque uma solicitação de exclusão de conta foi feita para este endereço.</p>
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
    console.error("Delete account request email failed:", error);
    return {
      success: false,
      error:
        error.message ||
        "Failed to send delete account confirmation request email.",
    };
  }
}

module.exports = { delete_account_request };
