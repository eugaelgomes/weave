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
      model: state.jobContext.model || null,
      options: {
        allowEdit: false,
        messages: state.conversationHistory || [],
      },
      prompt,
      systemMessage:
        state.systemMessage ||
        "You are the Writer. Format outputs strictly in Markdown.",
    });

    const resultText = data.text || data.content || data;

    return {
      finalOutput:
        typeof resultText === "string"
          ? resultText
          : JSON.stringify(resultText),
      providerUsed: provider || state.providerUsed,
    };
  } catch (error) {
    logger.error("Writer node error", { error: error.message });
    return { errors: [error.message] };
  }
}

