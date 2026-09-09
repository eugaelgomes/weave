const nodemailer = require("nodemailer");
const { env } = require("../config/enviroment");
const { logger } = require("@theweave/database");
const { normalizeSenderFrom } = require("./sender-name");

let mailServiceInstance = null;

function normalizeRecipients(value, fieldName) {
  if (!value) return undefined;

  if (Array.isArray(value)) {
    const recipients = value.filter(Boolean);
    if (recipients.length === 0) throw new Error(`Invalid email field: ${fieldName}`);
    return recipients;
  }

  if (typeof value === "string") return [value];

  throw new Error(`Invalid email field: ${fieldName}`);
}

function buildPayload(mailOptions = {}) {
  const { bcc, cc, from = env.email.from, html, replyTo, subject, text, to } = mailOptions;
  const sender = normalizeSenderFrom(from);

  if (!sender) throw new Error("Missing email configuration: EMAIL_FROM");
  if (!to) throw new Error("Missing required email parameter: to");
  if (!subject) throw new Error("Missing required email parameter: subject");

  return {
    bcc: normalizeRecipients(bcc, "bcc"),
    cc: normalizeRecipients(cc, "cc"),
    from: sender,
    html,
    replyTo: normalizeRecipients(replyTo, "replyTo"),
    subject,
    text,
    to: normalizeRecipients(to, "to"),
  };
}

function createMailService() {
  if (mailServiceInstance) return mailServiceInstance;

  if (env.email.transport === "noop") {
    logger.warn("Email transport disabled (EMAIL_TRANSPORT=noop)");
    mailServiceInstance = {
      async sendMail(mailOptions = {}) {
        logger.warn("[NoopMailService] Email send skipped", {
          subject: mailOptions.subject,
          to: mailOptions.to,
        });
        return { id: "noop-disabled-id" };
      },
      async verify() {
        return true;
      },
    };
    return mailServiceInstance;
  }

  const transporter = nodemailer.createTransport({
    auth: {
      pass: env.email.smtp.password,
      user: env.email.smtp.user,
    },
    host: env.email.smtp.host,
    maxConnections: 5,
    pool: true,
    port: env.email.smtp.port,
    requireTLS: env.email.smtp.requireTls,
    secure: env.email.smtp.secure,
  });

  mailServiceInstance = {
    async sendMail(mailOptions = {}) {
      const payload = buildPayload(mailOptions);
      const info = await transporter.sendMail(payload);

      logger.info("Email sent successfully", {
        messageId: info.messageId,
        subject: payload.subject,
        to: payload.to,
      });

      return { id: info.messageId, response: info.response };
    },
    async verify() {
      await transporter.verify();
      logger.info("SMTP transport verified", {
        host: env.email.smtp.host,
        port: env.email.smtp.port,
      });
      return true;
    },
  };

  return mailServiceInstance;
}

module.exports = { createMailService };
