const { MailService } = require("@/services/email/config/index");
const { buildDueReminderTemplate } = require("./due-reminder-mail");

/**
 * @param {string} toEmail
 * @param {string} recipientName
 * @param {string} noteTitle
 * @param {Date|string} dueDate
 * @param {string} noteId
 * @returns {Promise<{ success: boolean; error?: string }>}
 */
async function sendDueReminderEmail(toEmail, recipientName, noteTitle, dueDate, noteId) {
  try {
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const noteUrl = noteId
      ? `${frontendUrl}/auth/?redirect=/app/notes/${noteId}`
      : `${frontendUrl}/auth/?redirect=/app/notes`;

    const dueDateLabel = new Date(dueDate).toLocaleString("pt-BR", {
      dateStyle: "full",
      timeStyle: "short",
      timeZone: "UTC",
    });

    const emailTemplate = buildDueReminderTemplate({
      recipientName,
      noteTitle,
      dueDateLabel,
      noteUrl,
    });

    await MailService().sendMail({
      from: process.env.EMAIL_FROM,
      to: toEmail,
      subject: emailTemplate.subject,
      text: emailTemplate.text,
      html: emailTemplate.html,
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error.message || "Falha ao enviar lembrete de prazo.",
    };
  }
}

module.exports = { sendDueReminderEmail };
