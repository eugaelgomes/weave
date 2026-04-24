const { executeQuery } = require("@/database/connection");

class updateProfileLogs {
  static #SENSITIVE_KEYS = [
    "password",
    "token",
    "secret",
    "key",
    "password_confirmation",
    "new_password",
    "old_password",
  ];

  static #sanitize(obj) {
    if (typeof obj !== "object" || obj === null) return obj;

    const newObj = Array.isArray(obj) ? [...obj] : { ...obj };

    for (const key in newObj) {
      if (this.#SENSITIVE_KEYS.includes(key.toLowerCase())) {
        newObj[key] = "[REDACTED]";
      } else if (typeof newObj[key] === "object") {
        newObj[key] = this.#sanitize(newObj[key]);
      }
    }
    return newObj;
  }

  static #formatLogMetadata(req, status, cleanDetails) {
    return {
      status: status,
      network: {
        ip: req.ip || req.headers["x-forwarded-for"] || "127.0.0.1",
        hostname: req.hostname,
      },
      client: {
        user_agent: req.headers["user-agent"],
      },
      context: {
        path: req.originalUrl,
        method: req.method,
      },
      details: cleanDetails,
      log_version: 1,
    };
  }

  static async createLog(userId, type, req, status = "success", details = {}) {
    const cleanDetails = this.#sanitize(details);

    const logMetadata = this.#formatLogMetadata(req, status, cleanDetails);
    const logType = String(type).trim().toUpperCase();

    const query = `
      INSERT INTO public.user_logs (user_id, log_type, log)
      VALUES ($1, $2, $3)
    `;

    try {
      await executeQuery(query, [userId, logType, JSON.stringify(logMetadata)]);
    } catch (error) {
      console.error(
        `[CRITICAL_LOG_FAIL] ${type} for user ${userId}: ${error.message}`
      );
    }
  }
}

module.exports = updateProfileLogs;
