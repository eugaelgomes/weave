/**
 * @module weave-engine/modules/weave-engine/proactive-agents/nodes/researcher.node
 */
import { executeAgenticTask } from "../../../weave-ai-chat/engines/reasoning.engine";
import { getResearcherPrompt } from "../prompts/researcher.prompt";
import { logger } from "@/config/logger";
import { ProactiveState } from "../proactive.state";

export async function researcherNode(state: ProactiveState) {
  logger.info("Researcher node running");

  const systemMessage = getResearcherPrompt(state);

  const executionContext = {
    language: state.jobContext.language || "en-US",
    onChunk: state.jobContext.onChunk,
    organizationId: state.jobContext.organizationId || null,
    userId: state.jobContext.triggeredBy || "system",
  };

  try {
    const { data, providerUsed, executedActions } = await executeAgenticTask({
      allowEdit: false, // Force readonly for research
      allowWebSearch: state.jobContext.allowWebSearch,
      conversationHistory: state.conversationHistory || [],
      executionContext,
      files: state.jobContext.files,
      functions: state.jobContext.functions,
      message: state.message,
      model: state.jobContext.model,
      systemMessage,
    });

    const collectedData = [...(state.collectedData || [])];

    if (executedActions && executedActions.length > 0) {
      executedActions.forEach((action) => {
        collectedData.push({
          query: action.args,
          result: action.result,
          source: action.name,
        });
      });
    }

    // Also store any text conclusion the researcher arrived at
    const text = data?.text || data?.content;
    if (text) {
      collectedData.push({ result: text, source: "Researcher Conclusion" });
    }

    return {
      collectedData,
      executedActions: [
        ...(state.executedActions || []),
        ...(executedActions || []),
      ],
      providerUsed: providerUsed || state.providerUsed,
    };
  } catch (error) {
    logger.error("Researcher node error", { error: error.message });
    return { errors: [error.message] };
  }
}

