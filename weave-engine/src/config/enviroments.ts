import dotenv from "dotenv";
dotenv.config();
import { z } from "zod";

const envSchema = z.object({
  GEMINI_API_KEY: z.string().optional(),
  NODE_ENV: z.string().default("development"),
  OPENAI_API_KEY: z.string().optional(),
  REDIS_ENGINE_LLM_REQUEST_QUEUE_KEY: z.string().optional(),
  REDIS_ENGINE_LLM_RESPONSE_PREFIX: z.string().optional(),
  REDIS_URL: z.string().min(1),
});

// For backwards compatibility of the exported objects
export const requiredEnvVars = ["REDIS_URL"];
export const optionalEnvVars = [
  "GEMINI_API_KEY",
  "NODE_ENV",
  "OPENAI_API_KEY",
  "REDIS_ENGINE_LLM_REQUEST_QUEUE_KEY",
  "REDIS_ENGINE_LLM_RESPONSE_PREFIX",
];

export function hasDatabaseConfig(): boolean {
  // Database configuration is no longer handled in weave-engine
  return false;
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

