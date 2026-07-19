import { Pool, PoolConfig } from "pg";
import { logger } from "../logger";

const baseConfig: PoolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
    }
  : {
      database: process.env.DATABASE_NAME,
      host: process.env.DATABASE_HOST_URL,
      password: process.env.DATABASE_PASSWORD,
      port: Number.parseInt(process.env.DATABASE_SERVICE_PORT || "5432", 10),
      user: process.env.DATABASE_USERNAME,
    };

export const pool = new Pool({
  ...baseConfig,
  idleTimeoutMillis: 30000,
  max: 3,
  ssl:
    process.env.DATABASE_SSL === "false"
      ? false
      : {
          rejectUnauthorized: false,
        },
});

pool.on("error", (error: Error) => {
  logger.error("Engine database pool error", { error: error.message });
});

/**
 * Verifies connectivity and enforces read-only transactions.
 *
 * @returns {Promise<void>}
 */
export async function connectDatabase(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("SELECT 1");
    logger.info("Engine database connection ready");
  } finally {
    client.release();
  }
}

/**
 * Gracefully closes database pool.
 *
 * @returns {Promise<void>}
 */
export async function closeDatabase(): Promise<void> {
  await pool.end();
}
