/**
 * @module agent-house/services/chat-functions.service
 * @description Service responsible for executing tools/functions requested by the LLM.
 *
 * Dependencies:
 * - `../handlers/tool-registry`: To dynamically resolve tool names to their handler implementations.
 * - `../utils/agent-house-i18n.util`: For localized error messages if a function is not supported.
 *
 * Used by:
 * - `agent-house/services/chat-orchestrator.service.js`: During the ReAct loop to execute functions returned by the engine.
 */
const { getI18n } = require("./agent-house-i18n.util");

class ChatFunctionsService {
  /**
   * Execute a single authorized tool/function call.
   *
   * @param {string} userId - The ID of the authenticated user.
   * @param {{name: string, arguments?: Record<string, unknown>}} functionCall - The tool execution details.
   * @param {string|null} [organizationId=null] - Optional workspace ID scope for the call.
   * @param {string} [lang="pt"] - User language for error translations.
   * @returns {Promise<{name: string, success: boolean, result?: object}>} Result of the tool execution.
   */
  async executeFunctionCall(
    userId,
    functionCall,
    organizationId = null,
    lang = "en-US",
    files = []
  ) {
    const t = getI18n(lang);
    const name = String(functionCall?.name || "");
    const args =
      functionCall?.arguments && typeof functionCall.arguments === "object"
        ? functionCall.arguments
        : {};

    const registry = require("../handlers/tool-registry");
    const handler = registry.getHandler(name);

    if (!handler) {
      const error = new Error(
        typeof t.functionNotSupported === "function"
          ? t.functionNotSupported(name)
          : t.functionNotSupported
      );
      error.code = "CHAT_FUNCTION_NOT_SUPPORTED";
      error.statusCode = 400;
      throw error;
    }

    return await handler.execute({
      args,
      files,
      lang,
      name,
      organizationId,
      t,
      toolCallId: functionCall?.id,
      userId,
    });
  }

  /**
   * Executes all function calls from engine response.
   *
   * @param {string} userId - The ID of the authenticated user.
   * @param {Array<{name: string, arguments?: Record<string, unknown>}>} functionCalls - Array of tool execution details.
   * @param {string|null} [organizationId=null] - Optional workspace ID scope for the calls.
   * @param {string} [lang="pt"] - User language for error translations.
   * @param {Function} [onChunk=null] - Callback to stream real-time execution state.
   * @returns {Promise<Array<object>>} Results of all tool executions.
   */
  async executeFunctionCalls(
    userId,
    functionCalls = [],
    organizationId = null,
    lang = "en-US",
    onChunk = null,
    files = []
  ) {
    const results = [];
    for (const functionCall of functionCalls) {
      if (onChunk) {
        onChunk({
          arguments: functionCall?.arguments,
          id: functionCall?.id,
          name: functionCall?.name,
          type: "tool_call_start",
        });
      }
      try {
        const execution = await this.executeFunctionCall(
          userId,
          functionCall,
          organizationId,
          lang,
          files
        );
        results.push(execution);
        if (onChunk) {
          onChunk({
            id: functionCall?.id,
            result: execution.result || execution,
            type: "tool_call_result",
          });
        }
      } catch (error) {
        console.warn(
          `[agent-house/chat] Tool execution failed for ${functionCall?.name}:`,
          error?.message
        );
        results.push({
          error: error?.message || String(error),
          name: functionCall?.name || "unknown",
          success: false,
        });
        if (onChunk) {
          onChunk({
            id: functionCall?.id,
            result: { error: error?.message || String(error) },
            type: "tool_call_result",
          });
        }
      }
    }
    return results;
  }
}

module.exports = new ChatFunctionsService();
