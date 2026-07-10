/**
 * @module weave-engine/modules/weave-engine/proactive-agents/nodes/analyst.node
 */
const {
  callAIProvider,
} = require("../../../../services/llm/llm-provider.client");
const { getAnalystPrompt } = require("../prompts/analyst.prompt");
const { logger } = require("../../../../services/logger");

async function analystNode(state) {
  logger.info("Analyst node running");

  const prompt = getAnalystPrompt(state);

  try {
    const { data, provider } = await callAIProvider({
      model: state.jobContext.model || null,
      prompt,
      systemMessage: "You are the Analyst. You do deep reasoning.",
      options: { allowEdit: false },
    });

    const resultText = data.text || data.content || data;

    return {
      analysisResult:
        typeof resultText === "string"
          ? resultText
          : JSON.stringify(resultText),
      providerUsed: provider || state.providerUsed,
    };
  } catch (error) {
    logger.error("Analyst node error", { error: error.message });
    return { errors: [error.message] };
  }
}

module.exports = { analystNode };
