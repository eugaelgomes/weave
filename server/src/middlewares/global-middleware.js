const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const { getClientIp } = require("@/middlewares/security/ip-address");
const { sessionMiddleware } = require("@/middlewares/security/session");

/**
 * Parses and validates allowed origins from environment variable.
 * In production, throws error if ALLOWED_ORIGINS is not configured.
 * In development, defaults to localhost URLs.
 *
 * @param {string} env - Comma-separated list of allowed origins
 * @returns {string[]} Array of normalized origin URLs
 * @throws {Error} In production when ALLOWED_ORIGINS is not set
 */
function parseAllowedOrigins(env) {
  if (!env) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "ALLOWED_ORIGINS não configurado! Defina a variável de ambiente em produção."
      );
    }
    // Development fallback: localhost only
    return ["http://localhost:3000", "http://localhost:5173"];
  }

  return env
    .split(",")
    .map((s) => s.trim().replace(/\/+$/, "")) // Remove trailing slashes
    .filter(Boolean);
}

/**
 * Escapes special characters in a string for use in regular expressions.
 *
 * @param {string} s - String to escape
 * @returns {string} Escaped string safe for RegExp
 */
function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Creates a matcher function for origin validation.
 * Supports wildcard patterns (e.g., https://*.domain.com).
 *
 * @param {string} allowed - Allowed origin pattern
 * @returns {Function} Matcher function that tests origin strings
 */
function buildMatcher(allowed) {
  if (allowed.includes("*")) {
    // Build regex pattern for wildcard matching
    const pattern = "^" + allowed.split("*").map(escapeRegExp).join(".*") + "$";
    const re = new RegExp(pattern);
    return (origin) => re.test(origin);
  }
  return (origin) => origin === allowed;
}

/**
 * Configures CORS options with dynamic origin validation.
 * In development, automatically allows localhost and 127.0.0.1 on any port.
 * In production, requires explicit Origin header and validates against whitelist.
 *
 * @param {string[]} allowedOrigins - Array of allowed origin URLs
 * @returns {Object} CORS configuration object
 */
function makeCorsOptions(allowedOrigins) {
  const isDev = process.env.NODE_ENV !== "production";

  // Development: allow localhost and 127.0.0.1 on any port
  const devMatchers = isDev
    ? [
        (origin) => /^http:\/\/localhost(:\d+)?$/.test(origin),
        (origin) => /^http:\/\/127\.0\.0\.1(:\d+)?$/.test(origin),
      ]
    : [];

  const matchers = allowedOrigins.map(buildMatcher).concat(devMatchers);

  return {
    origin(origin, cb) {
      // Allow requests without Origin header only in development
      // (e.g., testing tools like Postman, curl, or server-to-server)
      if (!origin) {
        if (isDev) {
          return cb(null, true);
        }
        return cb(new Error("Origin header obrigatório em produção"));
      }

      const normalized = origin.replace(/\/+$/, "");
      const ok = matchers.some((fn) => fn(normalized));

      if (ok) {
        return cb(null, true);
      }

      return cb(new Error("Origin not allowed by CORS policy, sorry :~"));
    },
    credentials: true, // Required for HttpOnly cookies
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
      "Cookie", // Required for cookie-based authentication
    ],
    exposedHeaders: ["Content-Range", "X-Content-Range", "Set-Cookie"],
    maxAge: 600, // Cache preflight requests for 10 minutes
    optionsSuccessStatus: 204,
  };
}

/**
 * Configures and applies global middleware to the Express application.
 * Order is important for security and functionality.
 *
 * @param {Express.Application} app - Express application instance
 */
function configureGlobalMiddlewares(app) {
  // Parse cookies from incoming requests (required for HttpOnly cookies)
  app.use(cookieParser());

  // Session management with PostgreSQL store
  app.use(sessionMiddleware);

  // Body parsing middleware
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());

  // Trust first proxy (required for accurate client IP detection)
  app.set("trust proxy", 1);

  // Extract and log client IP address
  app.use(getClientIp);

  // CORS configuration
  const allowedOrigins = parseAllowedOrigins(process.env.ALLOWED_ORIGINS);
  app.use(cors(makeCorsOptions(allowedOrigins)));

  // Security headers via Helmet
  app.use(
    helmet({
      // HTTP Strict Transport Security
      hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },

      // Content Security Policy
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", process.env.TRUSTED_CDN || "'self'"],
          objectSrc: ["'none'"],
          upgradeInsecureRequests: [], // Automatically upgrade HTTP to HTTPS
        },
      },

      // Prevent clickjacking attacks
      frameguard: { action: "deny" },

      // Prevent MIME type sniffing
      noSniff: true,

      // Control referrer information
      referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    })
  );
}

module.exports = { configureGlobalMiddlewares };
