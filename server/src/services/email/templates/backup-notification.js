const { MailService } = require("@/services/email/config");
const {
  buildMailTemplate,
  escapeHtml,
} = require("@/services/email/mail-template");

async function sendBackupEmail(userEmail, userName, downloadUrl, expiresAt) {
  try {
    const hoursUntilExpiration = Math.round(
      (new Date(expiresAt) - new Date()) / (1000 * 60 * 60)
    );

    const expiresLabel = new Date(expiresAt).toLocaleString("pt-BR");
    const { html, text } = buildMailTemplate({
      preheader: "Seu backup esta pronto para download.",
      title: "Backup pronto para download",
      subtitle: "Exportacao de dados",
      greeting: `Ola ${userName || "usuario"},`,
      introLines: [
        "Seu backup de dados foi processado com sucesso.",
        "Use o botao abaixo para baixar o arquivo.",
      ],
      ctaText: "Baixar backup",
      ctaUrl: downloadUrl,
      infoText: `Este link expira em ${hoursUntilExpiration} hora(s) (${expiresLabel}) e pode ser usado uma unica vez.`,
      contentHtml: `
        <div style="margin: 16px 0; padding: 14px; border: 1px solid #E5E7EB; border-radius: 8px; background: #F9FAFB;">
          <p style="margin: 0 0 8px; font-size: 14px; color: #111827;"><strong>Formato:</strong> CSV (Excel/Google Sheets)</p>
          <p style="margin: 0 0 8px; font-size: 14px; color: #111827;"><strong>Conteudo:</strong> notas e blocos ativos</p>
          <p style="margin: 0; font-size: 13px; color: #6B7280; word-break: break-all;">Link direto: ${escapeHtml(downloadUrl)}</p>
        </div>
      `,
      outroLines: [
        "Mantenha este link em seguranca e faca o download em um local confiavel.",
      ],
    });

    await MailService().sendMail({
      from: process.env.EMAIL_FROM,
      to: userEmail,
      subject: "Seu backup esta pronto para download",
      text,
      html,
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error.message || "Falha ao enviar email de backup.",
    };
  }
}

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
