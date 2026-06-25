/**
 * @module weave-engine/modules/weave-engine/proactive-agents/nodes/researcher.node
 */
const {
  callAIProvider,
} = require("../../../../ai-core/providers/llm-provider.client");
const { getResearcherPrompt } = require("../prompts/researcher.prompt");
const {
  getInternalToolDefinitions,
  executeInternalTool,
} = require("../../../../tools/tool-dispatcher");
const { logger } = require("../../../../infrastructure/logger");

async function researcherNode(state) {
  logger.info("Researcher node running");

  const prompt = getResearcherPrompt(state);

  // Fake execution context for tools
  const executionContext = {
    userId: state.jobContext.triggeredBy || "system",
    organizationId: state.jobContext.organizationId || null,
  };

  const availableTools = getInternalToolDefinitions(true, executionContext);

  // Only allow readonly tools for research to prevent accidental edits in background
  const readOnlyTools = availableTools.filter(
    (t) =>
      !t.name.includes("create") &&
      !t.name.includes("update") &&
      !t.name.includes("delete")
  );

  try {
    const { data, provider } = await callAIProvider({
      model: state.jobContext.model || null,
      prompt,
      systemMessage: "You are the Researcher. Use tools to gather facts.",
      options: {
        allowEdit: true,
        functions: readOnlyTools,
      },
    });

    const collectedData = [...(state.collectedData || [])];

    // Simulate ReAct tool execution
    if (data.type === "function_call" && data.toolCalls) {
      for (const tc of data.toolCalls) {
        try {
          logger.info("Researcher calling tool", { name: tc.name });
          const result = await executeInternalTool(
            tc.name,
            tc.arguments,
            executionContext
          );
          collectedData.push({
            source: tc.name,
            query: tc.arguments,
            result,
          });
        } catch (e) {
          logger.warn("Researcher tool call failed", {
            name: tc.name,
            error: e.message,
          });
          collectedData.push({ source: tc.name, error: e.message });
        }
      }
    } else {
      // Just raw text returned
      const text = data.text || data.content || data;
      collectedData.push({ source: "LLM Knowledge", result: text });
    }

    return {
      collectedData,
      providerUsed: provider || state.providerUsed,
    };
  } catch (error) {
    logger.error("Researcher node error", { error: error.message });
    return { errors: [error.message] };
  }
}

module.exports = { researcherNode };
