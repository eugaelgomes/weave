import { z } from "zod";
import { AxiosInstance } from "axios";

/**
 * Represents a single MCP tool definition with its schema and request handler.
 *
 * @template T - The Zod schema type used for argument validation.
 */
export interface McpToolDefinition<T extends z.ZodTypeAny = z.ZodTypeAny> {
  name: string;
  description: string;
  schema: T;
  handler: (args: z.infer<T>) => Promise<any>;
}

/**
 * Describes an MCP resource template exposed to clients via the ListResources capability.
 */
export interface McpResourceTemplate {
  uriTemplate: string;
  name: string;
  description: string;
  mimeType: string;
}

/**
 * Represents a module's resource definition containing URI templates and a read handler.
 */
export interface McpResourceDefinition {
  templates: McpResourceTemplate[];
  readHandler: (uri: string) => Promise<any>;
}

/**
 * Describes the arguments accepted by an MCP prompt template.
 */
export interface McpPromptArgument {
  name: string;
  description?: string;
  required?: boolean;
}

/**
 * Represents a single MCP prompt definition with its arguments and handler.
 */
export interface McpPromptDefinition {
  name: string;
  description?: string;
  arguments?: McpPromptArgument[];
  handler: (args: Record<string, string>) => Promise<any>;
}

/**
 * Represents a complete MCP module definition containing tools, resources, and prompts.
 * Can be provided either as a static object or as a factory function that receives
 * an AxiosInstance for per-session API client injection (multi-tenant support).
 */
export interface McpModuleDefinition {
  tools?: Record<string, McpToolDefinition<any>>;
  resources?: McpResourceDefinition;
  prompts?: Record<string, any>;
}

/**
 * Factory function type that creates an MCP module definition bound to
 * a specific API client instance, enabling per-session data isolation.
 *
 * @param {AxiosInstance} apiClient - The Axios client scoped to the current session's auth token.
 * @returns {McpModuleDefinition} The module definition with handlers bound to the given client.
 */
export type McpModuleFactory = (apiClient: AxiosInstance) => McpModuleDefinition;
