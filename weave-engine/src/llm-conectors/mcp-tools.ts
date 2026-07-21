/**
 * @module weave-engine/modules/core/tools/tool-dispatcher
 * @description Centralized registry and dispatcher for internal AI agent actions.
 * Maps function names to their concrete action implementations and schemas using MCP.
 */

import { logger } from "../config/logger";
import { getMCPClient, ExecutionContext } from "../config/mcp.client";

/**
 * Evaluates whether a given tool name is registered as an internal execution target.
 * Since we fetch tools dynamically via MCP, we assume tools are handled by the API.
 *
 * @param {string} functionName - The name of the tool call requested by the LLM.
 * @returns {boolean} True if the tool is handled by the internal engine.
 */
export function isInternalTool(_functionName: string): boolean {
  // We delegate tool validation to the MCP server.
  return true;
}

/**
 * Dispatches an internal tool execution by routing the arguments to the MCP Server.
 *
 * @param {string} functionName - The registered internal tool name.
 * @param {any} args - The parsed arguments provided by the LLM.
 * @param {ExecutionContext} executionContext - Request-scoped authentication context.
 * @returns {Promise<any>} The result of the action execution, or an error payload.
 */
export async function executeInternalTool(
  functionName: string,
  args: Record<string, unknown>,
  executionContext: ExecutionContext
): Promise<unknown> {
  logger.info(`Executing tool via MCP: ${functionName}`);
  try {
    const client = await getMCPClient(executionContext);
    const result = await client.executeTool(functionName, args);

    // Process MCP result format
    if (result.isError) {
      return { error: result.content.map((c: { text?: string }) => c.text || "").join("\n") };
    }

    if (result.content && result.content.length > 0) {
      try {
        return JSON.parse(result.content[0].text);
      } catch {
        return result.content[0].text;
      }
    }

    return result;
  } catch (error: unknown) {
    logger.error(`MCP tool ${functionName} failed`, {
      error: (error as Error).message,
    });
    return { error: (error as Error).message };
  }
}

/**
 * Retrieves the complete array of internal tool schemas to pass to the LLM via MCP.
 *
 * @param {ExecutionContext} executionContext - Workspace context.
 * @returns {Promise<Array<any>>} An array of OpenAI-compatible function schemas.
 */
export async function getInternalToolDefinitions(
  executionContext: ExecutionContext
): Promise<Array<unknown>> {
  try {
    const client = await getMCPClient(executionContext);
    return await client.getTools();
  } catch (error: unknown) {
    logger.error("Failed to fetch tools from MCP server", { error: (error as Error).message });
    return [];
  }
}
