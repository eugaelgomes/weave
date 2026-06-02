const { callAIProvider } = require("../../providers/llm-provider.client");

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
};
