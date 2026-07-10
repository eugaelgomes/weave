/**
 * @module weave-engine/modules/weave-engine/proactive-agents/nodes/researcher.node
 */
const {
  executeAgenticTask,
} = require("../../../weave-ai-chat/reasoning.engine");
const { getResearcherPrompt } = require("../prompts/researcher.prompt");
const { logger } = require("../../../../services/logger");

async function researcherNode(state) {
  logger.info("Researcher node running");

  const systemMessage = getResearcherPrompt(state);

  const executionContext = {
    userId: state.jobContext.triggeredBy || "system",
    organizationId: state.jobContext.organizationId || null,
    language: state.jobContext.language || "en-US",
    onChunk: state.jobContext.onChunk,
  };

  try {
    const { data, providerUsed, executedActions } = await executeAgenticTask({
      allowEdit: false, // Force readonly for research
      allowWebSearch: state.jobContext.allowWebSearch,
      files: state.jobContext.files,
      functions: state.jobContext.functions,
      message: state.message,
      model: state.jobContext.model,
      systemMessage,
      conversationHistory: state.conversationHistory || [],
      executionContext,
    });

    const collectedData = [...(state.collectedData || [])];

    if (executedActions && executedActions.length > 0) {
      executedActions.forEach(action => {
         collectedData.push({
           source: action.name,
           query: action.args,
           result: action.result,
         });
      });
    }

    // Also store any text conclusion the researcher arrived at
    const text = data?.text || data?.content;
    if (text) {
      collectedData.push({ source: "Researcher Conclusion", result: text });
    }

    return {
      collectedData,
      executedActions: [...(state.executedActions || []), ...(executedActions || [])],
      providerUsed: providerUsed || state.providerUsed,
    };
  } catch (error) {
    logger.error("Researcher node error", { error: error.message });
    return { errors: [error.message] };
  }
}

module.exports = { researcherNode };
