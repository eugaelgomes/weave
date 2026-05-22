/**
 * AI Report Email Template
 */

const { buildMailTemplate } = require("../template");
const { markdownToHtml } = require("../../markdown/markdown-to-html");
const { env } = require("../../../config");
const { getReportTypeLabel, resolveEmailLocale, t } = require("../i18n");

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
  const ctaUrl = reasoningId
    ? `${appUrl}/projects/${projectId}/reasonings/${reasoningId}`
    : `${appUrl}/projects/${projectId}`;

  const contentHtml = markdownToHtml(outputMarkdown || "");

  const greeting = recipientName
    ? `${recipientName},`
    : undefined;

  const { html, text } = buildMailTemplate({
    locale,
    title: typeLabel,
    subtitle: `${projectTitle}${sprintSuffix ? ` • Sprint ${sprintNumber}` : ""}`,
    greeting,
    contentHtml,
    ctaText: t(locale, "aiReport.cta"),
    ctaUrl,
    preheader: t(locale, "aiReport.preheader", {
      reportType: typeLabel.toLowerCase(),
      projectTitle,
    }),
    introLines: [t(locale, "aiReport.intro", { projectTitle })],
    footerNote: t(locale, "aiReport.footer"),
  });

  return { html, text, subject };
}

module.exports = { buildAiReportEmail };
