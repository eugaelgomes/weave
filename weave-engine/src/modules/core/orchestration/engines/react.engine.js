/**
 * @module weave-engine/modules/core/orchestration/engines/react.engine
 * @description Implements the core ReAct (Reasoning and Acting) autonomous loop.
 * This engine iteratively calls the LLM, executes local internal tools, and feeds the results back
 * until a final text answer is reached or an external API tool is requested.
 *
 * Dependencies:
 * - `../../providers/llm-provider.client`: To call the LLM model.
 * - `../../tools/tool-dispatcher`: To evaluate and execute internal functions.
 */
const { callAIProvider } = require("../../providers/llm-provider.client");
const {
  isInternalTool,
  executeInternalTool,
  getInternalToolDefinitions,
} = require("../../tools/tool-dispatcher");

const MAX_REACT_ITERATIONS = Number.parseInt(
  process.env.WEAVE_ENGINE_MAX_REACT_ITERATIONS || "4",
  10
);
const MAX_AGENTIC_DURATION_MS = Number.parseInt(
  process.env.WEAVE_ENGINE_CHAT_TASK_TIMEOUT_MS || "65000",
  10
);

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

/**
 * Autonomous ReAct Loop logic.
 * Iteratively prompts the LLM to either generate text or request a tool call.
 * Internal tools are executed immediately and their output is appended to the conversation history.
 *
 * @param {object} params - Execution parameters.
 * @param {boolean} params.allowEdit - Whether the agent has permission to edit data.
 * @param {boolean} params.allowWebSearch - Whether web search tools should be injected.
 * @param {Array} params.files - Contextual files attached to the request.
 * @param {Array} params.functions - External tool schemas passed from the API.
 * @param {string} params.message - The initial user prompt.
 * @param {string} params.model - The requested LLM model to use.
 * @param {string} params.systemMessage - The base system instructions.
 * @param {Array} [params.conversationHistory=[]] - Previous turn history.
 * @param {object} [params.executionContext={}] - Workspace context (userId, organizationId, language).
 * @returns {Promise<{data: object, providerUsed: string, executedActions: Array, functions?: Array}>} Result payload.
 */
async function executeAgenticTask({
  allowEdit,
  allowWebSearch,
  files,
  functions,
  message,
  model,
  systemMessage,
  conversationHistory = [],
  executionContext = {},
}) {
  let iterations = 0;
  const startedAt = Date.now();
  const executedActions = [];

  // Combine internal engine tools with API tools
  const availableFunctions = [...(functions || [])];
  if (allowEdit) {
    availableFunctions.push(...getInternalToolDefinitions(allowWebSearch));
  }

  const currentOptions = {
    allowEdit,
    files,
    functions: availableFunctions.length > 0 ? availableFunctions : undefined,
    messages: [...conversationHistory],
    onChunk: executionContext.onChunk,
  };

  // Add the initial user message to history immediately so it persists across ReAct loops
  currentOptions.messages.push({
    role: "user",
    content: message,
  });

  let currentPrompt = ""; // The message is now in messages history, no need for prompt
  let providerUsed = null;
  const failureCounts = {};

  // Primary ReAct While Loop
  // Continues until MAX_REACT_ITERATIONS is hit, time limit expires, or a final answer is returned.
  while (iterations < MAX_REACT_ITERATIONS) {
    if (Date.now() - startedAt >= MAX_AGENTIC_DURATION_MS) {
      const isPt =
        executionContext.language &&
        executionContext.language.toLowerCase().startsWith("pt");
      const msg = isPt
        ? "Atingi o limite de tempo interno da ferramenta e precisei parar o raciocínio. Fique à vontade para me pedir para continuar!"
        : "I hit the internal time limit for this task and had to stop early. Feel free to ask me to continue!";
      return {
        data: { type: "text", text: msg, content: msg },
        providerUsed,
        executedActions,
      };
    }

    iterations++;

    const { data, provider } = await callAIProvider({
      options: currentOptions,
      model,
      prompt: currentPrompt,
      systemMessage,
    });

    providerUsed = provider;
    currentPrompt = ""; // Clear prompt after first turn, history handles the rest

    if (data.type === "function_call" && data.toolCalls) {
      const toolCallsArray = data.toolCalls.map((tc, idx) => {
        return {
          id:
            tc.id ||
            `call_${Math.random().toString(36).substring(2, 11)}_${idx}`,
          function: {
            name: tc.name,
            arguments: JSON.stringify(tc.arguments),
          },
          rawArgs: tc.arguments,
        };
      });

      // Add assistant tool_call message to history
      currentOptions.messages.push({
        role: "assistant",
        content: null,
        rawParts: data.rawParts,
        tool_calls: toolCallsArray.map((t) => ({
          id: t.id,
          function: t.function,
        })),
      });

      const internalCalls = toolCallsArray.filter((t) =>
        isInternalTool(t.function.name)
      );
      const externalCalls = toolCallsArray.filter(
        (t) => !isInternalTool(t.function.name)
      );

      if (internalCalls.length > 0 && externalCalls.length === 0) {
        // Execute all internal tools in parallel to minimize latency overhead
        const results = await Promise.all(
          internalCalls.map(async (tc) => {
            const fnName = tc.function.name;
            const fnArgs = tc.rawArgs;
            if (executionContext.onChunk) {
              executionContext.onChunk({
                type: "action_state",
                name: fnName,
                status: "running",
              });
            }
            try {
              const result = await executeInternalTool(
                fnName,
                fnArgs,
                executionContext
              );
              if (executionContext.onChunk) {
                executionContext.onChunk({
                  type: "action_state",
                  name: fnName,
                  status: "completed",
                  success: true,
                });
              }
              return { tc, result, error: null };
            } catch (err) {
              if (executionContext.onChunk) {
                executionContext.onChunk({
                  type: "action_state",
                  name: fnName,
                  status: "completed",
                  success: false,
                });
              }
              return {
                tc,
                result: null,
                error: err.message || "Tool execution failed",
              };
            }
          })
        );

        let circuitBreakerTripped = false;
        let failingToolName = null;

        for (const { tc, result, error } of results) {
          const fnName = tc.function.name;
          const fnArgs = tc.rawArgs;

          if (error) {
            const signature = `${fnName}:${JSON.stringify(fnArgs)}`;
            failureCounts[signature] = (failureCounts[signature] || 0) + 1;
            if (failureCounts[signature] >= 2) {
              circuitBreakerTripped = true;
              failingToolName = fnName;
            }
          }

          const output = error ? { error } : result;

          executedActions.push({ name: fnName, args: fnArgs, result: output });

          const contentStr = truncateToolOutput(output, 12000);

          currentOptions.messages.push({
            role: "tool",
            name: fnName,
            tool_call_id: tc.id,
            content: contentStr,
          });
        }

        if (circuitBreakerTripped) {
          const msg =
            "Estou tendo problemas técnicos contínuos com a ferramenta " +
            (failingToolName || "") +
            " e não consegui concluir a tarefa. Por favor, reformule o pedido ou tente novamente mais tarde.";
          return {
            data: { type: "text", text: msg, content: msg },
            providerUsed,
            executedActions,
          };
        }

        continue;
      } else {
        // If there is ANY external tool, we return to API to execute them.
        return {
          data,
          functions: data.toolCalls,
          providerUsed,
          executedActions,
        };
      }
    } else if (data.type === "function_call" && data.functionCall) {
      // Fallback for older interface behavior just in case
      const fnName = data.functionCall.name;
      const fnArgs = data.functionCall.arguments;
      const toolCallId =
        data.toolCallId ||
        `call_${Math.random().toString(36).substring(2, 11)}`;

      // Add assistant tool_call message to history
      currentOptions.messages.push({
        role: "assistant",
        content: null,
        rawParts: data.rawParts,
        tool_calls: [
          {
            id: toolCallId,
            function: {
              name: fnName,
              arguments: JSON.stringify(fnArgs),
            },
          },
        ],
      });

      if (isInternalTool(fnName)) {
        if (executionContext.onChunk) {
          executionContext.onChunk({
            type: "action_state",
            name: fnName,
            status: "running",
          });
        }
        // Execute internally and loop
        let result = null;
        let error = null;
        try {
          result = await executeInternalTool(fnName, fnArgs, executionContext);
          if (executionContext.onChunk) {
            executionContext.onChunk({
              type: "action_state",
              name: fnName,
              status: "completed",
              success: true,
            });
          }
        } catch (err) {
          error = err.message || "Tool execution failed";
          if (executionContext.onChunk) {
            executionContext.onChunk({
              type: "action_state",
              name: fnName,
              status: "completed",
              success: false,
            });
          }
        }

        if (error) {
          const signature = `${fnName}:${JSON.stringify(fnArgs)}`;
          failureCounts[signature] = (failureCounts[signature] || 0) + 1;
          if (failureCounts[signature] >= 2) {
            const msg =
              "Estou tendo problemas técnicos contínuos com a ferramenta " +
              fnName +
              " e não consegui concluir a tarefa. Por favor, tente de novo mais tarde.";
            return {
              data: { type: "text", text: msg, content: msg },
              providerUsed,
              executedActions,
            };
          }
        }

        const output = error ? { error } : result;
        executedActions.push({ name: fnName, args: fnArgs, result: output });

        const contentStr = truncateToolOutput(output, 12000);

        currentOptions.messages.push({
          role: "tool",
          name: fnName,
          tool_call_id: toolCallId,
          content: contentStr,
        });

        continue;
      } else {
        // External tool: Return to API to be executed
        return {
          data,
          functions: [
            {
              id: toolCallId,
              name: fnName,
              arguments: fnArgs,
            },
          ],
          providerUsed,
          executedActions,
        };
      }
    }

    // Return text response
    return {
      data: {
        ...data,
        resolvedInternalTools:
          executedActions.length > 0 ? executedActions : undefined,
      },
      providerUsed,
      executedActions,
    };
  }

  // Fallback if max iterations reached
  const isPt =
    executionContext.language &&
    executionContext.language.toLowerCase().startsWith("pt");
  const fallbackMsg = isPt
    ? "Pensei por muitas iterações e não consegui chegar numa conclusão final. Pode me dar mais detalhes?"
    : "I thought for many iterations but couldn't reach a final conclusion. Could you provide more details?";

  return {
    data: {
      type: "text",
      text: fallbackMsg,
      content: fallbackMsg,
      resolvedInternalTools:
        executedActions.length > 0 ? executedActions : undefined,
    },
    providerUsed,
    executedActions,
  };
}

module.exports = {
  executeAgenticTask,
};
