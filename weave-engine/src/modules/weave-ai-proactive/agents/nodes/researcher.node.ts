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
    language: (state.jobContext?.language as string) || "en-US",
    onChunk: state.jobContext?.onChunk as any,
    organizationId: (state.jobContext?.organizationId as string) || null,
    userId: (state.jobContext?.triggeredBy as string) || "system",
  };

  try {
    const { data, providerUsed, executedActions } = await executeAgenticTask({
      _allowWebSearch: Boolean(state.jobContext?.allowWebSearch),
      allowEdit: false, // Force readonly for research
      conversationHistory: ((state.jobContext?.conversationHistory || (state as any).conversationHistory || []) as any[]),
      executionContext,
      files: (state.jobContext?.files as any[]) || [],
      functions: (state.jobContext?.functions as any[]) || [],
      message: (state.jobContext?.message as string) || (state as any).message || "",
      model: (state.jobContext?.model as string) || "",
      systemMessage,
    });

    const collectedData = [...(state.collectedData || [])];

    const actions = (executedActions as any[]) || [];
    if (actions.length > 0) {
      actions.forEach((action: any) => {
        collectedData.push({
          query: action.args || action.arguments,
          result: action.result,
          source: action.name,
        });
      });
    }

    // Also store any text conclusion the researcher arrived at
    const d = data as any;
    const text = d?.text || d?.content;
    if (text) {
      collectedData.push({ result: text, source: "Researcher Conclusion" });
    }

    return {
      collectedData,
      executedActions: [
        ...((state as any).executedActions || []),
        ...actions,
      ],
      providerUsed: providerUsed || state.providerUsed,
    };
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : String(error);
    logger.error("Researcher node error", { error: errMessage });
    return { errors: [errMessage] };
  }
}

