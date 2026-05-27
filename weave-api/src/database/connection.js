const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  host: process.env.DATABASE_HOST_URL,
  port: parseInt(process.env.DATABASE_SERVICE_PORT, 10),
  user: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  max: 5,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 5000,
  allowExitOnIdle: true,
  ssl: {
    rejectUnauthorized: false,
    //ca: process.env.SSL_CERTIFICATE,
  },
});

const getConnection = async () => {
  try {
    const client = await pool.connect();
    return client;
  } catch (error) {
    console.error("Pool connection failed:", error.message);
    throw error;
  }
};

const executeQuery = async (sql, params = [], explicitClient = null) => {
  const client = explicitClient || await getConnection();
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

module.exports = { pool, getConnection, executeQuery, rowCount, withTransaction };
