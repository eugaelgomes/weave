const rateLimit = require("express-rate-limit");

const requestLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10min
  max: 15, // Max 15 requests per windowMs
  message: "Too many requests from this IP. Please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip,
  handler: (req, res) => {
    res
      .status(429)
      .json({
        message:
          "Too many requests. Please wait at least 10 minutes to try again.",
      });
  },
});

// Inutilizado
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "Too many login attempts. Please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.body.username || req.ip,
  handler: (req, res) => {
    res
      .status(429)
      .json({ message: "Too many attempts. Please wait 15 minutes." });
  },
  skipSuccessfulRequests: true,
});

module.exports = { requestLimiter, loginLimiter };
