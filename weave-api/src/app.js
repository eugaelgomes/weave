const express = require("express");
const Sentry = require("@sentry/node");
const {
  configureGlobalMiddlewares,
} = require("@/middlewares/http/apply-http-middleware");
const { errorHandler } = require("@/middlewares/errors/error-handler");
const { registerApiRoutes } = require("@/routes/weave.routes");

const app = express();

/**
 * 1. Health Check & Basic CORS
 */
app.get("/health", (req, res) => {
  const origin = req.headers.origin;
  const isDev = process.env.NODE_ENV !== "production";

  if (
    isDev &&
    origin &&
    /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
  ) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }

  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.setHeader("Pragma", "no-cache");

  res.send({
    message: "All systems operational",
    service: "Weave APIs",
    status: "online",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

/**
 * 2. Global Middlewares (Security, Parsing, Rate Limits)
 */
configureGlobalMiddlewares(app);

/**
 * 3. Routing (Internal & Public APIs)
 */
const SUPPORTED_VERSIONS = ["v1"];
SUPPORTED_VERSIONS.forEach((version) => registerApiRoutes(app, { version }));

/**
 * 4. Error Handling & Fallbacks (404 / 500)
 */
Sentry.setupExpressErrorHandler(app);
app.use(errorHandler.notFoundHandler);
app.use(errorHandler.globalErrorHandler);

module.exports = { app };
