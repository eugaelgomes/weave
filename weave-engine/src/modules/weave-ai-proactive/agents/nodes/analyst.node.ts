/**
 * @module weave-engine/modules/weave-engine/proactive-agents/nodes/analyst.node
 */
import { callAIProvider } from "@/llm-conectors/llm-provider.client";
import { getAnalystPrompt } from "../prompts/analyst.prompt";
import { logger } from "@/config/logger";
import { ProactiveState } from "../proactive.state";

export async function analystNode(state: ProactiveState) {
  logger.info("Analyst node running");

  const prompt = getAnalystPrompt(state);

  try {
    const { data, provider } = await callAIProvider({
      model: state.jobContext.model || null,
      options: { allowEdit: false },
      prompt,
      systemMessage: "You are the Analyst. You do deep reasoning.",
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

