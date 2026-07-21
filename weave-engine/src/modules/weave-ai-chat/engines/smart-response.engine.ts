/**
 * @module weave-engine/modules/weave-ai-chat/engines/smart-response.engine
 * @description Generates natural language summaries of technical tool execution results.
 *
 * Dependencies:
 * - `../../providers/llm-provider.client`: To generate the summary.
 */
import { callAIProvider } from "@/llm-conectors/llm-provider.client";

/**
 * Takes the raw JSON result of a tool execution and translates it into a concise,
 * user-friendly confirmation message using a fast LLM pass.
 *
 * @param {object} params - Execution parameters.
 * @param {string} params.originalMessage - The user's original request.
 * @param {string|object} params.functionName - The name of the tool that was executed.
 * @param {object} params.executionResult - The raw JSON output of the tool.
 * @param {string} params.model - The requested LLM model.
 * @param {string} params.systemMessage - The base system context.
 * @returns {Promise<string>} The generated natural language summary.
 */
export async function generateSmartResponse({
  executionResult,
  functionName,
  model,
  originalMessage,
  systemMessage,
}: {
  executionResult: Record<string, unknown>;
  functionName: unknown;
  model: string;
  originalMessage: string;
  systemMessage: string;
}): Promise<string> {
  const normalizedFunctionName =
    typeof functionName === "string" ? functionName : (functionName as Record<string, unknown>)?.name;

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
      model,
      options: {
        allowEdit: false,
      },
      prompt: summaryPrompt,
      systemMessage,
    });
    return data.text || data.content || data;
  } catch {
    return "**Action executed successfully.**\n\n(Technical details hidden for brevity)";
  }
}
