require("dotenv").config();
const { z } = require("zod");

const envSchema = z
  .object({
    REDIS_URL: z.string().min(1),
    DATABASE_HOST_URL: z.string().optional(),
    DATABASE_NAME: z.string().optional(),
    DATABASE_PASSWORD: z.string().optional(),
    DATABASE_SERVICE_PORT: z.string().optional(),
    DATABASE_URL: z.string().optional(),
    DATABASE_USERNAME: z.string().optional(),
    GEMINI_API_KEY: z.string().optional(),
    NODE_ENV: z.string().default("development"),
    OPENAI_API_KEY: z.string().optional(),
    REDIS_ENGINE_LLM_REQUEST_QUEUE_KEY: z.string().optional(),
    REDIS_ENGINE_LLM_RESPONSE_PREFIX: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.DATABASE_URL) {
        return true;
      }
      return Boolean(
        data.DATABASE_HOST_URL &&
        data.DATABASE_NAME &&
        data.DATABASE_PASSWORD &&
        data.DATABASE_SERVICE_PORT &&
        data.DATABASE_USERNAME
      );
    },
    {
      message:
        "Missing database configuration. Provide DATABASE_URL or DATABASE_HOST_URL, DATABASE_SERVICE_PORT, DATABASE_USERNAME, DATABASE_PASSWORD and DATABASE_NAME.",
    }
  );

// For backwards compatibility of the exported objects
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
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    throw new Error(
      `Environment validation failed: ${result.error.issues
        .map((e) => e.message)
        .join(", ")}`
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
