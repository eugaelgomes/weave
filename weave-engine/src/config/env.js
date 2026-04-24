require("dotenv").config();

const requiredEnvVars = [];

const optionalEnvVars = ["NODE_ENV"];

function validateEnv() {
  const missing = requiredEnvVars.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`
    );
  }

  return true;
}

const env = {
  isDevelopment: process.env.NODE_ENV !== "production",
  isProduction: process.env.NODE_ENV === "production",
  NODE_ENV: process.env.NODE_ENV || "development",
};

module.exports = { env, optionalEnvVars, requiredEnvVars, validateEnv };
