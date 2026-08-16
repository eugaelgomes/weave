require("dotenv").config();

const requiredEnvVars = [
  "DATABASE_HOST_URL",
  "DATABASE_SERVICE_PORT",
  "DATABASE_USERNAME",
  "DATABASE_PASSWORD",
  "DATABASE_NAME",
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
];

function validateEnv() {
  const missing = requiredEnvVars.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }

  return true;
}

const env = {
  database: {
    host: process.env.DATABASE_HOST_URL,
    name: process.env.DATABASE_NAME,
    password: process.env.DATABASE_PASSWORD,
    port: parseInt(process.env.DATABASE_SERVICE_PORT, 10),
    user: process.env.DATABASE_USERNAME,
  },
  email: {
    contactEmail: process.env.CONTACT_EMAIL,
    from: process.env.EMAIL_FROM,
    logoUrl: process.env.EMAIL_LOGO_URL,
    resendApiKey: process.env.RESEND_API_KEY,
  },
  isDevelopment: process.env.NODE_ENV !== "production",

  isProduction: process.env.NODE_ENV === "production",

  NODE_ENV: process.env.NODE_ENV,

  storage: {
    accessKey: process.env.DO_SPACES_ACCESS_KEY,
    bucketName: process.env.DO_SPACES_BUCKET_NAME,
    endpoint: process.env.DO_SPACES_ENDPOINT,
    region: process.env.DO_SPACES_REGION,
    secretKey: process.env.DO_SPACES_SECRET_KEY,
  },
};

module.exports = { env, requiredEnvVars, validateEnv };
