const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  allowExitOnIdle: true,
  connectionTimeoutMillis: 5000,
  database: process.env.DATABASE_NAME,
  host: process.env.DATABASE_HOST_URL,
  idleTimeoutMillis: 10000,
  max: 5,
  password: process.env.DATABASE_PASSWORD,
  port: parseInt(process.env.DATABASE_SERVICE_PORT, 10),
  ssl: {
    rejectUnauthorized: false,
    //ca: process.env.SSL_CERTIFICATE,
  },
  user: process.env.DATABASE_USERNAME,
});

const getConnection = async () => {
  try {
    const client = await pool.connect();
    return client;
  } catch (error) {
    throw error;
  }
};

const executeQuery = async (sql, params = [], explicitClient = null) => {
  const client = explicitClient || (await getConnection());
  try {
    const { rows } = await client.query(sql, params);
    return rows;
  } catch (error) {
    throw error;
  } finally {
    if (!explicitClient) {
      client.release();
    }
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

const withTransaction = async (callback) => {
  const client = await getConnection();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  executeQuery,
  getConnection,
  pool,
  rowCount,
  withTransaction,
};
