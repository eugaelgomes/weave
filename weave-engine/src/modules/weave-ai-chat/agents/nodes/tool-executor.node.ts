/**
 * @module weave-engine/modules/weave-ai-chat/agents/nodes/tool-executor.node
 */
const { logger } = require("../../../../config/logger");
const {
  isInternalTool,
  executeInternalTool,
} = require("../../../../llm-conectors/mcp-tools");

/**
 * Intelligently truncates a tool output to prevent breaking JSON structures when sending it back to the LLM.
 *
 * @param {any} output - The output to truncate.
 * @param {number} maxLength - The maximum string length allowed.
 * @returns {string} The safely truncated string.
 */
function truncateToolOutput(output, maxLength) {
  if (typeof output === "string") {
    if (output.length <= maxLength) return output;
    return (
      output.slice(0, maxLength) +
      "\n\n...[TRUNCATED BY ENGINE DUE TO SIZE LIMITS]"
    );
  }

  const jsonStr = JSON.stringify(output);
  if (jsonStr.length <= maxLength) return jsonStr;

  if (Array.isArray(output)) {
    let sliced = [...output];
    // Iteratively slice half until it fits
    while (sliced.length > 0 && JSON.stringify(sliced).length > maxLength) {
      sliced = sliced.slice(0, Math.max(1, Math.floor(sliced.length / 2)));
      if (sliced.length === 1 && JSON.stringify(sliced).length > maxLength) {
        break; // If a single element is too big, give up and let the fallback handle it
      }
    }
    sliced.push({
      _warning: "Results truncated by engine due to size limits.",
    });
    const finalStr = JSON.stringify(sliced);
    if (finalStr.length <= maxLength + 500) {
      // allow a bit of buffer for the warning
      return finalStr;
    }
  }

  // Fallback for objects or extremely large single array elements
  return (
    jsonStr.slice(0, maxLength) +
    "\n\n...[TRUNCATED BY ENGINE DUE TO SIZE LIMITS - WARNING: INVALID JSON SYNTAX]"
  );
}

async function toolExecutorNode(state) {
  logger.info("Tool Executor node running");

  if (!state.pendingToolCalls || state.pendingToolCalls.length === 0) {
    return { errors: ["No pending tool calls to execute."] };
  }

  const executedActions = state.executedActions
    ? [...state.executedActions]
    : [];
  const newMessages = [];

  // Extract external tool calls (if any)
  const internalCalls = state.pendingToolCalls.filter((t) =>
    isInternalTool(t.function.name)
  );
  const externalCalls = state.pendingToolCalls.filter(
    (t) => !isInternalTool(t.function.name)
  );

  if (internalCalls.length > 0 && externalCalls.length === 0) {
    // Execute all internal tools in parallel to minimize latency overhead
    const results = await Promise.all(
      internalCalls.map(async (tc) => {
        const fnName = tc.function.name;
        const fnArgs = tc.rawArgs;

        // Optional: send chunk to UI
        if (state.executionContext && state.executionContext.onChunk) {
          state.executionContext.onChunk({
            name: fnName,
            status: "running",
            type: "action_state",
          });
        }

        const result = await executeInternalTool(
          fnName,
          fnArgs,
          state.executionContext
        );

        if (state.executionContext && state.executionContext.onChunk) {
          state.executionContext.onChunk({
            name: fnName,
            status: "completed",
            success: !result.error,
            type: "action_state",
          });
        }

        executedActions.push({
          arguments: fnArgs,
          name: fnName,
          result: result.error || "success",
        });

        return {
          name: fnName,
          result,
          toolCallId: tc.id,
        };
      })
    );

    results.forEach((r) => {
      const truncated = truncateToolOutput(r.result, 15000);
      newMessages.push({
        content: truncated,
        name: r.name,
        role: "tool",
        tool_call_id: r.toolCallId,
      });
    });

    return {
      // Clear pending calls
      executedActions,

      messages: [...(state.messages || []), ...newMessages],
      pendingToolCalls: [],
    };
  } else if (externalCalls.length > 0) {
    // External tools (MCP tools) currently exit the loop to be returned to the client
    // or handled externally (not fully implemented in old loop but we mimic standard behaviour)
    logger.warn(
      "External tool calls are not supported by the internal tool executor yet."
    );

    return {
      // We pass the external calls back in the state if needed
      externalToolCalls: externalCalls,

      finalResponse: null,

      // End the graph and let caller handle external calls
      pendingToolCalls: [],
    };
  }

  return { pendingToolCalls: [] };
}

module.exports = { toolExecutorNode };
