const { MailService } = require("@/services/email/config/index");
const backupReadyTemplate = require("@/services/email/templates/backup/backup-ready");

/**
 * Envia email com backup de dados do usuário
 * @param {string} userEmail - Email do usuário
 * @param {string} userName - Nome do usuário
 * @param {Object} backupData - Dados do backup
 * @param {Object} options - Opções do envio
 * @returns {Object} - { success: boolean, error?: string }
 */
async function sendBackupEmail(userEmail, userName, backupData, options = {}) {
  try {
    // backupData agora é uma string CSV
    const fileSizeBytes = Buffer.byteLength(backupData, "utf8");
    const fileSize = formatFileSize(fileSizeBytes);

    // Contar linhas para obter total de registros (linha 1 é cabeçalho)
    const totalLines = backupData.split("\n").length - 1;

    // Verificar se arquivo não é muito grande para email (limite: 25MB)
    const maxEmailSize = 25 * 1024 * 1024; // 25MB
    const sendAsAttachment = fileSizeBytes < maxEmailSize;

    // Gerar o template do email
    const emailTemplate = backupReadyTemplate({
      userName: userName,
      totalNotes: totalLines,
      fileSize: fileSize,
      downloadUrl: options.downloadUrl || null,
    });

    const mailOptions = {
      from: "Weave Notes <hello@gaelgomes.dev>",
      to: userEmail,
      subject: emailTemplate.subject,
      text: emailTemplate.text,
      html: emailTemplate.html,
    };

    // Adicionar anexo se arquivo não for muito grande
    if (sendAsAttachment && !options.downloadUrl) {
      const filename = `notes-backup-${Date.now()}.csv`;
      mailOptions.attachments = [
        {
          filename: filename,
          content: backupData,
          contentType: "text/csv",
        },
      ];
    }

    await MailService().sendMail(mailOptions);

    console.log(`📧 Email de backup enviado para ${userEmail} (${fileSize})`);
    return {
      success: true,
      fileSize: fileSizeBytes,
      sentAsAttachment: sendAsAttachment,
    };
  } catch (error) {
    console.error("❌ Erro ao enviar email de backup:", error);
    return {
      success: false,
      error: error.message || "Falha ao enviar email de backup.",
    };
  }
}

/**
 * Formata tamanho de arquivo em formato legível
 * @param {number} bytes - Tamanho em bytes
 * @returns {string} Tamanho formatado
 */
function formatFileSize(bytes) {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

module.exports = {
  sendBackupEmail,
  formatFileSize,
};
