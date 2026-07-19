import * as Sentry from "@sentry/node";
import { env } from "../enviroments";

const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLevel = env.isProduction ? LOG_LEVELS.info : LOG_LEVELS.debug;

function formatMessage(level: string, message: string, meta: Record<string, any> = {}): string {
  const timestamp = new Date().toISOString();
  const metaStr =
    Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : "";
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`;
}

export const logger = {
  debug(message: string, meta?: Record<string, any>) {
    if (currentLevel <= LOG_LEVELS.debug) {
      console.debug(formatMessage("debug", message, meta));
    }
  },

  error(message: string, meta?: Record<string, any>) {
    console.error(formatMessage("error", message, meta));
    if (!env.isProduction) {
      return;
    }
    if (meta && meta.error instanceof Error) {
      Sentry.captureException(meta.error, { extra: meta });
    } else {
      Sentry.captureMessage(message, { extra: meta, level: "error" });
    }
  },

  info(message: string, meta?: Record<string, any>) {
    if (currentLevel <= LOG_LEVELS.info) {
      console.info(formatMessage("info", message, meta));
    }
  },

  warn(message: string, meta?: Record<string, any>) {
    if (currentLevel <= LOG_LEVELS.warn) {
      console.warn(formatMessage("warn", message, meta));
    }
  },
};
