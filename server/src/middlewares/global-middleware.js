const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const { getClientIp } = require("@/middlewares/ip-address");
const { sessionMiddleware } = require("@/middlewares/session");
const { allowedOrigins } = require("@/config/allowed-origins");

// Allowed origins cors
const WHITELIST = allowedOrigins;

// RegExp
function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Origin validator
function buildMatcher(allowed) {
  if (allowed.includes("*")) {
    const pattern = "^" + allowed.split("*").map(escapeRegExp).join(".*") + "$";
    const re = new RegExp(pattern);
    return (origin) => re.test(origin);
  }
  return (origin) => origin === allowed;
}

function makeCorsOptions() {
  const isDev = process.env.NODE_ENV !== "production";

  const devMatchers = isDev
    ? [
        (origin) => /^http:\/\/localhost(:\d+)?$/.test(origin),
        (origin) => /^http:\/\/127\.0\.0\.1(:\d+)?$/.test(origin),
      ]
    : [];

  const matchers = WHITELIST.map(buildMatcher).concat(devMatchers);

  return {
    origin(origin, cb) {
      if (!origin) {
        if (isDev) {
          return cb(null, true);
        }
        return cb(
          new Error("Headless requests are not allowed in production.")
        );
      }

      const normalized = origin.replace(/\/+$/, "");
      const ok = matchers.some((fn) => fn(normalized));

      if (ok) {
        return cb(null, true);
      }
      return cb(new Error("Origin not allowed by CORS."));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
      "Cookie",
    ],
    exposedHeaders: ["Content-Range", "X-Content-Range", "Set-Cookie"],
    maxAge: 600,
    optionsSuccessStatus: 204,
  };
}

function configureGlobalMiddlewares(app) {
  app.use(cookieParser());
  app.use(sessionMiddleware);

  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());

  app.set("trust proxy", 1);
  app.use(getClientIp);

  const corsMiddleware = cors(makeCorsOptions());
  app.use((req, res, next) => {
    // Ignore CORS for:
    // - Webhooks (POST do Google Calendar)
    // - SSO OAuth (GET redirects do browser, wi header Origin)
    if (
      req.method === "POST" &&
      req.path === "/api/v1/webhooks/google/calendar"
    ) {
      return next();
    }
    if (
      req.method === "GET" &&
      req.path.startsWith("/api/v1/auth/signin/sso/")
    ) {
      return next();
    }
    if (
      req.method === "GET" &&
      req.path.startsWith("/api/v1/webhooks/google/callback")
    ) {
      return next();
    }
    return corsMiddleware(req, res, next);
  });

  app.use(
    helmet({
      hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", process.env.TRUSTED_CDN || "'self'"],
          objectSrc: ["'none'"],
          upgradeInsecureRequests: [],
        },
      },
      frameguard: { action: "deny" },
      noSniff: true,
      referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    })
  );
}

module.exports = { configureGlobalMiddlewares };
