const { MailService } = require("@/services/email/config");
const { buildMailTemplate, escapeHtml } = require("@/services/email/mail-template");
const {
  resolveEmailLocale,
  resolveEmailLocaleFromAcceptLanguage,
  t,
} = require("@/services/email/i18n");

/**
 * @param {string} email
 * @param {string} eventTitle
 * @param {string} startTime
 * @param {string} endTime
 * @param {string} location
 * @param {string} description
 * @param {string} [meetLink]
 * @param {string} [acceptLanguage]
 * @param {string} [localeHint]
 */
async function calendar_invite_receipt(
  email,
  eventTitle,
  startTime,
  endTime,
  location,
  description,
  meetLink,
  acceptLanguage,
  localeHint
) {
  const locale = localeHint
    ? resolveEmailLocale(localeHint)
    : resolveEmailLocaleFromAcceptLanguage(acceptLanguage);

  try {
    const safeTitle = escapeHtml(eventTitle || t(locale, "calendarInvite.noTitle"));
    const safeStart = escapeHtml(startTime || "");
    const safeEnd = escapeHtml(endTime || "");
    const safeLoc = escapeHtml(location || t(locale, "calendarInvite.noLocation"));
    const safeDesc = escapeHtml(description || "");

    const contentHtml = `
      <div style="margin: 14px 0; padding: 14px; border: 1px solid #E5E7EB; border-radius: 8px; background: #F9FAFB;">
        <h3 style="margin-top: 0;">${safeTitle}</h3>
        <p><strong>${escapeHtml(t(locale, "calendarInvite.start"))}</strong> ${safeStart}</p>
        <p><strong>${escapeHtml(t(locale, "calendarInvite.end"))}</strong> ${safeEnd}</p>
        <p><strong>${escapeHtml(t(locale, "calendarInvite.location"))}</strong> ${safeLoc}</p>
        ${
          meetLink
            ? `<p><strong>Google Meet:</strong> <a href="${meetLink}">${meetLink}</a></p>`
            : ""
        }
        ${safeDesc ? `<p><strong>${escapeHtml(t(locale, "calendarInvite.description"))}</strong><br/>${safeDesc}</p>` : ""}
      </div>
    `;

    const { html, text } = buildMailTemplate({
      contentHtml,
      ctaText: meetLink ? t(locale, "calendarInvite.cta") : null,
      ctaUrl: meetLink || null,
      footerNote: t(locale, "calendarInvite.footer"),
      greeting: `${t(locale, "common.greetingFallback")},`,
      infoText: t(locale, "calendarInvite.info"),
      introLines: [
        t(locale, "calendarInvite.intro1", { eventTitle: safeTitle }),
        t(locale, "calendarInvite.intro2"),
      ],
      locale,
      outroLines: [],
      preheader: t(locale, "calendarInvite.preheader", {
        eventTitle: safeTitle,
      }),
      subtitle: t(locale, "calendarInvite.subtitle"),
      title: t(locale, "calendarInvite.title"),
    });

    await MailService().sendMail({
      from: process.env.EMAIL_FROM,
      html,
      subject: t(locale, "calendarInvite.subject", { eventTitle: safeTitle }),
      text,
      to: email,
    });

    return { success: true };
  } catch (error) {
    console.error("Calendar invite email failed:", error);
    return {
      error: error.message || "Failed to send calendar invite email.",
      success: false,
    };
  }
}

module.exports = { calendar_invite_receipt };
