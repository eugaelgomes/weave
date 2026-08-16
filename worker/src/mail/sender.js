const { Resend } = require("resend");
const { env } = require("../config/enviroment");
const { logger } = require("@theweave/database");
const { DEV_SENDER, normalizeSenderFrom } = require("./sender-name");

let mailServiceInstance = null;

/**
 * @param {string|string[]} value
 * @param {string} fieldName
 * @returns {string[]|undefined}
 */
function normalizeRecipients(value, fieldName) {
  if (!value) {
    return undefined;
  }

  if (Array.isArray(value)) {
    const recipients = value.filter(Boolean);
    if (recipients.length === 0) {
      throw new Error(`Campo de email inválido: ${fieldName}`);
    }
    return recipients;
  }

  if (typeof value === "string") {
    return [value];
  }

  throw new Error(`Campo de email inválido: ${fieldName}`);
}

/**
 * Creates a Mail Service instance using Resend or a Noop Mail Service if disabled.
 *
 * @returns {{ sendMail: (mailOptions?: object) => Promise<{ id: string }> }}
 */
function createMailService() {
  if (mailServiceInstance) {
    return mailServiceInstance;
  }

  if (!env.email.resendApiKey) {
    logger.warn("RESEND_API_KEY not configured, email service disabled (using NoopMailService)");
    mailServiceInstance = {
      async sendMail(mailOptions = {}) {
        logger.warn("[NoopMailService] Email send skipped: RESEND_API_KEY is missing", {
          subject: mailOptions.subject,
          to: mailOptions.to,
        });
        return { id: "noop-disabled-id" };
      },
    };
    return mailServiceInstance;
  }

  const resend = new Resend(env.email.resendApiKey);

  mailServiceInstance = {
    /**
     * Sends an email via Resend API
     *
     * @param {object} mailOptions
     * @param {string|string[]} mailOptions.to
     * @param {string} mailOptions.subject
     * @param {string} [mailOptions.html]
     * @param {string} [mailOptions.text]
     * @param {string} [mailOptions.from]
     * @param {string|string[]} [mailOptions.cc]
     * @param {string|string[]} [mailOptions.bcc]
     * @param {string|string[]} [mailOptions.replyTo]
     * @returns {Promise<object>}
     */
    async sendMail(mailOptions = {}) {
      const { bcc, cc, from = env.email.from, html, replyTo, subject, text, to } = mailOptions;

      const sender = normalizeSenderFrom(from || (env.isDevelopment ? DEV_SENDER : null));

      if (!sender) {
        throw new Error("Configuração de email faltando: EMAIL_FROM");
      }

      if (!to) {
        throw new Error("Parâmetro obrigatório faltando: to");
      }

      if (!subject) {
        throw new Error("Parâmetro obrigatório faltando: subject");
      }

      const payload = {
        bcc: normalizeRecipients(bcc, "bcc"),
        cc: normalizeRecipients(cc, "cc"),
        from: sender,
        html,
        replyTo: normalizeRecipients(replyTo, "replyTo"),
        subject,
        text,
        to: normalizeRecipients(to, "to"),
      };

      let { data, error } = await resend.emails.send(payload);

      const errorMessage = error?.message || "";
      const shouldRetryWithOnboardingSender =
        env.isDevelopment &&
        payload.from !== DEV_SENDER &&
        /domain|verify|verified/i.test(errorMessage);

      if (shouldRetryWithOnboardingSender) {
        logger.debug("Retrying email with onboarding sender");
        ({ data, error } = await resend.emails.send({
          ...payload,
          from: DEV_SENDER,
        }));
      }

      if (error) {
        const details = [error.message, error.name, error.statusCode].filter(Boolean).join(" | ");
        throw new Error(details || "Erro ao enviar email com Resend");
      }

      logger.info("Email sent successfully", { subject, to: payload.to });
      return data;
    },
  };

  return mailServiceInstance;
}

module.exports = { createMailService };
