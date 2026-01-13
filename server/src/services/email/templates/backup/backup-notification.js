const { MailService } = require("@/services/email/config/index");
const backupReadyTemplate = require("@/services/email/templates/backup/index");

/**
 * Envia email com link de download do backup
 * @param {string} userEmail - Email do usuário
 * @param {string} userName - Nome do usuário
 * @param {string} downloadUrl - URL de download do backup
 * @param {Date} expiresAt - Data de expiração do link
 * @returns {Object} - { success: boolean, error?: string }
 */
async function sendBackupEmail(userEmail, userName, downloadUrl, expiresAt) {
  try {
    // Calcular tempo até expiração
    const hoursUntilExpiration = Math.round(
      (new Date(expiresAt) - new Date()) / (1000 * 60 * 60)
    );

    // Gerar o template do email
    const emailTemplate = backupReadyTemplate({
      userName: userName,
      downloadUrl: downloadUrl,
      expiresAt: new Date(expiresAt).toLocaleString("pt-BR"),
      hoursValid: hoursUntilExpiration,
    });

    const mailOptions = {
      from: "Weave Notes <hello@gaelgomes.dev>",
      to: userEmail,
      subject: emailTemplate.subject,
      text: emailTemplate.text,
      html: emailTemplate.html,
    };

    await MailService().sendMail(mailOptions);

    return {
      success: true,
    };
  } catch (error) {
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
