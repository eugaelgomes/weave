const { MailService } = require("@/services/email/config/index");
const addedToNoteTemplate = require("./added-to-note");

/**
 * Envia email de notificação quando um colaborador é adicionado à nota
 * @param {string} collaboratorEmail - Email do colaborador
 * @param {string} collaboratorName - Nome do colaborador
 * @param {string} noteName - Nome da nota
 * @param {string} ownerName - Nome do proprietário da nota
 * @param {string} noteId - ID da nota (opcional)
 * @returns {Object} - { success: boolean, error?: string }
 */
async function sendCollaborationNotification(
  collaboratorEmail,
  collaboratorName,
  noteName,
  ownerName,
  noteId = null
) {
  try {
    const env = process.env.NODE_ENV || "development";
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    // Redirecionar para login com parâmetro de redirect para a nota
    const noteUrl = noteId
      ? `${frontendUrl}/auth/signin?redirect=/app/notes/view/${noteId}`
      : `${frontendUrl}/auth/signin?redirect=/app/notes`;

    // Gerar o template do email
    const emailTemplate = addedToNoteTemplate({
      noteName,
      ownerName,
      noteUrl,
    });

    const mailOptions = {
      from: "Weave Notes <hello@gaelgomes.dev>",
      to: collaboratorEmail,
      subject: emailTemplate.subject,
      text: emailTemplate.text,
      html: emailTemplate.html,
    };

    await MailService().sendMail(mailOptions);

    console.log(`📧 Email de colaboração enviado para ${collaboratorEmail}`);
    return { success: true };
  } catch (error) {
    console.error("❌ Erro ao enviar email de colaboração:", error);
    return {
      success: false,
      error: error.message || "Falha ao enviar email de notificação.",
    };
  }
}

module.exports = {
  sendCollaborationNotification,
};
