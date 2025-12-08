const nodemailer = require("nodemailer");

function MailService() {
  const requiredEnv = [
    "EMAIL_HOST",
    "EMAIL_PORT",
    "EMAIL_USERNAME",
    "EMAIL_PASSWORD",
  ];

  const missing = requiredEnv.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Configuração de email faltando: ${missing.join(", ")}`);
  }

  const port = Number(process.env.EMAIL_PORT);
  if (isNaN(port)) {
    throw new Error(`EMAIL_PORT inválida: "${process.env.EMAIL_PORT}"`);
  }

  let transporter;
  try {
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port,
      secure: port === 465,
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });
  } catch (error) {
    console.error("Erro criando transportador do Nodemailer:", error);
    throw new Error("Falha ao criar transporter do Nodemailer");
  }

  // Test connection with server SMTP
  transporter.verify((err, success) => {
    if (err) {
      console.error("Falha ao conectar ao servidor SMTP:", err);
    } else {
      console.log("SMTP conectado com sucesso:", success);
    }
  });

  return transporter;
}

module.exports = { MailService };
