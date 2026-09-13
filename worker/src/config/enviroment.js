require("dotenv").config();

const requiredEnvVars = [
  "DATABASE_HOST_URL",
  "DATABASE_SERVICE_PORT",
  "DATABASE_USERNAME",
  "DATABASE_PASSWORD",
  "DATABASE_NAME",
  "NODE_ENV",
  "CONTACT_EMAIL",
  "FRONTEND_URL",
  // STORAGE_* vars are optional — SpacesService disables itself gracefully when unconfigured
  // API_URL is optional — backup processor falls back to http://localhost:8080
];

function parseBoolean(value, defaultValue = false) {
  if (value === undefined) return defaultValue;
  return value.toLowerCase() === "true";
}

function validateEnv() {
  const transport = (process.env.EMAIL_TRANSPORT || "smtp").toLowerCase();
  const missing = [...requiredEnvVars];

  if (transport === "smtp") {
    missing.push("EMAIL_FROM", "EMAIL_SMTP_HOST", "EMAIL_SMTP_USER", "EMAIL_SMTP_PASSWORD");
  }

  const unset = missing.filter((key) => !process.env[key]);

  if (unset.length > 0) {
    throw new Error(`Missing required environment variables: ${unset.join(", ")}`);
  }

  if (!["smtp", "noop"].includes(transport)) {
    throw new Error("EMAIL_TRANSPORT must be either 'smtp' or 'noop'");
  }

  const smtpPort = parseInt(process.env.EMAIL_SMTP_PORT || "587", 10);
  if (transport === "smtp" && (!Number.isInteger(smtpPort) || smtpPort < 1 || smtpPort > 65535)) {
    throw new Error("EMAIL_SMTP_PORT must be a valid TCP port");
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
    smtp: {
      host: process.env.EMAIL_SMTP_HOST,
      password: process.env.EMAIL_SMTP_PASSWORD,
      port: parseInt(process.env.EMAIL_SMTP_PORT || "587", 10),
      requireTls: parseBoolean(process.env.EMAIL_SMTP_REQUIRE_TLS),
      secure: parseBoolean(process.env.EMAIL_SMTP_SECURE),
      user: process.env.EMAIL_SMTP_USER,
    },
    transport: (process.env.EMAIL_TRANSPORT || "smtp").toLowerCase(),
  },
  isDevelopment: process.env.NODE_ENV !== "production",

  isProduction: process.env.NODE_ENV === "production",

  NODE_ENV: process.env.NODE_ENV,

  storage: {
    accessKey: process.env.STORAGE_ACCESS_KEY || process.env.S3_ACCESS_KEY,
    bucketName: process.env.STORAGE_BUCKET_NAME || process.env.S3_BUCKET_NAME,
    enabled:
      parseBoolean(process.env.STORAGE_ENABLED || process.env.S3_STORAGE_ENABLED) &&
      Boolean(
        (process.env.STORAGE_ENDPOINT || process.env.S3_ENDPOINT) &&
          (process.env.STORAGE_ACCESS_KEY || process.env.S3_ACCESS_KEY) &&
          (process.env.STORAGE_SECRET_KEY || process.env.S3_SECRET_KEY) &&
          (process.env.STORAGE_BUCKET_NAME || process.env.S3_BUCKET_NAME)
      ),
    endpoint: process.env.STORAGE_ENDPOINT || process.env.S3_ENDPOINT,
    region: process.env.STORAGE_REGION || process.env.S3_REGION || "us-east-1",
    secretKey: process.env.STORAGE_SECRET_KEY || process.env.S3_SECRET_KEY,
  },
};

module.exports = { env, requiredEnvVars, validateEnv };
