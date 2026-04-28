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

module.exports = {
  generateSmartResponse,
  processThinkingPhase,
};
