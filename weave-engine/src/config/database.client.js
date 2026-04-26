const { Pool } = require("pg");
const { logger } = require("../logger");

const baseConfig = process.env.DATABASE_URL
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

const pool = new Pool({
  ...baseConfig,
  idleTimeoutMillis: 30000,
  max: 10,
  ssl:
    process.env.DATABASE_SSL === "false"
      ? false
      : {
          rejectUnauthorized: false,
        },
});

pool.on("error", (error) => {
  logger.error("Engine database pool error", { error: error.message });
});

pool.on("connect", (client) => {
  client
    .query("SET default_transaction_read_only = on")
    .catch((error) => {
      logger.error("Failed to enforce engine read-only transactions", {
        error: error.message,
      });
    });
});

/**
 * Verifies connectivity and enforces read-only transactions.
 *
 * @returns {Promise<void>}
 */
async function connectDatabase() {
  const client = await pool.connect();
  try {
    await client.query("SELECT 1");
    logger.info("Engine database connection ready (read-only)");
  } finally {
    client.release();
  }
}

/**
 * Gracefully closes database pool.
 *
 * @returns {Promise<void>}
 */
async function closeDatabase() {
  await pool.end();
}

module.exports = {
  closeDatabase,
  connectDatabase,
  pool,
};
