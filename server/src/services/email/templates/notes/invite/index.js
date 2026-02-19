module.exports = ({ noteName, ownerName, noteUrl }) => {
  const env = process.env.NODE_ENV || "development";
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  const contactEmail = process.env.CONTACT_EMAIL || "contact@gaelgomes.dev";
  const viewNoteLink = noteUrl || `${frontendUrl}/notes`;

  return {
    subject: `Nova colaboração: ${noteName}`,
    html: `
            <!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <title>Nova Colaboração - Weave Notes</title>
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

    .note-box {
      background: #fafafa;
      border-left: 4px solid #eab308;
      padding: 20px;
      margin: 25px 0;
      border-radius: 0 6px 6px 0;
    }
    .note-box h3 {
      margin: 0 0 10px 0;
      color: #0a0a0a;
      font-size: 16px;
      font-weight: 600;
    }
    .note-box p {
      margin: 0;
      color: #525252;
      font-size: 14px;
    }

    .collaboration-info {
      background: #fafafa;
      border: 1px solid #e5e5e5;
      border-radius: 6px;
      padding: 20px;
      margin: 25px 0;
      text-align: center;
    }
    .collaboration-info .owner {
      font-weight: 600;
      color: #0a0a0a;
      font-size: 15px;
    }

    .features {
      margin: 25px 0;
      background: #fafafa;
      padding: 20px;
      border-radius: 6px;
    }
    .features ul {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    .features li {
      margin-bottom: 10px;
      color: #525252;
      font-size: 14px;
      padding-left: 20px;
      position: relative;
    }
    .features li::before {
      content: "•";
      color: #eab308;
      font-weight: bold;
      font-size: 18px;
      position: absolute;
      left: 0;
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
        <small>Nova colaboração</small>
      </div>

      <div class="main-content">
        <h2>Adicionado como Colaborador</h2>
        
        <p>Prezado(a),</p>
        
        <div class="collaboration-info">
          <div class="owner">
            <strong>${ownerName}</strong> adicionou você como colaborador
          </div>
        </div>

        <div class="note-box">
          <h3>${noteName}</h3>
          <p>Você agora tem permissão para visualizar e editar esta nota.</p>
        </div>

        <p>Permissões do colaborador:</p>
        
        <div class="features">
          <ul>
            <li>Visualizar todo o conteúdo da nota</li>
            <li>Editar blocos e adicionar novo conteúdo</li>
            <li>Ver outros colaboradores da nota</li>
            <li>Receber atualizações em tempo real</li>
            <li>Acessar histórico de alterações</li>
          </ul>
        </div>

        <div style="text-align: center;">
          <a href="${viewNoteLink}" class="button">Acessar Nota</a>
        </div>

        <p style="font-size: 14px; color: #737373; text-align: center;">
          Faça login para acessar a nota compartilhada.
        </p>

        <p style="font-size: 14px; color: #737373;">
          Caso não conheça ${ownerName} ou não esperava este convite, você pode ignorar este email com segurança.
        </p>
      </div>

      <div class="footer">
        <p><strong>Weave Notes</strong></p>
        <p><a href="mailto:${contactEmail}">${contactEmail}</a></p>
        <p class="footer-note">Este email foi enviado automaticamente. Por favor, não responda.</p>
      </div>
    </div>
  </center>
</body>
</html>
        `,
    text: `
Nova Colaboração - Weave Notes

Prezado(a),

${ownerName} adicionou você como colaborador na nota: ${noteName}

Permissões do colaborador:
• Visualizar todo o conteúdo da nota
• Editar blocos e adicionar novo conteúdo
• Ver outros colaboradores da nota
• Receber atualizações em tempo real
• Acessar histórico de alterações

Link de acesso: ${viewNoteLink}

Você será redirecionado para fazer login antes de acessar a nota.

Caso não conheça ${ownerName} ou não esperava este convite, você pode ignorar este email com segurança.

Atenciosamente,
Equipe Weave Notes
${contactEmail}
        `.trim(),
  };
};
