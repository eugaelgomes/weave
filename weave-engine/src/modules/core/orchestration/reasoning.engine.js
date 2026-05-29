const { buildSystemMessage } = require("../prompts/agent-prompts");
const { callAIProvider } = require("../providers/llm-provider.client");

const CONTENT_GENERATION_KEYWORDS =
  /\b(research|edit|rewrite|rebuild|write|create content|detail|explain|summarize|elaborate|rich|history|about)\b/i;

/**
 * @param {object} params
 * @param {string} params.message
 * @param {object} params.enrichedContext
 * @param {string} params.model
 * @param {boolean} params.allowEdit
 * @returns {Promise<string|null>}
 */
async function processThinkingPhase({
  allowEdit,
  enrichedContext,
  message,
  model,
}) {
  if (!allowEdit || !CONTENT_GENERATION_KEYWORDS.test(message)) {
    return null;
  }

  const generationSystemMessage =
    buildSystemMessage(enrichedContext) +
    "\n\nYOU ARE AN EXPERT RESEARCHER AND WRITER. Your task is ONLY to generate the content requested by the user with maximum quality and detail. Do NOT try to edit notes now. Only provide complete, well-structured content in Markdown.";

  try {
    const { data } = await callAIProvider({
      options: {
        allowEdit: false,
      },
      model,
      prompt: message,
      systemMessage: generationSystemMessage,
    });
    return data.text || data.content || null;
  } catch {
    return null;
  }
}

/**
 * @param {object} params
 * @param {string} params.originalMessage
 * @param {string|object} params.functionName
 * @param {object} params.executionResult
 * @param {string} params.model
 * @param {string} params.systemMessage
 * @returns {Promise<string>}
 */
async function generateSmartResponse({
  executionResult,
  functionName,
  model,
  originalMessage,
  systemMessage,
}) {
  const normalizedFunctionName =
    typeof functionName === "string" ? functionName : functionName?.name;

  const summaryPrompt = `
Context: The user requested "${originalMessage}".
Action performed: The function "${normalizedFunctionName}" ran successfully.
Technical result (JSON): ${JSON.stringify(executionResult)}

Instructions:
1. Analyze the technical result.
2. Confirm the action to the user in a natural, friendly, and helpful way.
3. If it was a search, summarize the key findings.
4. If it was a creation/edit, confirm the main details.
5. Do NOT show raw JSON; interpret it.
6. Keep it concise.
`;

  try {
    const { data } = await callAIProvider({
      options: {
        allowEdit: false,
      },
      model,
      prompt: summaryPrompt,
      systemMessage,
    });
    return data.text || data.content || data;
  } catch {
    return "**Action executed successfully.**\n\n(Technical details hidden for brevity)";
  }
}

const {
  isInternalTool,
  executeInternalTool,
  getInternalToolDefinitions,
} = require("../tools/tool-dispatcher");

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
      const error = new Error("Engine chat task budget exceeded");
      error.code = "ENGINE_CHAT_BUDGET_EXCEEDED";
      throw error;
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

    if (data.type === "function_call" && data.functionCall) {
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

        currentOptions.messages.push({
          role: "tool",
          name: fnName,
          tool_call_id: toolCallId,
          content: typeof result === "string" ? result : JSON.stringify(result),
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
  return {
    data: {
      type: "text",
      text: "Eu pensei por muito tempo, mas não consegui chegar a uma conclusão final.",
      content:
        "Eu pensei por muito tempo, mas não consegui chegar a uma conclusão final.",
    },
    providerUsed,
    executedActions,
  };
}

module.exports = {
  executeAgenticTask,
  generateSmartResponse,
  processThinkingPhase,
};
