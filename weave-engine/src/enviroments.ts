import dotenv from "dotenv";
dotenv.config();
import { z } from "zod";

const envSchema = z
  .object({
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
    REDIS_URL: z.string().min(1),
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
export const requiredEnvVars = ["REDIS_URL"];
export const optionalEnvVars = [
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

export function hasDatabaseConfig(): boolean {
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

export function validateEnv(): boolean {
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

export const env = {
  isDevelopment: process.env.NODE_ENV !== "production",
  isProduction: process.env.NODE_ENV === "production",
  NODE_ENV: process.env.NODE_ENV || "development",
};
