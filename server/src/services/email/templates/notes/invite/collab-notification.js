const { MailService } = require("@/services/email/config/index");
const addedToNoteTemplate = require(".");

/**
 * Envia email de notificação quando um colaborador é adicionado à nota
 * @param {string} collaboratorEmail - Email do colaborador
 * @param {string} collaboratorName - Nome do colaborador
 * @param {string} noteName - Nome da nota
 * @param {string} ownerName - Nome do proprietário da nota
 * @param {string} noteId - ID da nota (opcional)
 * @returns {Object} - { success: boolean, error?: string }
 */
async function collabMail(
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
      ? `${frontendUrl}/auth/?redirect=/app/notes/view/${noteId}`
      : `${frontendUrl}/auth/?redirect=/app/notes`;

    // Gerar o template do email
    const emailTemplate = addedToNoteTemplate({
      noteName,
      ownerName,
      noteUrl,
    });

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: collaboratorEmail,
      subject: emailTemplate.subject,
      text: emailTemplate.text,
      html: emailTemplate.html,
    };

    await MailService().sendMail(mailOptions);

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error.message || "Falha ao enviar email de notificação.",
    };
  }
}

module.exports = {
  collabMail,
};
