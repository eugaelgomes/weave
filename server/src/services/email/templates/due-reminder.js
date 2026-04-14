const { MailService } = require("@/services/email/config");
const { buildMailTemplate, escapeHtml } = require("@/services/email/mail-template");

function buildDueReminderTemplate({ recipientName, noteTitle, dueDateLabel, noteUrl }) {
  const subject = `Lembrete: prazo amanha - ${noteTitle}`;
  const { html, text } = buildMailTemplate({
    preheader: "Lembrete de prazo da sua nota.",
    title: "Lembrete de prazo",
    subtitle: "Vencimento da nota",
    greeting: `${recipientName || "Ola"},`,
    introLines: [
      `A nota "${noteTitle}" vence amanha (${dueDateLabel}).`,
    ],
    ctaText: "Abrir nota",
    ctaUrl: noteUrl,
    infoText: "Recomendamos revisar a nota hoje para evitar atrasos.",
    contentHtml: `
      <div style="margin: 16px 0; padding: 14px; border: 1px solid #E5E7EB; border-radius: 8px; background: #F9FAFB;">
        <p style="margin: 0 0 6px; font-size: 14px; color: #111827;"><strong>Nota:</strong> ${escapeHtml(noteTitle)}</p>
        <p style="margin: 0; font-size: 14px; color: #111827;"><strong>Prazo:</strong> ${escapeHtml(dueDateLabel)}</p>
      </div>
    `,
  });

  return { subject, text, html };
}

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

module.exports = { sendDueReminderEmail, buildDueReminderTemplate };
