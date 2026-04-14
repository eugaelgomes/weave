const { MailService } = require("@/services/email/config/index");

const contactEmail = process.env.CONTACT_EMAIL || "contact@gaelgomes.dev";

/**
 * Confirmação por e-mail após aceitar convite de organização.
 */
async function send_organization_invite_accepted(
  toEmail,
  organizationName,
  areaName,
  areasUrl
) {
  const safeOrg = organizationName || "organização";
  const areaLine = areaName
    ? `<p><strong>Área:</strong> ${areaName}</p>`
    : "";

  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: toEmail,
      subject: `Bem-vindo à ${safeOrg} — Weave Notes`,
      html: `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><title>Convite aceito</title></head>
<body style="margin:0;background:#fafafa;font-family:'Segoe UI',Arial,sans-serif;color:#0a0a0a;">
  <div style="max-width:600px;margin:30px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    <div style="background:#0a0a0a;padding:28px 24px;text-align:center;border-bottom:4px solid #eab308;">
      <h1 style="margin:0;color:#fff;font-size:22px;">Weave Notes</h1>
      <small style="color:#d4d4d4;font-size:13px;">Convite aceito</small>
    </div>
    <div style="padding:32px 28px;">
      <p>Olá,</p>
      <p>Você entrou na organização <strong>${safeOrg}</strong>.</p>
      ${areaLine}
      <div style="text-align:center;margin:28px 0;">
        <a href="${areasUrl}" style="display:inline-block;background:#eab308;color:#0a0a0a !important;padding:14px 28px;border-radius:6px;font-weight:600;text-decoration:none;">Abrir áreas da organização</a>
      </div>
      <p style="font-size:13px;color:#737373;">Se o botão não funcionar, copie este endereço: ${areasUrl}</p>
    </div>
    <div style="background:#fafafa;padding:24px;text-align:center;border-top:1px solid #e5e5e5;font-size:13px;color:#737373;">
      <p><strong>Weave Notes</strong></p>
      <p>${contactEmail}</p>
    </div>
  </div>
</body>
</html>`,
    };

    await MailService().sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error("Invite accepted email failed:", error);
    return { success: false, error: error.message };
  }
}

module.exports = { send_organization_invite_accepted };
