const { Resend } = require("resend");

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

  if (!process.env.RESEND_API_KEY) {
    throw new Error("Configuração de email faltando: RESEND_API_KEY");
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

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
      } = mailOptions;

      const sender =
        from ||
        (process.env.NODE_ENV !== "production"
          ? "Weave Notes <onboarding@resend.dev>"
          : null);

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
        process.env.NODE_ENV !== "production" &&
        payload.from !== "Weave Notes <onboarding@resend.dev>" &&
        /domain|verify|verified/i.test(errorMessage);

      if (shouldRetryWithOnboardingSender) {
        ({ data, error } = await resend.emails.send({
          ...payload,
          from: "Weave Notes <onboarding@resend.dev>",
        }));
      }

      if (error) {
        const details = [error.message, error.name, error.statusCode]
          .filter(Boolean)
          .join(" | ");
        throw new Error(details || "Erro ao enviar email com Resend");
      }

      return data;
    },
  };

  return mailServiceInstance;
}

module.exports = { MailService };
