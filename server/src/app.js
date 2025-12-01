const express = require("express");
const {
  configureGlobalMiddlewares,
} = require("@/middlewares/global-middleware");
const { errorHandler } = require("@/middlewares/error-handler");
const routes = require("@/routes/index.routes");

const app = express();

// Middlewares globais
configureGlobalMiddlewares(app);

// Rota base
app.use("/api", routes);

// Not Found Handler
app.use(errorHandler.notFoundHandler);

// Global Error Handler
app.use(errorHandler.globalErrorHandler);

module.exports = { app };
