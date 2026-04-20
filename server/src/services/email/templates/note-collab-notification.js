const { MailService } = require("@/services/email/config");
const {
  buildMailTemplate,
  escapeHtml,
} = require("@/services/email/mail-template");

function createCollabTemplate({ noteName, ownerName, noteUrl }) {
  const subject = `Nova colaboracao: ${noteName}`;
  const { html, text } = buildMailTemplate({
    preheader: "Voce foi adicionado(a) como colaborador de uma nota.",
    title: "Nova colaboracao em nota",
    subtitle: "Compartilhamento de nota",
    introLines: [`${ownerName} adicionou voce como colaborador(a).`],
    ctaText: "Acessar nota",
    ctaUrl: noteUrl,
    contentHtml: `
      <div style="margin: 16px 0; padding: 14px; border: 1px solid #E5E7EB; border-radius: 8px; background: #F9FAFB;">
        <p style="margin: 0 0 6px; font-size: 14px; color: #111827;"><strong>Nota:</strong> ${escapeHtml(noteName)}</p>
        <p style="margin: 0; font-size: 13px; color: #6B7280;">Permissao de colaboracao ativa para visualizar e editar.</p>
      </div>
    `,
    outroLines: [
      `Se voce nao esperava este convite de ${ownerName}, pode ignorar este email.`,
    ],
  });

  return { subject, html, text };
}

async function collabMail(
  collaboratorEmail,
  collaboratorName,
  noteName,
  ownerName,
  noteId = null
) {
  try {
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const noteUrl = noteId
      ? `${frontendUrl}/auth/?redirect=/app/notes/view/${noteId}`
      : `${frontendUrl}/auth/?redirect=/app/notes`;

    const emailTemplate = createCollabTemplate({
      noteName,
      ownerName,
      noteUrl,
      collaboratorName,
    });

    await MailService().sendMail({
      from: process.env.EMAIL_FROM,
      to: collaboratorEmail,
      subject: emailTemplate.subject,
      text: emailTemplate.text,
      html: emailTemplate.html,
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error.message || "Falha ao enviar email de notificacao.",
    };
  }
}

module.exports = { collabMail };
