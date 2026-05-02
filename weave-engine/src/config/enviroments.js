require("dotenv").config();

const requiredEnvVars = ["REDIS_URL"];

const optionalEnvVars = [
  "DATABASE_HOST_URL",
  "DATABASE_NAME",
  "DATABASE_PASSWORD",
  "DATABASE_SERVICE_PORT",
  "DATABASE_URL",
  "DATABASE_USERNAME",
  "GEMINI_API_KEY",
  "NODE_ENV",
  "OPENAI_API_KEY",
  "REDIS_ENGINE_LLM_REQUEST_QUEUE_KEY",
  "REDIS_ENGINE_LLM_RESPONSE_PREFIX",
];

function hasDatabaseConfig() {
  if (process.env.DATABASE_URL) {
    return true;
  }

  return Boolean(
    process.env.DATABASE_HOST_URL &&
    process.env.DATABASE_NAME &&
    process.env.DATABASE_PASSWORD &&
    process.env.DATABASE_SERVICE_PORT &&
    process.env.DATABASE_USERNAME
  );
}

function validateEnv() {
  const missing = requiredEnvVars.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`
    );
  }

  if (!hasDatabaseConfig()) {
    throw new Error(
      "Missing database configuration. Provide DATABASE_URL or DATABASE_HOST_URL, DATABASE_SERVICE_PORT, DATABASE_USERNAME, DATABASE_PASSWORD and DATABASE_NAME."
    );
  }

  return true;
}

const env = {
  isDevelopment: process.env.NODE_ENV !== "production",
  isProduction: process.env.NODE_ENV === "production",
  NODE_ENV: process.env.NODE_ENV || "development",
};

module.exports = {
  env,
  hasDatabaseConfig,
  optionalEnvVars,
  requiredEnvVars,
  validateEnv,
};
