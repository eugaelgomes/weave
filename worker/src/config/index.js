const { env, validateEnv, requiredEnvVars, optionalEnvVars } = require("./env");
const { databaseConfig } = require("./database");

module.exports = {
  databaseConfig,
  env,
  optionalEnvVars,
  requiredEnvVars,
  validateEnv,
};
