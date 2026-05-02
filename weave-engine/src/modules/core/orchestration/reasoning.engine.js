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

const MAX_REACT_ITERATIONS = 5;

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
}) {
  let iterations = 0;

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

  let currentPrompt = message;
  let providerUsed = null;

  while (iterations < MAX_REACT_ITERATIONS) {
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

      // Add assistant tool_call message to history
      currentOptions.messages.push({
        role: "assistant",
        content: null,
        tool_calls: [
          {
            function: {
              name: fnName,
              arguments: JSON.stringify(fnArgs),
            },
          },
        ],
      });

      if (isInternalTool(fnName)) {
        // Execute internally and loop
        const result = await executeInternalTool(fnName, fnArgs);

        currentOptions.messages.push({
          role: "tool",
          name: fnName,
          content: typeof result === "string" ? result : JSON.stringify(result),
        });

        continue;
      } else {
        // External tool: Return to API to be executed
        return {
          data,
          providerUsed,
        };
      }
    }

    // Return text response
    return {
      data,
      providerUsed,
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
  };
}

module.exports = {
  executeAgenticTask,
  generateSmartResponse,
  processThinkingPhase,
};
