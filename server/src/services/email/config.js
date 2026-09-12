const { enqueueEmailJob } = require("@theweave/database");
const { normalizeSenderFrom } = require("./sender-name");

let mailServiceInstance = null;

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

function MailService() {
  if (mailServiceInstance) {
    return mailServiceInstance;
  }

  mailServiceInstance = {
    async sendMail(mailOptions = {}) {
      const {
        from = process.env.EMAIL_FROM,
        to,
        subject,
        html,
        text,
        cc,
        bcc,
        replyTo,
        priority = "normal",
      } = mailOptions;

      const sender = normalizeSenderFrom(from);

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

      try {
        return await enqueueEmailJob(payload, undefined, { priority });
      } catch (error) {
        console.error("Erro ao enfileirar email no Redis:", error);
        throw new Error("Erro ao enfileirar email");
      }
    },
  };

  return mailServiceInstance;
}

module.exports = { MailService };
