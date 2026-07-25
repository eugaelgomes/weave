const { buildMailTemplate, escapeHtml } = require("../base-template");
const { localeFromUserPreference, resolveEmailLocale, t } = require("../i18n/locales.translator");

/**
 * @param {object} params
 * @returns {{ subject: string, html: string, text: string }}
 */
function buildCycleSummaryTemplate({
  locale,
  userPreference,
  name,
  planName,
  aiMessages,
  notesTotal,
  projectsTotal,
  totalExports,
  nextPeriodEnd,
}) {
  const resolvedLocale = locale
    ? resolveEmailLocale(locale)
    : localeFromUserPreference(userPreference);

  const displayName = name || t(resolvedLocale, "common.greetingFallback");

  const subject = `Your ${planName} billing cycle has been renewed`;
  const { html, text } = buildMailTemplate({
    contentHtml: `
      <div style="margin: 16px 0; padding: 14px; border: 1px solid #E5E7EB; border-radius: 8px; background: #F9FAFB;">
        <p style="margin: 0 0 6px; font-size: 14px; color: #111827;"><strong>AI Messages:</strong> ${escapeHtml(aiMessages)}</p>
        <p style="margin: 0 0 6px; font-size: 14px; color: #111827;"><strong>Notes Created:</strong> ${escapeHtml(notesTotal)}</p>
        <p style="margin: 0 0 6px; font-size: 14px; color: #111827;"><strong>Projects Created:</strong> ${escapeHtml(projectsTotal)}</p>
        <p style="margin: 0; font-size: 14px; color: #111827;"><strong>Total Exports:</strong> ${escapeHtml(totalExports)}</p>
      </div>
    `,
    greeting: `${displayName},`,
    infoText: `Your next cycle ends on ${new Date(nextPeriodEnd).toLocaleDateString()}.`,
    introLines: [
      `Your current billing cycle has successfully concluded. You are currently on the ${escapeHtml(planName)} plan.`,
      `Here is a quick summary of your usage during the last cycle:`
    ],
    locale: resolvedLocale,
    preheader: `Billing cycle summary for your ${planName} plan`,
    title: "Billing Cycle Renewed",
  });

  return { html, subject, text };
}

module.exports = { buildCycleSummaryTemplate };
