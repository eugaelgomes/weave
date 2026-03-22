const express = require("express");
const {
  configureGlobalMiddlewares,
} = require("@/middlewares/global-middleware");
const { errorHandler } = require("@/middlewares/error-handler");
const routes = require("@/routes");

require("@/services/jobs/index");

const app = express();

/**
 * Health Check Endpoint
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

  const healthcheck = {
    message: "All systems operational",
    service: "weave-notes-api",
    status: "online",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  };

  res.send(healthcheck);
});

configureGlobalMiddlewares(app);

// api v1
app.use("/api/v1", routes);

// Not Found Handler
app.use(errorHandler.notFoundHandler);

// Global Error Handler
app.use(errorHandler.globalErrorHandler);

module.exports = { app };
