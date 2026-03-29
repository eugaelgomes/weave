const express = require("express");
const { configureGlobalMiddlewares } = require("@/middlewares/global-middleware");
const { errorHandler } = require("@/middlewares/error-handler");
const v1InternalRoutes = require("./v1-internal.routes");
const v1PublicRoutes = require("./v1-public.routes");

require("@/services/jobs/index");

const app = express();

/**
 * 1. Health Check & Basic CORS
 */
app.get("/health", (req, res) => {
  const origin = req.headers.origin;
  const isDev = process.env.NODE_ENV !== "production";

  if (isDev && origin && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }

  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.setHeader("Pragma", "no-cache");

  res.send({
    message: "All systems operational",
    service: "weave-notes-api",
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
app.use("/api/v1", v1InternalRoutes);
app.use("/api/public/v1", v1PublicRoutes);

/**
 * 4. Error Handling & Fallbacks (404 / 500)
 */
app.use(errorHandler.notFoundHandler);
app.use(errorHandler.globalErrorHandler);

module.exports = { app };
