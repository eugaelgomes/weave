const express = require("express");
const {
  configureGlobalMiddlewares,
} = require("@/middlewares/global-middleware");
const { errorHandler } = require("@/middlewares/error-handler");
const routes = require("@/routes");

// Inicializar JobManager (que já inicia o serviço de limpeza automaticamente)
require("@/services/jobs/index");

const app = express();

// Middlewares globais
configureGlobalMiddlewares(app);

// api v1
app.use("/api/v1", routes);

// Not Found Handler
app.use(errorHandler.notFoundHandler);

// Global Error Handler
app.use(errorHandler.globalErrorHandler);

module.exports = { app };
