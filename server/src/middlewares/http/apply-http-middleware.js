const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const { getClientIp } = require("./ip-address");
const { sessionMiddleware } = require("./session");
const { sessionTrackerMiddleware } = require("./session-tracker");
const { sessionLifecycleMiddleware } = require("./session-lifecycle");
const { csrfOriginMiddleware } = require("@/middlewares/security/csrf-origin");
const { makeCorsOptions } = require("./cors");
const { requestIdMiddleware } = require("@/middlewares/request-id");
const { telemetryMiddleware } = require("./telemetry");
const { storageUrlInterceptorMiddleware } = require("./storage-url.middleware");

/**
 * Captures the raw request body for Slack signature verification (`req.rawBody`).
 * @param {import('express').Request} req
 * @param {import('express').Response} _res
 * @param {Buffer} buf
 */
function captureRawBody(req, _res, buf) {
  req.rawBody = buf;
}

function configureGlobalMiddlewares(app) {
  app.use(requestIdMiddleware);
  app.use(telemetryMiddleware);
  app.use(cookieParser());
  app.use(sessionMiddleware);
  app.use(sessionLifecycleMiddleware);
  app.use(sessionTrackerMiddleware);
  app.use(storageUrlInterceptorMiddleware);

  app.use(express.urlencoded({ extended: true, verify: captureRawBody }));
  app.use(express.json({ verify: captureRawBody }));

  app.set("trust proxy", 1);
  app.use(getClientIp);

  const corsMiddleware = cors(makeCorsOptions());
  app.use((req, res, next) => {
    // Ignore CORS for:
    // - Webhooks (POST do Google Calendar)
    // - SSO OAuth (GET redirects do browser, wi header Origin)
    if (req.method === "POST" && req.path === "/api/v1/webhooks/google/calendar") {
      return next();
    }
    if (
      req.path.startsWith("/api/v1/integrations/slack/events") ||
      req.path.startsWith("/api/v1/integrations/slack/interactivity") ||
      req.path.startsWith("/api/v1/integrations/slack/oauth/callback")
    ) {
      return next();
    }
    if (req.method === "GET" && req.path.startsWith("/api/v1/auth/signin/sso/")) {
      return next();
    }
    if (req.method === "GET" && req.path.startsWith("/api/v1/webhooks/google/callback")) {
      return next();
    }
    if (req.method === "GET" && req.path.startsWith("/api/v1/webhooks/google/auth")) {
      return next();
    }
    if (req.method === "GET" && req.path.startsWith("/api/v1/integrations/slack/install")) {
      return next();
    }
    return corsMiddleware(req, res, next);
  });
  app.use(csrfOriginMiddleware);

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          objectSrc: ["'none'"],
          scriptSrc: ["'self'", process.env.TRUSTED_CDN || "'self'"],
          upgradeInsecureRequests: [],
        },
      },
      frameguard: { action: "deny" },
      hsts: { includeSubDomains: true, maxAge: 31536000, preload: true },
      noSniff: true,
      referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    })
  );
}

module.exports = { configureGlobalMiddlewares };
