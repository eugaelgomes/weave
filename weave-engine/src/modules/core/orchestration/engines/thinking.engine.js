/**
 * @module weave-engine/modules/core/orchestration/engines/thinking.engine
 * @description Evaluates user prompts to optionally generate long-form content
 * ahead of the main ReAct loop execution.
 *
 * Dependencies:
 * - `../../prompts/agent-prompts`: For system prompt construction.
 * - `../../providers/llm-provider.client`: To execute the thinking generation.
 */
const { buildEngineSystemMessage } = require("../../prompts/agent-prompts");
const { callAIProvider } = require("../../providers/llm-provider.client");

const CONTENT_GENERATION_KEYWORDS =
  /\b(research|edit|rewrite|rebuild|write|create content|detail|explain|summarize|elaborate|rich|history|about)\b/i;

/**
 * Evaluates the user's message against generation keywords. If matched, triggers a
 * pure content-generation LLM pass before allowing tools to run, useful for
 * researching or drafting large texts.
 *
 * @param {object} params - Execution parameters.
 * @param {boolean} params.allowEdit - Must be true to trigger generation.
 * @param {object} params.enrichedContext - Workspace contextual data.
 * @param {string} params.message - The user's request.
 * @param {string} params.model - The requested LLM model.
 * @returns {Promise<string|null>} The generated text, or null if thinking phase is skipped.
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
    buildEngineSystemMessage(enrichedContext) +
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

module.exports = {
  processThinkingPhase,
};
