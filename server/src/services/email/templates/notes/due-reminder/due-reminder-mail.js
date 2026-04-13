/**
 * @param {Object} params
 * @param {string} params.recipientName
 * @param {string} params.noteTitle
 * @param {string} params.dueDateLabel
 * @param {string} params.noteUrl
 */
function buildDueReminderTemplate({
  recipientName,
  noteTitle,
  dueDateLabel,
  noteUrl,
}) {
  const safeName = recipientName || "Olá";
  const subject = `Lembrete: prazo amanhã — ${noteTitle}`;
  const text = `${safeName},\n\nA nota "${noteTitle}" tem prazo em ${dueDateLabel}.\n\nAbrir: ${noteUrl}\n`;
  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"></head>
<body style="margin:0;font-family:Segoe UI,Arial,sans-serif;background:#fafafa;color:#0a0a0a;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.08);overflow:hidden;">
          <tr>
            <td style="background:#0a0a0a;padding:28px 24px;border-bottom:4px solid #eab308;">
              <h1 style="margin:0;color:#fff;font-size:22px;">Weave Notes</h1>
              <small style="color:#d4d4d4;font-size:13px;">Lembrete de prazo</small>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 24px;">
              <p style="margin:0 0 14px;font-size:15px;color:#404040;">${safeName},</p>
              <p style="margin:0 0 14px;font-size:15px;line-height:1.55;color:#525252;">
                A nota <strong>${escapeHtml(noteTitle)}</strong> tem prazo <strong>amanhã</strong>
                (${escapeHtml(dueDateLabel)}).
              </p>
              <p style="margin:20px 0 0;">
                <a href="${noteUrl}" style="display:inline-block;background:#eab308;color:#0a0a0a;text-decoration:none;padding:10px 18px;border-radius:6px;font-weight:600;font-size:14px;">Abrir nota</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  return { subject, text, html };
}

/**
 * @param {string} s
 */
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

module.exports = { buildDueReminderTemplate };
