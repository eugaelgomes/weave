const { MailService } = require("@/services/email/config");
const {
  buildMailTemplate,
  escapeHtml,
} = require("@/services/email/mail-template");
const {
  formatDateForLocale,
  getUserEmailLocale,
  resolveEmailLocale,
  t,
} = require("@/services/email/i18n");

/**
 * @param {object} params
 * @param {string} params.userEmail
 * @param {string} params.userName
 * @param {string} params.downloadUrl
 * @param {Date|string} params.expiresAt
 * @param {string} [params.locale]
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
async function sendBackupEmail({
  userEmail,
  userName,
  downloadUrl,
  expiresAt,
  locale: localeHint,
}) {
  const locale = localeHint
    ? resolveEmailLocale(localeHint)
    : await getUserEmailLocale({ email: userEmail });

  try {
    const hoursUntilExpiration = Math.max(
      1,
      Math.round((new Date(expiresAt) - new Date()) / (1000 * 60 * 60))
    );
    const expiresLabel = formatDateForLocale(locale, expiresAt, {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: undefined,
    });

    const displayName = userName || t(locale, "common.greetingFallback");

    const { html, text } = buildMailTemplate({
      locale,
      preheader: t(locale, "backup.preheader"),
      title: t(locale, "backup.title"),
      subtitle: t(locale, "backup.subtitle"),
      greeting: `${displayName},`,
      introLines: [t(locale, "backup.intro1"), t(locale, "backup.intro2")],
      ctaText: t(locale, "backup.cta"),
      ctaUrl: downloadUrl,
      infoText: t(locale, "backup.info", { hours: hoursUntilExpiration, expiresLabel }),
      contentHtml: `
        <div style="margin: 16px 0; padding: 14px; border: 1px solid #E5E7EB; border-radius: 8px; background: #F9FAFB;">
          <p style="margin: 0 0 8px; font-size: 14px; color: #111827;"><strong>${escapeHtml(t(locale, "common.format"))}:</strong> ${escapeHtml(t(locale, "common.formatCsv"))}</p>
          <p style="margin: 0; font-size: 14px; color: #111827;"><strong>${escapeHtml(t(locale, "common.content"))}:</strong> ${escapeHtml(t(locale, "common.contentNotesBlocks"))}</p>
        </div>
      `,
      outroLines: [t(locale, "backup.outro")],
    });

    await MailService().sendMail({
      from: process.env.EMAIL_FROM,
      to: userEmail,
      subject: t(locale, "backup.subject"),
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

/**
 * @param {object} params
 * @returns {{ html: string, text: string, subject: string }}
 */
function buildBackupEmailPayload({
  locale,
  userName,
  downloadUrl,
  expiresAt,
}) {
  const resolvedLocale = resolveEmailLocale(locale);
  const hoursUntilExpiration = Math.max(
    1,
    Math.round((new Date(expiresAt) - new Date()) / (1000 * 60 * 60))
  );
  const expiresLabel = formatDateForLocale(resolvedLocale, expiresAt, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: undefined,
  });
  const displayName = userName || t(resolvedLocale, "common.greetingFallback");

  const { html, text } = buildMailTemplate({
    locale: resolvedLocale,
    preheader: t(resolvedLocale, "backup.preheader"),
    title: t(resolvedLocale, "backup.title"),
    subtitle: t(resolvedLocale, "backup.subtitle"),
    greeting: `${displayName},`,
    introLines: [
      t(resolvedLocale, "backup.intro1"),
      t(resolvedLocale, "backup.intro2"),
    ],
    ctaText: t(resolvedLocale, "backup.cta"),
    ctaUrl: downloadUrl,
    infoText: t(resolvedLocale, "backup.info", {
      hours: hoursUntilExpiration,
      expiresLabel,
    }),
    contentHtml: `
      <div style="margin: 16px 0; padding: 14px; border: 1px solid #E5E7EB; border-radius: 8px; background: #F9FAFB;">
        <p style="margin: 0 0 8px; font-size: 14px; color: #111827;"><strong>${escapeHtml(t(resolvedLocale, "common.format"))}:</strong> ${escapeHtml(t(resolvedLocale, "common.formatCsv"))}</p>
        <p style="margin: 0; font-size: 14px; color: #111827;"><strong>${escapeHtml(t(resolvedLocale, "common.content"))}:</strong> ${escapeHtml(t(resolvedLocale, "common.contentNotesBlocks"))}</p>
      </div>
    `,
    outroLines: [t(resolvedLocale, "backup.outro")],
  });

  return {
    html,
    text,
    subject: t(resolvedLocale, "backup.subject"),
  };
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
  buildBackupEmailPayload,
  formatFileSize,
};
