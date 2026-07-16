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
      contentHtml: `
        <div style="margin: 16px 0; padding: 14px; border: 1px solid #E5E7EB; border-radius: 8px; background: #F9FAFB;">
          <p style="margin: 0 0 8px; font-size: 14px; color: #111827;"><strong>${escapeHtml(t(locale, "common.format"))}:</strong> ${escapeHtml(t(locale, "common.formatCsv"))}</p>
          <p style="margin: 0; font-size: 14px; color: #111827;"><strong>${escapeHtml(t(locale, "common.content"))}:</strong> ${escapeHtml(t(locale, "common.contentNotesBlocks"))}</p>
        </div>
      `,
      ctaText: t(locale, "backup.cta"),
      ctaUrl: downloadUrl,
      greeting: `${displayName},`,
      infoText: t(locale, "backup.info", {
        expiresLabel,
        hours: hoursUntilExpiration,
      }),
      introLines: [t(locale, "backup.intro1"), t(locale, "backup.intro2")],
      locale,
      outroLines: [t(locale, "backup.outro")],
      preheader: t(locale, "backup.preheader"),
      subtitle: t(locale, "backup.subtitle"),
      title: t(locale, "backup.title"),
    });

    await MailService().sendMail({
      from: process.env.EMAIL_FROM,
      html,
      subject: t(locale, "backup.subject"),
      text,
      to: userEmail,
    });

    return { success: true };
  } catch (error) {
    return {
      error: error.message || "Falha ao enviar email de backup.",
      success: false,
    };
  }
}

/**
 * @param {object} params
 * @returns {{ html: string, text: string, subject: string }}
 */
function buildBackupEmailPayload({ locale, userName, downloadUrl, expiresAt }) {
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
    contentHtml: `
      <div style="margin: 16px 0; padding: 14px; border: 1px solid #E5E7EB; border-radius: 8px; background: #F9FAFB;">
        <p style="margin: 0 0 8px; font-size: 14px; color: #111827;"><strong>${escapeHtml(t(resolvedLocale, "common.format"))}:</strong> ${escapeHtml(t(resolvedLocale, "common.formatCsv"))}</p>
        <p style="margin: 0; font-size: 14px; color: #111827;"><strong>${escapeHtml(t(resolvedLocale, "common.content"))}:</strong> ${escapeHtml(t(resolvedLocale, "common.contentNotesBlocks"))}</p>
      </div>
    `,
    ctaText: t(resolvedLocale, "backup.cta"),
    ctaUrl: downloadUrl,
    greeting: `${displayName},`,
    infoText: t(resolvedLocale, "backup.info", {
      expiresLabel,
      hours: hoursUntilExpiration,
    }),
    introLines: [
      t(resolvedLocale, "backup.intro1"),
      t(resolvedLocale, "backup.intro2"),
    ],
    locale: resolvedLocale,
    outroLines: [t(resolvedLocale, "backup.outro")],
    preheader: t(resolvedLocale, "backup.preheader"),
    subtitle: t(resolvedLocale, "backup.subtitle"),
    title: t(resolvedLocale, "backup.title"),
  });

  return {
    html,
    subject: t(resolvedLocale, "backup.subject"),
    text,
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
  buildBackupEmailPayload,
  formatFileSize,
  sendBackupEmail,
};
