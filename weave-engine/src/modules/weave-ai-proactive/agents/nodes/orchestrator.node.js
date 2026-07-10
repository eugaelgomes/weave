/**
 * @module weave-engine/modules/weave-engine/proactive-agents/nodes/orchestrator.node
 */
const {
  callAIProvider,
} = require("../../../../services/llm/llm-provider.client");
const { getOrchestratorPrompt } = require("../prompts/orchestrator.prompt");
const { logger } = require("../../../../services/logger");

async function orchestratorNode(state) {
  logger.info("Orchestrator node running", { iterations: state.iterations });

  const prompt = getOrchestratorPrompt(state);

  try {
    const { data, provider } = await callAIProvider({
      model: state.jobContext.model || null,
      prompt,
      systemMessage:
        "You are a JSON-only decision engine. Always return valid JSON.",
      options: { allowEdit: false },
    });

    let resultText = data.text || data.content || data;
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
  } catch (error) {
    logger.error("Orchestrator node error", { error: error.message });
    // Default fallback to writer if it fails to decide
    return { nextNode: "writer", errors: [error.message] };
  }
}

module.exports = { orchestratorNode };
