const rateLimit = require("express-rate-limit");

const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 min
  max: 15, // Max 15 tentativas por IP por janela
  message: "Too many login attempts. Please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.body.username || req.ip, // Bloqueio por username
  handler: (req, res) => {
    res
      .status(429)
      .json({ message: "Too many attempts. Please wait 15 minutes." });
  },
  skipSuccessfulRequests: true, // Reset no login ok
});

module.exports = { loginLimiter };
