import { z } from "zod";
import "dotenv/config";

const envSchema = z.object({
  MCP_TRANSPORT: z.enum(["stdio", "sse"]).default("stdio"),
  MCP_PORT: z.coerce.number().default(3000),
  WEAVE_API_URL: z.string().url().default("http://localhost:8080/api/v1"),
  INTERNAL_API_TOKEN: z.string().min(1, "INTERNAL_API_TOKEN is required"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables configuration:");
  console.error(JSON.stringify(parsed.error.format(), null, 2));
  process.exit(1);
}

export const env = parsed.data;
export type EnvConfig = z.infer<typeof envSchema>;
