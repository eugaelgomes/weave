/**
 * AI Report Email Template
 *
 * Builds the email payload for weave-engine reasoning reports
 * using the existing buildMailTemplate infrastructure.
 */

const { buildMailTemplate } = require("../template");
const { markdownToHtml } = require("../../markdown/markdown-to-html");
const { env } = require("../../../config");

const REPORT_TYPE_LABELS = {
  sprint_kickoff: "Sprint Kickoff",
  daily_standup: "Daily Standup",
  sprint_review: "Sprint Review",
  deadline_alert: "Deadline Alert",
  analysis: "Analysis",
};

/**
 * Builds an AI report email.
 *
 * @param {object} options
 * @param {string} options.reportType - e.g. "daily_standup"
 * @param {string} options.projectTitle
 * @param {number} [options.sprintNumber]
 * @param {string} options.outputMarkdown - The reasoning content
 * @param {string} options.projectId
 * @param {string} [options.reasoningId]
 * @param {string} [options.recipientName]
 * @returns {{ html: string, text: string, subject: string }}
 */
function buildAiReportEmail({
  reportType,
  projectTitle,
  sprintNumber,
  outputMarkdown,
  projectId,
  reasoningId,
  recipientName,
}) {
  const typeLabel =
    REPORT_TYPE_LABELS[reportType] || reportType || "AI Report";

  const subject = `${typeLabel} — ${projectTitle}${sprintNumber ? ` (Sprint ${sprintNumber})` : ""}`;

  const appUrl = env.appUrl || process.env.APP_URL || "https://app.weavenotes.com";
  const ctaUrl = reasoningId
    ? `${appUrl}/projects/${projectId}/reasonings/${reasoningId}`
    : `${appUrl}/projects/${projectId}`;

  const contentHtml = markdownToHtml(outputMarkdown || "");

  const { html, text } = buildMailTemplate({
    title: typeLabel,
    subtitle: `${projectTitle}${sprintNumber ? ` • Sprint ${sprintNumber}` : ""}`,
    greeting: recipientName ? `Olá, ${recipientName}` : undefined,
    contentHtml,
    ctaText: "Ver Report Completo",
    ctaUrl,
    preheader: `Novo ${typeLabel.toLowerCase()} para ${projectTitle}`,
    introLines: [
      `O Weave Engine gerou um novo report para o projeto ${projectTitle}.`,
    ],
    footerNote:
      "Este report foi gerado automaticamente pela IA do Weave Notes.",
  });

  return { html, text, subject };
}

module.exports = { buildAiReportEmail, REPORT_TYPE_LABELS };
