import { env } from "./config/env";
import { startMcpServer } from "./app";

const transportType = env.MCP_TRANSPORT;

startMcpServer(transportType).catch((error) => {
  console.error("Failed to start Weave MCP Server:", error);
  process.exit(1);
});
