require("dotenv").config();

const requiredEnvVars = ["REDIS_URL"];

const optionalEnvVars = [
  "GEMINI_API_KEY",
  "NODE_ENV",
  "PERPLEXITY_API_KEY",
  "REDIS_ENGINE_LLM_REQUEST_QUEUE_KEY",
  "REDIS_ENGINE_LLM_RESPONSE_PREFIX",
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
  isDevelopment: process.env.NODE_ENV !== "production",
  isProduction: process.env.NODE_ENV === "production",
  NODE_ENV: process.env.NODE_ENV || "development",
};

module.exports = { env, optionalEnvVars, requiredEnvVars, validateEnv };
