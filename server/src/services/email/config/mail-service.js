const nodemailer = require("nodemailer");

let transporterInstance = null;

function MailService() {
  if (transporterInstance) {
    return transporterInstance;
  }

  // Variáveis de ambiente
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

  try {
    transporterInstance = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port,
      secure: port === 465,
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
      rateDelta: 1000,
      rateLimit: 10,
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

  transporterInstance.verify((err, success) => {
    if (err) {
      console.error("Falha ao conectar ao servidor SMTP:", err);
      transporterInstance = null;
    } else {
      console.log("SMTP conectado com sucesso (pooling habilitado):", success);
    }
  });

  // Cleanup on process exit
  process.on("SIGTERM", () => {
    if (transporterInstance) {
      transporterInstance.close();
      console.log("SMTP connection pool closed");
    }
  });

  return transporterInstance;
}

module.exports = { MailService };
