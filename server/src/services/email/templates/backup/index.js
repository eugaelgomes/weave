/**
 * Template de email para entrega de backup de dados
 * @param {Object} options - Opções do template
 * @param {string} options.userName - Nome do usuário
 * @param {string} options.downloadUrl - URL para download
 * @param {string} options.expiresAt - Data/hora de expiração
 * @param {number} options.hoursValid - Horas até expiração
 * @returns {Object} Template do email
 */
function backupReadyTemplate({ userName, downloadUrl, expiresAt, hoursValid }) {
  const subject = "Seu backup está pronto para download";

  const text = `
Prezado(a) ${userName},

Seu backup de dados foi processado com sucesso e está disponível para download.

LINK DE DOWNLOAD:
${downloadUrl}

ATENÇÃO:
- Este link expira em ${hoursValid} horas (${expiresAt})
- Após a expiração, o arquivo será automaticamente deletado
- O link só pode ser usado uma vez
- Mantenha este link em segurança

SOBRE O ARQUIVO:
- Formato: CSV (compatível com Excel e Google Sheets)
- Contém todas as suas notas e blocos ativos
- Cada linha representa um bloco de uma nota
- Blocos deletados não estão incluídos

Atenciosamente,
Equipe Weave Notes
support@gaelgomes.dev
  `.trim();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #0a0a0a; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #fafafa; }
    .container { background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .header { background: #0a0a0a; color: #ffffff; padding: 40px 30px; border-bottom: 4px solid #eab308; }
    .header h1 { margin: 0 0 10px 0; font-size: 24px; font-weight: 600; }
    .header p { margin: 0; font-size: 14px; color: #d4d4d4; }
    .content { padding: 40px 30px; }
    .greeting { font-size: 16px; margin-bottom: 20px; color: #0a0a0a; }
    .download-section { text-align: center; margin: 30px 0; padding: 30px; background: #fafafa; border-radius: 6px; }
    .download-btn { background: #eab308; color: #0a0a0a; padding: 16px 40px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; font-size: 16px; }
    .download-btn:hover { background: #ca9a06; }
    .warning-box { background: #fef3c7; border: 2px solid #eab308; padding: 20px; border-radius: 6px; margin: 25px 0; }
    .warning-box h4 { margin: 0 0 12px 0; font-size: 15px; color: #92400e; font-weight: 600; }
    .warning-box ul { margin: 10px 0; padding-left: 20px; color: #92400e; font-size: 14px; }
    .warning-box li { margin: 8px 0; }
    .info-box { background: #fafafa; border: 1px solid #e5e5e5; padding: 20px; border-radius: 6px; margin: 25px 0; }
    .info-box h4 { margin: 0 0 12px 0; font-size: 15px; color: #0a0a0a; font-weight: 600; }
    .info-box ul { margin: 10px 0; padding-left: 20px; color: #525252; font-size: 14px; }
    .info-box li { margin: 8px 0; }
    .expiry-notice { text-align: center; color: #92400e; font-size: 13px; margin-top: 15px; font-weight: 500; }
    .footer { background: #fafafa; padding: 30px; text-align: center; border-top: 1px solid #e5e5e5; }
    .footer-content { color: #737373; font-size: 14px; }
    .footer-content strong { color: #0a0a0a; }
    .footer-content a { color: #0a0a0a; text-decoration: none; }
    .footer-note { font-size: 12px; color: #a3a3a3; margin-top: 15px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Backup Pronto!</h1>
      <p>Seu arquivo está disponível para download</p>
    </div>
    
    <div class="content">
      <p class="greeting">Prezado(a) ${userName},</p>
      
      <p>Seu backup de dados foi processado com sucesso e está pronto para download.</p>
      
      <div class="download-section">
        <a href="${downloadUrl}" class="download-btn">⬇️ Baixar Backup Agora</a>
        <p class="expiry-notice">⏱️ Expira em ${hoursValid} horas (${expiresAt})</p>
      </div>

      <div class="warning-box">
        <h4>⚠️ Importante: Segurança e Validade</h4>
        <ul>
          <li>Este link expira em <strong>${hoursValid} horas</strong></li>
          <li>Após a expiração, o arquivo será <strong>automaticamente deletado</strong></li>
          <li>O link só pode ser usado <strong>uma única vez</strong></li>
          <li>Não compartilhe este link com outras pessoas</li>
          <li>Faça o download em um local seguro</li>
        </ul>
      </div>

      <div class="info-box">
        <h4>📄 Sobre o Arquivo</h4>
        <ul>
          <li><strong>Formato:</strong> CSV (compatível com Excel e Google Sheets)</li>
          <li><strong>Conteúdo:</strong> Todas as suas notas e blocos ativos</li>
          <li><strong>Estrutura:</strong> Cada linha representa um bloco de uma nota</li>
          <li><strong>Filtros:</strong> Blocos deletados não estão incluídos</li>
        </ul>
      </div>

      <p style="color: #525252; font-size: 14px;">Caso tenha dúvidas ou precise de um novo backup, entre em contato com nossa equipe de suporte.</p>
    </div>

    <div class="footer">
      <div class="footer-content">
        <strong>Weave Notes</strong><br>
        <a href="mailto:support@gaelgomes.dev">support@gaelgomes.dev</a><br>
        <a href="https://notes.gaelgomes.dev">notes.gaelgomes.dev</a>
      </div>
      <p class="footer-note">
        Este email foi enviado automaticamente. Por favor, não responda.
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();

  return {
    subject,
    text,
    html,
  };
}

module.exports = backupReadyTemplate;
