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
      model: (state.jobContext?.model as string) || null,
      options: { allowEdit: false },
      prompt,
      systemMessage: "You are the Analyst. You do deep reasoning.",
    });

    const d = data as any;
    const resultText = d?.text || d?.content || data;

    return {
      analysisResult:
        typeof resultText === "string"
          ? resultText
          : JSON.stringify(resultText),
      providerUsed: provider || state.providerUsed,
    };
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : String(error);
    logger.error("Analyst node error", { error: errMessage });
    return { errors: [errMessage] };
  }
}

