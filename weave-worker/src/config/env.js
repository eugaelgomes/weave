require("dotenv").config();

const requiredEnvVars = [
  "DATABASE_HOST_URL",
  "DATABASE_SERVICE_PORT",
  "DATABASE_USERNAME",
  "DATABASE_PASSWORD",
  "DATABASE_NAME",
];

const optionalEnvVars = [
  "NODE_ENV",
  "RESEND_API_KEY",
  "EMAIL_FROM",
  "DO_SPACES_ENDPOINT",
  "DO_SPACES_ACCESS_KEY",
  "DO_SPACES_SECRET_KEY",
  "DO_SPACES_BUCKET_NAME",
  "DO_SPACES_REGION",
  "CONTACT_EMAIL",
  "API_URL",
  "FRONTEND_URL",
  "DUE_DATE_REMINDER_ENABLED",
  "DUE_DATE_REMINDER_HOUR_UTC",
];

function validateEnv() {
  const missing = requiredEnvVars.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`
    );
  }

  return true;
}

const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  isProduction: process.env.NODE_ENV === "production",
  isDevelopment: process.env.NODE_ENV !== "production",

  database: {
    host: process.env.DATABASE_HOST_URL,
    port: parseInt(process.env.DATABASE_SERVICE_PORT, 10),
    user: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    name: process.env.DATABASE_NAME,
  },

  email: {
    resendApiKey: process.env.RESEND_API_KEY,
    from: process.env.EMAIL_FROM,
    contactEmail: process.env.CONTACT_EMAIL || "us@weavenotes.app",
  },

  storage: {
    endpoint: process.env.DO_SPACES_ENDPOINT,
    accessKey: process.env.DO_SPACES_ACCESS_KEY,
    secretKey: process.env.DO_SPACES_SECRET_KEY,
    bucketName: process.env.DO_SPACES_BUCKET_NAME || "wn-storage",
    region: process.env.DO_SPACES_REGION || "sfo3",
  },
};

module.exports = { env, validateEnv, requiredEnvVars, optionalEnvVars };
