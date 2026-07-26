/**
 * @module weave-engine/modules/weave-engine/proactive-agents/nodes/writer.node
 */
import { callAIProvider } from "@/llm-conectors/llm-provider.client";
import { getWriterPrompt } from "../prompts/writer.prompt";
import { logger } from "@/config/logger";
import { ProactiveState } from "../proactive.state";

export async function writerNode(state: ProactiveState) {
  logger.info("Writer node running");

  const prompt = getWriterPrompt(state);

  try {
    const { data, provider } = await callAIProvider({
      model: (state.jobContext?.model as string) || null,
      options: {
        allowEdit: false,
        messages: ((state.jobContext?.conversationHistory || (state as any).conversationHistory || []) as any[]),
      },
      prompt,
      systemMessage:
        (state.jobContext?.systemMessage as string) ||
        (state as any).systemMessage ||
        "You are the Writer. Format outputs strictly in Markdown.",
    });

    const d = data as any;
    const resultText = d?.text || d?.content || data;

    return {
      finalOutput:
        typeof resultText === "string"
          ? resultText
          : JSON.stringify(resultText),
      providerUsed: provider || state.providerUsed,
    };
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : String(error);
    logger.error("Writer node error", { error: errMessage });
    return { errors: [errMessage] };
  }
}

