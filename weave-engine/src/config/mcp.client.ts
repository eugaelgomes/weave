import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { logger } from "@/config/logger";

export interface ExecutionContext {
  userId: string | number;
  organizationId?: string | number | null;
}

export class MCPClient {
  private executionContext: ExecutionContext;
  private client: Client | null;
  private transport: SSEClientTransport | null;
  private connectionPromise: Promise<void> | null;

  constructor(executionContext: ExecutionContext) {
    this.executionContext = executionContext;
    this.client = null;
    this.transport = null;
    this.connectionPromise = null;
  }

  async connect(): Promise<void> {
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = (async () => {
      const apiUrl = process.env.WEAVE_API_URL || "http://localhost:8080";
      const sseUrl = new URL("/api/service/v1/mcp/sse", apiUrl).toString();

      const headers = {
        "x-weave-org-id": String(this.executionContext.organizationId || ""),
        "x-weave-user-id": String(this.executionContext.userId || ""),
      };

      const transport = new SSEClientTransport(
        new URL(sseUrl),
        {
          eventSourceInit: { headers } as Record<string, unknown>,
          requestInit: { headers },
        }
      );

      const client = new Client(
        { name: "weave-engine", version: "1.0.0" },
        { capabilities: {} }
      );

      try {
        await client.connect(transport);
        this.client = client;
        this.transport = transport;
        logger.info("Connected to MCP Server via SSE for execution context", {
          userId: this.executionContext.userId,
        });
      } catch (error: unknown) {
        this.connectionPromise = null;
        logger.error("Failed to connect to MCP Server", { error: (error as Error).message });
        throw error;
      }
    })();

    return this.connectionPromise;
  }

  async getTools(): Promise<Record<string, unknown>[]> {
    await this.connect();
    if (!this.client) {
      throw new Error("MCP Client not connected");
    }
    const result = await this.client.listTools();

    // Transform MCP tools format to OpenAI function schemas
    return result.tools.map(tool => ({
      function: {
        description: tool.description,
        name: tool.name,
        parameters: tool.inputSchema,
      },
      type: "function"
    }));
  }

  async executeTool(name: string, args: Record<string, unknown>): Promise<unknown> {
    await this.connect();
    if (!this.client) {
      throw new Error("MCP Client not connected");
    }
    const result = await this.client.callTool({
      arguments: args,
      name,
    });

    return result;
  }

  async close(): Promise<void> {
    if (this.client) {
      try {
        await this.client.close();
      } catch (error: unknown) {
        logger.warn("Error closing MCP client", { error: (error as Error).message });
      }
      this.client = null;
      this.transport = null;
      this.connectionPromise = null;
    }
  }
}

// Simple connection pool for reusability if needed, mapped by userId + orgId
const clientsPool = new Map<string, MCPClient>();

/**
 * Gets or creates an MCPClient for the given execution context.
 * For now, we instantiate a new client, but can pool them to improve performance.
 */
export async function getMCPClient(executionContext: ExecutionContext): Promise<MCPClient> {
  const key = `${executionContext.userId}-${executionContext.organizationId || "none"}`;
  if (clientsPool.has(key)) {
    return clientsPool.get(key) as MCPClient;
  }

  const client = new MCPClient(executionContext);
  clientsPool.set(key, client);
  return client;
}
