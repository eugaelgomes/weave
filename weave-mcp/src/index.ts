import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";

async function run() {
  const server = createServer();
  const transport = new StdioServerTransport();
  
  await server.connect(transport);
  console.error("Weave MCP Server executando via stdio.");
}

run().catch((error) => {
  console.error("Erro fatal no Weave MCP Server:", error);
  process.exit(1);
});
