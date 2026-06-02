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
 * Autonomous ReAct Loop
 * @param {object} params
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
  };

  // Add the initial user message to history immediately so it persists across ReAct loops
  currentOptions.messages.push({
    role: "user",
    content: message,
  });

  let currentPrompt = ""; // The message is now in messages history, no need for prompt
  let providerUsed = null;

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
        // Execute all internal tools in parallel
        const results = await Promise.all(
          internalCalls.map(async (tc) => {
            const fnName = tc.function.name;
            const fnArgs = tc.rawArgs;
            try {
              const result = await executeInternalTool(
                fnName,
                fnArgs,
                executionContext
              );
              return { tc, result, error: null };
            } catch (err) {
              return {
                tc,
                result: null,
                error: err.message || "Tool execution failed",
              };
            }
          })
        );

        for (const { tc, result, error } of results) {
          const fnName = tc.function.name;
          const fnArgs = tc.rawArgs;
          const output = error ? { error } : result;

          executedActions.push({ name: fnName, args: fnArgs, result: output });

          let contentStr =
            typeof output === "string" ? output : JSON.stringify(output);
          if (contentStr.length > 12000) {
            contentStr =
              contentStr.slice(0, 12000) +
              "\n\n...[TRUNCATED BY ENGINE DUE TO SIZE LIMITS]";
          }

          currentOptions.messages.push({
            role: "tool",
            name: fnName,
            tool_call_id: tc.id,
            content: contentStr,
          });
        }

        continue;
      } else {
        // If there is ANY external tool, we return to API to execute them.
        return {
          data,
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
        // Execute internally and loop
        const result = await executeInternalTool(
          fnName,
          fnArgs,
          executionContext
        );

        executedActions.push({ name: fnName, args: fnArgs, result });

        let contentStr =
          typeof result === "string" ? result : JSON.stringify(result);
        if (contentStr.length > 12000) {
          contentStr =
            contentStr.slice(0, 12000) +
            "\n\n...[TRUNCATED BY ENGINE DUE TO SIZE LIMITS]";
        }

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
          providerUsed,
          executedActions,
        };
      }
    }

    // Return text response
    return {
      data,
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
    },
    providerUsed,
    executedActions,
  };
}

module.exports = {
  executeAgenticTask,
};
