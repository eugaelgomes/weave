const { Pool } = require("pg");
const { databaseConfig } = require("../config");
const { logger } = require("../lib");

const pool = new Pool(databaseConfig);

pool.on("error", (err) => {
  logger.error("Unexpected database pool error", { error: err.message });
});

pool.on("connect", () => {
  logger.debug("New database connection established");
});

const getConnection = async () => {
  try {
    const client = await pool.connect();
    return client;
  } catch (error) {
    logger.error("Pool connection failed", { error: error.message });
    throw error;
  }
};

const closePool = async () => {
  await pool.end();
  logger.info("Database pool closed");
};

const executeQuery = async (sql, params = []) => {
  const client = await getConnection();
  try {
    const { rows } = await client.query(sql, params);
    return rows;
  } catch (error) {
    throw error;
  } finally {
    client.release();
  }
};

const rowCount = async (sql, params = []) => {
  const client = await getConnection();
  try {
    const result = await client.query(sql, params);
    return result.rowCount;
  } catch (error) {
    throw error;
  } finally {
    client.release();
  }
};

module.exports = { closePool, executeQuery, getConnection, pool, rowCount };
