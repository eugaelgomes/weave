const { executeQuery } = require("@/database/connection");

class AuthLogs {
  static #formatLogMetadata(req, status = "success", extraDetails = {}) {
    return {
      client: {
        language: req.headers["accept-language"],
        user_agent: req.headers["user-agent"],
      },
      context: {
        method: req.method,
        path: req.originalUrl,
        request_id: req.headers["x-request-id"] || null,
      },
      details: extraDetails,
      log_version: 1,
      network: {
        hostname: req.hostname,
        ip: req.ip || req.headers["x-forwarded-for"],
      },
      status: status,
    };
  }

  static async createLog(userId, type, req, status = "success", details = {}) {
    const query = `
      INSERT INTO public.user_logs (user_id, log_type, log)
      VALUES ($1, $2, $3)
    `;

    const logMetadata = this.#formatLogMetadata(req, status, details);
    const logType = String(type).trim().toUpperCase();

    try {
      await executeQuery(query, [userId, logType, JSON.stringify(logMetadata)]);
    } catch (error) {
      console.error(
        `[CRITICAL_LOG_FAIL] ${type} for user ${userId}: ${error.message}`
      );
    }
  }
}

module.exports = AuthLogs;
