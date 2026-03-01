const express = require("express");
const {
  configureGlobalMiddlewares,
} = require("@/middlewares/global-middleware");
const { errorHandler } = require("@/middlewares/error-handler");
const routes = require("@/routes");

// Inicializar JobManager (que já inicia o serviço de limpeza automaticamente)
require("@/services/jobs/index");

const app = express();

// Health check (ANTES dos middlewares CORS para permitir acesso sem Origin header)
app.get("/health", (req, res) => {
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.setHeader("Pragma", "no-cache");

  const healthcheck = {
    status: "online",
    uptime: process.uptime(),
    message: "All systems operational",
    timestamp: new Date().toISOString(),
    service: "weave-notes-api",
  };

  res.send(healthcheck);
});

// Middlewares globais
configureGlobalMiddlewares(app);

// api v1
app.use("/api/v1", routes);

// Not Found Handler
app.use(errorHandler.notFoundHandler);

// Global Error Handler
app.use(errorHandler.globalErrorHandler);

module.exports = { app };
