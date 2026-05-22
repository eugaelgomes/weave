/**
 * Email layout — keep in sync with weave-api/src/services/email/mail-template.js
 */

const { env } = require("../../config");
const { t, resolveEmailLocale } = require("./i18n");
const { getEmailLogoSrc } = require("./email-logo");

const contactEmail = env.email.contactEmail;

const COLOR_CTA_BG = "#374151";
const COLOR_CTA_TEXT = "#FFFFFF";
const COLOR_BG = "#F9FAFB";
const COLOR_SURFACE = "#FFFFFF";
const COLOR_TEXT = "#111827";
const COLOR_MUTED = "#6B7280";
const COLOR_BORDER = "#E5E7EB";
const COLOR_INFO_BG = "#F9FAFB";

/**
 * @param {string} [explicitLogoUrl]
 * @returns {string|null}
 */
function resolveLogoSrc(explicitLogoUrl) {
  if (explicitLogoUrl) {
    return explicitLogoUrl;
  }
  return getEmailLogoSrc();
}

function escapeHtml(text = "") {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderParagraphs(lines = []) {
  return lines
    .filter(Boolean)
    .map(
      (line) =>
        `<p style="margin: 0 0 16px; font-size: 15px; line-height: 1.7; color: ${COLOR_MUTED};">${escapeHtml(line)}</p>`
    )
    .join("");
}

/**
 * @param {object} [options]
 * @returns {{ html: string, text: string }}
 */
function buildMailTemplate({
  locale: rawLocale,
  brandName,
  logoUrl,
  contentHtml = "",
  ctaText = "",
  ctaUrl = "",
  footerNote,
  greeting = "",
  infoText = "",
  introLines = [],
  outroLines = [],
  preheader = "",
  subtitle = "",
  title = "",
  exposeCtaUrlInText = false,
} = {}) {
  const locale = resolveEmailLocale(rawLocale);
  const resolvedBrandName = brandName || t(locale, "common.brandName");
  const resolvedFooterNote = footerNote || t(locale, "common.autoFooter");
  const resolvedLogoSrc = resolveLogoSrc(logoUrl);

  const safeBrandName = escapeHtml(resolvedBrandName);
  const safePreheader = escapeHtml(preheader);
  const safeTitle = escapeHtml(title);
  const safeSubtitle = escapeHtml(subtitle);
  const safeGreeting = escapeHtml(greeting);
  const safeFooterNote = escapeHtml(resolvedFooterNote);
  const safeInfoText = escapeHtml(infoText);
  const safeContactEmail = escapeHtml(contactEmail);
  const safeCtaText = escapeHtml(ctaText);
  const safeCtaUrl = escapeHtml(ctaUrl);
  const htmlLang = escapeHtml(locale);

  const logoBlock = resolvedLogoSrc
    ? `<img src="${resolvedLogoSrc}" alt="${safeBrandName}" width="120" height="auto" style="display: block; margin: 0 auto; max-width: 120px; height: auto; border: 0; outline: none; text-decoration: none;" />`
    : `<p style="margin: 0; font-family: Segoe UI, Arial, sans-serif; font-size: 18px; line-height: 1.3; color: ${COLOR_TEXT}; font-weight: 700;">${safeBrandName}</p>`;

  const intro = renderParagraphs(introLines);
  const outro = renderParagraphs(outroLines);
  const ctaButton =
    safeCtaText && safeCtaUrl
      ? `
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin: 28px auto;">
        <tr>
          <td style="border-radius: 8px; background: ${COLOR_CTA_BG}; text-align: center;">
            <a href="${safeCtaUrl}" target="_blank" style="display: inline-block; padding: 14px 28px; font-size: 15px; font-weight: 600; color: ${COLOR_CTA_TEXT}; text-decoration: none;">${safeCtaText}</a>
          </td>
        </tr>
      </table>
    `
      : "";

  const infoBox = safeInfoText
    ? `
      <div style="margin: 24px 0; padding: 16px 18px; border: 1px solid ${COLOR_BORDER}; border-radius: 8px; background: ${COLOR_INFO_BG}; font-size: 14px; line-height: 1.6; color: ${COLOR_TEXT};">
        ${safeInfoText}
      </div>
    `
    : "";

  const html = `<!DOCTYPE html>
<html lang="${htmlLang}">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta name="x-apple-disable-message-reformatting" />
    <title>${safeTitle || safeBrandName}</title>
    <style>
      html,
      body {
        margin: 0 !important;
        padding: 0 !important;
        width: 100% !important;
        height: 100% !important;
      }
      body {
        background: ${COLOR_BG};
      }
      a[x-apple-data-detectors] {
        color: inherit !important;
        text-decoration: inherit !important;
      }
      @media screen and (max-width: 600px) {
        .email-shell {
          width: 100% !important;
          border-radius: 0 !important;
        }
        .email-content {
          padding: 28px 20px !important;
        }
      }
    </style>
  </head>
  <body style="margin: 0; padding: 0; background: ${COLOR_BG};">
    <span style="display: none !important; opacity: 0; visibility: hidden; mso-hide: all; font-size: 1px; color: transparent; line-height: 1px; max-height: 0; max-width: 0; overflow: hidden;">${safePreheader}</span>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background: ${COLOR_BG}; margin: 0; padding: 24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" class="email-shell" style="width: 600px; max-width: 600px; background: ${COLOR_SURFACE}; border: 1px solid ${COLOR_BORDER}; border-radius: 12px; overflow: hidden;">
            <tr>
              <td style="padding: 22px 28px; text-align: center; border-bottom: 1px solid ${COLOR_BORDER}; background: ${COLOR_SURFACE};">
                ${logoBlock}
                ${safeSubtitle ? `<p style="margin: 8px 0 0; font-family: Segoe UI, Arial, sans-serif; font-size: 12px; line-height: 1.5; color: ${COLOR_MUTED};">${safeSubtitle}</p>` : ""}
              </td>
            </tr>
            <tr>
              <td class="email-content" style="padding: 36px 32px; font-family: Segoe UI, Arial, sans-serif;">
                ${safeTitle ? `<h2 style="margin: 0 0 14px; font-size: 18px; line-height: 1.35; color: ${COLOR_TEXT}; font-weight: 600;">${safeTitle}</h2>` : ""}
                ${safeGreeting ? `<p style="margin: 0 0 16px; font-size: 15px; line-height: 1.7; color: ${COLOR_TEXT};">${safeGreeting}</p>` : ""}
                ${intro}
                ${contentHtml || ""}
                ${ctaButton}
                ${infoBox}
                ${outro}
              </td>
            </tr>
            <tr>
              <td style="padding: 20px 24px; border-top: 1px solid ${COLOR_BORDER}; background: ${COLOR_SURFACE}; text-align: center;">
                <p style="margin: 0 0 6px; font-family: Segoe UI, Arial, sans-serif; font-size: 14px; color: ${COLOR_TEXT};">${safeBrandName}</p>
                <p style="margin: 0 0 6px; font-family: Segoe UI, Arial, sans-serif; font-size: 13px; color: ${COLOR_MUTED};">
                  <a href="mailto:${safeContactEmail}" style="color: ${COLOR_TEXT}; text-decoration: none;">${safeContactEmail}</a>
                </p>
                <p style="margin: 0; font-family: Segoe UI, Arial, sans-serif; font-size: 12px; color: ${COLOR_MUTED};">${safeFooterNote}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const ctaTextLine =
    ctaText && ctaUrl
      ? exposeCtaUrlInText
        ? `${ctaText}: ${ctaUrl}`
        : `${ctaText} (${t(locale, "common.ctaHint")})`
      : "";

  const text = [
    preheader,
    title,
    greeting,
    ...introLines,
    ctaTextLine,
    infoText,
    ...outroLines,
    `${resolvedBrandName} - ${contactEmail}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  return { html, text };
}

module.exports = { buildMailTemplate, escapeHtml, getEmailLogoSrc };
