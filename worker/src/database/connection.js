// Re-export from the unified shared package
// This file acts as a compatibility layer for the legacy paths
// after the monorepo refactoring.
const sharedDatabase = require("@theweave/database");

if (!sharedDatabase.pool) {
  sharedDatabase.initPgPool({
    host: process.env.DATABASE_HOST_URL,
    port: parseInt(process.env.DATABASE_SERVICE_PORT || "5432", 10),
    user: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    max: parseInt(process.env.DATABASE_CONNECTION_POOL || "5", 10),
  });
}

module.exports = {
  ...sharedDatabase,
  pool: sharedDatabase.pool
};
