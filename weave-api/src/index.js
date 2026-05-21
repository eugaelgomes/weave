require("module-alias/register");
require("dotenv").config();
require("./instrument");
const Sentry = require("@sentry/node");
const http = require("http");
const { app } = require("@/app");
const { pool } = require("@/database/connection");
const responseConsumer = require("@/services/reasoning/response-consumer");
const triggerConsumer = require("@/services/reasoning/trigger-consumer");

/**
 * @param {*} val
 * @returns
 */
const normalizePort = (val) => {
  const port = parseInt(val, 10);
  if (isNaN(port)) return val;
  if (port >= 0) return port;
  return false;
};

const port = normalizePort(process.env.APP_PORT || "8080");
app.set("port", port);

const server = http.createServer(app);

/**
 *
 * @param {*} error
 */
function onError(error) {
  if (error.syscall !== "listen") throw error;

  const bind = typeof port === "string" ? "Pipe " + port : "Port " + port;

  switch (error.code) {
    case "EACCES":
      console.error(`${bind} requires elevated privileges`);
      process.exit(1);
      break;
    case "EADDRINUSE":
      console.error(`${bind} is already in use`);
      process.exit(1);
      break;
    default:
      throw error;
  }
}

server.listen(port, "0.0.0.0");
server.on("error", onError);
server.on("listening", () => {
  const addr = server.address();
  const bind = typeof addr === "string" ? "pipe " + addr : "port " + addr.port;
  console.log(`Weave Notes API running on ${bind}`);

  // Start background consumers
  responseConsumer.start().catch((err) => {
    console.error("[API] Failed to start response consumer:", err);
  });
  
  triggerConsumer.start().catch((err) => {
    console.error("[API] Failed to start trigger consumer:", err);
  });
});

/**
 * Handles graceful shutdown of the server
 * @param {*} signal
 */
const gracefulShutdown = async (signal) => {
  console.log(`${signal} signal received: closing HTTP server`);

  const shutdownTimeout = setTimeout(() => {
    console.error("Graceful shutdown timeout, forcing exit");
    process.exit(1);
  }, 30000);

  try {
    await new Promise((resolve, reject) => {
      server.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    console.log("HTTP server closed");

    await pool.end();
    console.log("Database connections closed");

    clearTimeout(shutdownTimeout);
    await Sentry.close(2000);
    process.exit(0);
  } catch (error) {
    console.error("Error during graceful shutdown:", error);
    clearTimeout(shutdownTimeout);
    Sentry.captureException(error);
    await Sentry.close(2000);
    process.exit(1);
  }
};

// Sinais de shutdown
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

process.on("uncaughtException", async (error) => {
  console.error("Uncaught Exception thrown:", error);
  Sentry.captureException(error);
  await Sentry.close(2000);
  process.exit(1);
});

process.on("unhandledRejection", async (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  Sentry.captureException(reason);
  await Sentry.close(2000);
  process.exit(1);
});
