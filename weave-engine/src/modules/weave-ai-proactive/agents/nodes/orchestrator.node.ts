/**
 * @module weave-engine/modules/weave-engine/proactive-agents/nodes/orchestrator.node
 */
import { callAIProvider } from "@/llm-conectors/llm-provider.client";
import { getOrchestratorPrompt } from "../prompts/orchestrator.prompt";
import { logger } from "@/config/logger";
import { ProactiveState } from "../proactive.state";

export async function orchestratorNode(state: ProactiveState) {
  logger.info("Orchestrator node running", { iterations: state.iterations });

  const prompt = getOrchestratorPrompt(state);

  try {
    const { data, provider } = await callAIProvider({
      model: (state.jobContext?.model as string) || null,
      options: { allowEdit: false },
      prompt,
      systemMessage:
        "You are a JSON-only decision engine. Always return valid JSON.",
    });

    const d = data as any;
    let resultText = d?.text || d?.content || data;
    if (typeof resultText !== "string") {
      resultText = JSON.stringify(resultText);
    }

    // Extract JSON block
    const jsonMatch = resultText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Orchestrator failed to return valid JSON");
    }

    const decision = JSON.parse(jsonMatch[0]);
    logger.info("Orchestrator decision", {
      nextNode: decision.nextNode,
      reasoning: decision.reasoning,
    });

    return {
      nextNode: decision.nextNode,
      providerUsed: provider || state.providerUsed,
    };
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : String(error);
    logger.error("Orchestrator node error", { error: errMessage });
    // Default fallback to writer if it fails to decide
    return { errors: [errMessage], nextNode: "writer" };
  }
}

