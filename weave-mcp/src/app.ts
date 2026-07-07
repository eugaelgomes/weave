import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import express, { Request, Response } from "express";
import { zodToJsonSchema } from "zod-to-json-schema";
import crypto from "crypto";

import { env } from "./config/env";
import { authMiddleware } from "./middlewares/auth.middleware";
import { sseConnectionLimiter, messageActionLimiter } from "./middlewares/rate-limit.middleware";
import { buildRegistry, McpRegistry } from "./modules/registry";
import { defaultWeaveApiClient, createWeaveApiClient } from "./services/weave-api.factory";

/**
 * Configures MCP request handlers (tools, resources) on a given Server instance
 * using the provided registry. This function is reused for both stdio (singleton)
 * and SSE (per-session) server instances.
 *
 * @param {Server} server - The MCP Server instance to attach handlers to.
 * @param {McpRegistry} registry - The fully assembled module registry.
 */
function registerHandlers(server: Server, registry: McpRegistry): void {
  // Tools capability: list available tools
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

  // Tools capability: execute a tool by name
  server.setRequestHandler(
    CallToolRequestSchema,
    async (request) => {
      try {
        const tool = registry.tools[request.params.name];
        if (!tool) {
          throw new Error(`Tool not found: ${request.params.name}`);
        }

        const parsedArgs = tool.schema.parse(request.params.arguments);
        return await tool.handler(parsedArgs);
      } catch (error: any) {
        console.error(`[Error executing tool ${request.params.name}]:`, error);
        // Return a generic error message via JSON-RPC; details are logged exclusively to stderr
        throw new Error(`Internal error executing tool ${request.params.name}`);
      }
    }
  );

  // Resources capability: list available resource templates
  server.setRequestHandler(
    ListResourcesRequestSchema,
    async () => ({
      resources: registry.resources.templates,
    })
  );

  // Resources capability: read a specific resource by URI
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

  // Prompts capability: list available prompt templates
  server.setRequestHandler(
    ListPromptsRequestSchema,
    async () => ({
      prompts: Object.values(registry.prompts).map(({ name, description, arguments: args }) => ({
        name,
        description,
        arguments: args,
      })),
    })
  );

  // Prompts capability: execute a prompt template by name
  server.setRequestHandler(
    GetPromptRequestSchema,
    async (request) => {
      const prompt = registry.prompts[request.params.name];
      if (!prompt) {
        throw new Error(`Prompt not found: ${request.params.name}`);
      }
      return await prompt.handler(request.params.arguments ?? {});
    }
  );
}

/**
 * Creates a new MCP Server instance with the standard capability set.
 *
 * @returns {Server} A fresh MCP Server instance.
 */
function createMcpServer(): Server {
  return new Server(
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
}

/**
 * Initializes and starts the MCP server using the specified transport layer.
 *
 * - **stdio**: Creates a single Server instance using the default global API client.
 *   Suitable for local execution where the process owner's credentials are implicit.
 *
 * - **sse**: Spawns a per-session Server instance for each SSE connection. Each session
 *   receives its own API client bound to the connecting user's Bearer token, ensuring
 *   complete multi-tenant data isolation.
 *
 * @param {string} transportType - The desired transport protocol ("stdio" or "sse").
 * @returns {Promise<void>} Resolves when the server is successfully initialized.
 */
export const startMcpServer = async (transportType: string): Promise<void> => {
  if (transportType === "stdio") {
    const server = createMcpServer();
    const registry = buildRegistry(defaultWeaveApiClient);
    registerHandlers(server, registry);

    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Weave MCP Server running on Stdio transport.");
  } else if (transportType === "sse") {
    const app = express();
    const sessions = new Map<string, { transport: SSEServerTransport; server: Server }>();

    app.get("/sse", sseConnectionLimiter, authMiddleware, async (req: Request, res: Response) => {
      const sessionId = crypto.randomUUID();

      // Resolve the authentication token for per-session API client creation
      const userToken = req.headers.authorization?.split(" ")[1]
        || (typeof req.query.token === "string" ? req.query.token : null)
        || env.INTERNAL_API_TOKEN;

      // Build a per-session server with an isolated API client
      const apiClient = createWeaveApiClient(userToken);
      const registry = buildRegistry(apiClient);
      const server = createMcpServer();
      registerHandlers(server, registry);

      const sseTransport = new SSEServerTransport(`/messages?sessionId=${sessionId}`, res);
      sessions.set(sessionId, { transport: sseTransport, server });
      await server.connect(sseTransport);

      // Cleanup session resources on connection close
      res.on("close", () => {
        sessions.delete(sessionId);
      });
    });

    app.post("/messages", messageActionLimiter, authMiddleware, async (req: Request, res: Response) => {
      const sessionId = req.query.sessionId as string;
      const session = sessions.get(sessionId);

      if (session) {
        try {
          await session.transport.handlePostMessage(req, res);
        } catch (error) {
          console.error(`[Error handling post message for session ${sessionId}]:`, error);
          res.status(500).send("Internal server error.");
        }
      } else {
        res.status(404).send("SSE session not found or already closed.");
      }
    });

    const port = env.MCP_PORT;
    app.listen(port, () => {
      console.log(`Weave MCP Server listening on http://localhost:${port}/sse`);
    });
  }
};
