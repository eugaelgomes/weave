import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import express, { Request, Response } from "express";
import { zodToJsonSchema } from "zod-to-json-schema";
import registry from "./modules";

import { env } from "./config/env";

const server = new Server(
  {
    name: "weave-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
      resources: {},
      prompts: {},
    },
  }
);

// 1. Tools Registration
server.setRequestHandler(
  ListToolsRequestSchema,
  async () => ({
    tools: Object.values(registry.tools).map(({ name, description, schema }) => ({
      name,
      description,
      inputSchema: zodToJsonSchema(schema as any) as any,
    })),
  })
);

server.setRequestHandler(
  CallToolRequestSchema,
  async (request) => {
    const tool = registry.tools[request.params.name];
    if (!tool) {
      throw new Error(`Tool not found: ${request.params.name}`);
    }
    
    const parsedArgs = tool.schema.parse(request.params.arguments);
    return await tool.handler(parsedArgs);
  }
);

// 2. Resources Registration
server.setRequestHandler(
  ListResourcesRequestSchema,
  async () => ({
    resources: registry.resources.templates,
  })
);

server.setRequestHandler(
  ReadResourceRequestSchema,
  async (request) => {
    for (const handler of registry.resources.readHandlers) {
      const result = await handler(request.params.uri);
      if (result) return result;
    }
    throw new Error(`Resource not found: ${request.params.uri}`);
  }
);

// 3. Transports Initialization
export const startMcpServer = async (transportType: string): Promise<void> => {
  if (transportType === "stdio") {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Weave MCP Server running on Stdio transport.");
  } else if (transportType === "sse") {
    const app = express();
    let sseTransport: SSEServerTransport | null = null;
    
    app.get("/sse", async (req: Request, res: Response) => {
      sseTransport = new SSEServerTransport("/messages", res);
      await server.connect(sseTransport);
    });
    
    app.post("/messages", async (req: Request, res: Response) => {
      if (sseTransport) {
        await sseTransport.handlePostMessage(req, res);
      } else {
        res.status(400).send("SSE session not established.");
      }
    });
    
    const port = env.MCP_PORT;
    app.listen(port, () => {
      console.log(`Weave MCP Server listening on http://localhost:${port}/sse`);
    });
  }
};
