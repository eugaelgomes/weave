const { executeQuery } = require("@/services/db");

class authLogs {
  static #formatLogMetadata(req, status = "success", extraDetails = {}) {
    return {
      status: status,
      network: {
        ip: req.ip || req.headers["x-forwarded-for"],
        hostname: req.hostname,
      },
      client: {
        user_agent: req.headers["user-agent"],
        language: req.headers["accept-language"],
      },
      context: {
        path: req.originalUrl,
        method: req.method,
        request_id: req.headers["x-request-id"] || null,
      },
      details: extraDetails,
      log_version: 1,
    };
  }

  static async createLog(userId, type, req, status = "success", details = {}) {
    const query = `
      INSERT INTO public.users_logs (user_id, log_type, log)
      VALUES ($1, $2, $3)
    `;

    const logMetadata = this.#formatLogMetadata(req, status, details);

    try {
      await executeQuery(query, [userId, type, JSON.stringify(logMetadata)]);
    } catch (error) {
      console.error(
        `[CRITICAL_LOG_FAIL] ${type} for user ${userId}: ${error.message}`
      );
    }
  }
}


module.exports = authLogs;