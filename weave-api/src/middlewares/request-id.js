const { randomUUID } = require("crypto");

/**
 * Attaches a request correlation id for structured error logs.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
function requestIdMiddleware(req, res, next) {
  const incoming =
    typeof req.headers["x-request-id"] === "string"
      ? req.headers["x-request-id"].trim()
      : "";
  const requestId = incoming || randomUUID();
  req.requestId = requestId;
  res.setHeader("x-request-id", requestId);
  next();
}

module.exports = { requestIdMiddleware };
