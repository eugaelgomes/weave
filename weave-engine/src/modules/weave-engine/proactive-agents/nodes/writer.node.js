/**
 * @module weave-engine/modules/weave-engine/proactive-agents/nodes/writer.node
 */
const { callAIProvider } = require("../../../core/providers/llm-provider.client");
const { getWriterPrompt } = require("../prompts/writer.prompt");
const { logger } = require("../../../../logger");

async function writerNode(state) {
  logger.info("Writer node running");

  const prompt = getWriterPrompt(state);

  try {
    const { data, provider } = await callAIProvider({
      model: state.jobContext.model || null,
      prompt,
      systemMessage: "You are the Writer. Format outputs strictly in Markdown.",
      options: { allowEdit: false },
    });

    const resultText = data.text || data.content || data;

    return {
      finalOutput: typeof resultText === "string" ? resultText : JSON.stringify(resultText),
      providerUsed: provider || state.providerUsed
    };
  } catch (error) {
    logger.error("Writer node error", { error: error.message });
    return { errors: [error.message] };
  }
}

module.exports = { writerNode };
