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

// Increase timeouts to prevent proxies from dropping long-running AI requests
server.keepAliveTimeout = 120000; // 120 seconds
server.headersTimeout = 125000; // 125 seconds

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

const { configureShutdown } = require("@/config/shutdown");

// Configures shutdown signals and process-level loggers
configureShutdown(server);
