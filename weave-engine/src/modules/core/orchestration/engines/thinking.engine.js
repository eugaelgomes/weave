const { buildSystemMessage } = require("../../prompts/agent-prompts");
const { callAIProvider } = require("../../providers/llm-provider.client");

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

module.exports = {
  processThinkingPhase,
};
