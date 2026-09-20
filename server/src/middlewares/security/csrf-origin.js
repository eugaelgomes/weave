const { isAllowedOrigin } = require("@/middlewares/http/cors");

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function csrfOriginMiddleware(req, res, next) {
  if (SAFE_METHODS.has(req.method) || !req.session?.user) return next();

  const origin = req.get("origin");
  if (origin && isAllowedOrigin(origin)) return next();

  return res.status(403).json({
    error: { code: "CSRF_ORIGIN_REJECTED", message: "Request origin is not allowed." },
    success: false,
  });
}

module.exports = { csrfOriginMiddleware };
