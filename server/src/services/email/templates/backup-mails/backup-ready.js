/**
 * Template de email para entrega de backup de dados
 * @param {Object} options - Opções do template
 * @param {string} options.userName - Nome do usuário
 * @param {string} options.totalNotes - Total de notas no backup
 * @param {string} options.fileSize - Tamanho do arquivo
 * @param {string} options.downloadUrl - URL para download (opcional)
 * @returns {Object} Template do email
 */
function backupReadyTemplate({ userName, totalNotes, fileSize, downloadUrl = null }) {
  const subject = "Backup de dados disponível";

  const text = `
Prezado(a) ${userName},

Seu backup de dados foi processado com sucesso e está disponível para download.

DETALHES DO BACKUP:
Total de registros: ${totalNotes}
Tamanho do arquivo: ${fileSize}
Data de geração: ${new Date().toLocaleString("pt-BR")}

${downloadUrl 
  ? `Link para download: ${downloadUrl}` 
  : "O arquivo está anexado a este email."
}

INFORMAÇÕES IMPORTANTES:
- Este backup contém todas as suas notas e blocos ativos
- Dados sensíveis foram removidos por segurança
- Formato: CSV (compatível com Excel e Google Sheets)
- Cada linha representa um bloco de uma nota

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
    .details { background: #fafafa; padding: 20px; border-radius: 6px; margin: 25px 0; border-left: 4px solid #eab308; }
    .details h3 { margin: 0 0 15px 0; font-size: 16px; color: #0a0a0a; font-weight: 600; }
    .detail-item { margin: 12px 0; padding: 10px 0; border-bottom: 1px solid #e5e5e5; display: flex; justify-content: space-between; }
    .detail-item:last-child { border-bottom: none; }
    .detail-label { color: #737373; font-size: 14px; }
    .detail-value { color: #0a0a0a; font-weight: 500; font-size: 14px; }
    .download-section { text-align: center; margin: 30px 0; }
    .download-btn { background: #eab308; color: #0a0a0a; padding: 14px 32px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; font-size: 15px; }
    .download-btn:hover { background: #ca9a06; }
    .info-box { background: #fafafa; border: 1px solid #e5e5e5; padding: 20px; border-radius: 6px; margin: 25px 0; }
    .info-box h4 { margin: 0 0 12px 0; font-size: 15px; color: #0a0a0a; font-weight: 600; }
    .info-box ul { margin: 10px 0; padding-left: 20px; color: #525252; font-size: 14px; }
    .info-box li { margin: 8px 0; }
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
      <h1>Backup Disponível</h1>
      <p>Processamento concluído com sucesso</p>
    </div>
    
    <div class="content">
      <p class="greeting">Prezado(a) ${userName},</p>
      
      <p>Seu backup de dados foi processado com sucesso e está disponível para download.</p>
      
      <div class="details">
        <h3>Detalhes do Backup</h3>
        <div class="detail-item">
          <span class="detail-label">Total de registros</span>
          <span class="detail-value">${totalNotes}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Tamanho do arquivo</span>
          <span class="detail-value">${fileSize}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Data de geração</span>
          <span class="detail-value">${new Date().toLocaleString("pt-BR")}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Formato</span>
          <span class="detail-value">CSV</span>
        </div>
      </div>

      ${downloadUrl 
        ? `<div class="download-section">
             <a href="${downloadUrl}" class="download-btn">Baixar Backup</a>
           </div>`
        : `<div class="info-box">
             <h4>Arquivo Anexado</h4>
             <p style="margin: 0; color: #525252;">O arquivo de backup está anexado a este email.</p>
           </div>`
      }

      <div class="info-box">
        <h4>Informações de Segurança</h4>
        <ul>
          <li>Contém todas as notas e blocos ativos da sua conta</li>
          <li>Dados sensíveis foram removidos por segurança</li>
          <li>Blocos deletados não estão incluídos</li>
          <li>Formato CSV compatível com Excel e Google Sheets</li>
          <li>Cada linha representa um bloco de uma nota</li>
        </ul>
      </div>

      <p style="color: #525252; font-size: 14px;">Caso tenha dúvidas, entre em contato com nossa equipe de suporte.</p>
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
    html
  };
}

module.exports = backupReadyTemplate;