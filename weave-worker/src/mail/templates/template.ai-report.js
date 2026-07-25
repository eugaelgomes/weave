/**
 * AI Report Email Template
 */

const { buildMailTemplate } = require("../base-template");
const { markdownToHtml } = require("../../modules/markdown/markdown-to-html");
const { env } = require("../../config/enviroment");
const { getReportTypeLabel, resolveEmailLocale, t } = require("../i18n/locales.translator");

/**
 * @param {object} options
 * @returns {{ html: string, text: string, subject: string }}
 */
function buildAiReportEmail({
  locale: rawLocale,
  reportType,
  projectTitle,
  sprintNumber,
  outputMarkdown,
  projectId,
  projectPublicId,
  reasoningId,
  recipientName,
}) {
  const locale = resolveEmailLocale(rawLocale);
  const typeLabel = getReportTypeLabel(locale, reportType);

  const sprintSuffix = sprintNumber
    ? t(locale, "aiReport.sprintSuffix", { sprintNumber })
    : "";

  const subject = `${typeLabel} — ${projectTitle}${sprintSuffix}`;

  const appUrl = env.appUrl || process.env.APP_URL || "https://app.weavenotes.com";
  const targetId = projectPublicId || projectId;
  const ctaUrl = reasoningId
    ? `${appUrl}/projects/${targetId}/reasonings/${reasoningId}`
    : `${appUrl}/projects/${targetId}`;

  const contentHtml = markdownToHtml(outputMarkdown || "");

  const greeting = recipientName
    ? `${recipientName},`
    : undefined;

  const { html, text } = buildMailTemplate({
    contentHtml,
    ctaText: t(locale, "aiReport.cta"),
    ctaUrl,
    footerNote: t(locale, "aiReport.footer"),
    greeting,
    introLines: [t(locale, "aiReport.intro", { projectTitle })],
    locale,
    preheader: t(locale, "aiReport.preheader", {
      projectTitle,
      reportType: typeLabel.toLowerCase(),
    }),
    subtitle: `${projectTitle}${sprintSuffix ? ` • Sprint ${sprintNumber}` : ""}`,
    title: typeLabel,
  });

  return { html, subject, text };
}

module.exports = { buildAiReportEmail };
