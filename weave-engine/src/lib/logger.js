const { env } = require("../config/env");

const LOG_LEVELS = {
  debug: 0,
  error: 3,
  info: 1,
  warn: 2,
};

const currentLevel = env.isProduction ? LOG_LEVELS.info : LOG_LEVELS.debug;

function formatMessage(level, message, meta = {}) {
  const timestamp = new Date().toISOString();
  const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : "";
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`;
}

const logger = {
  debug(message, meta) {
    if (currentLevel <= LOG_LEVELS.debug) {
      console.debug(formatMessage("debug", message, meta));
    }
  },

  error(message, meta) {
    console.error(formatMessage("error", message, meta));
  },

  info(message, meta) {
    if (currentLevel <= LOG_LEVELS.info) {
      console.info(formatMessage("info", message, meta));
    }
  },

  warn(message, meta) {
    if (currentLevel <= LOG_LEVELS.warn) {
      console.warn(formatMessage("warn", message, meta));
    }
  },
};

module.exports = { logger };
