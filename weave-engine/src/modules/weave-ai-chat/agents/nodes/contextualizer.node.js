/**
 * @module weave-engine/modules/weave-ai-chat/agents/nodes/contextualizer.node
 */
const {
  callAIProvider,
} = require("../../../../services/llm/llm-provider.client");
const { logger } = require("../../../../services/logger");
const {
  getInternalToolDefinitions,
} = require("../../../../tools/tool-dispatcher");

const CONTEXTUALIZER_SYSTEM_PROMPT = `
You are the Workspace & User Contextualizer Agent for Weave. 
You specialize in answering questions about the organization, user profile, workspace structure, and team members.
Use your internal tools to gather data and answer the user's questions clearly and accurately.
`;

async function contextualizerNode(state) {
  logger.info("Contextualizer node running");

  if (state.executionContext && state.executionContext.onChunk) {
    state.executionContext.onChunk({
      name: "contextualizer",
      status: "running",
      type: "action_state",
    });
  }

  // Provide access to ALL tools
  const allTools = getInternalToolDefinitions(state.executionContext);

  try {
    const { data, provider } = await callAIProvider({
      model: state.jobContext?.model || null,
      options: {
        allowEdit: false,
        functions: allTools,
        messages: state.messages || [],
      },
      prompt: "",
      systemMessage:
        (state.jobContext?.systemMessage || "") +
        "\n\n" +
        CONTEXTUALIZER_SYSTEM_PROMPT,
    });

    const stateUpdate = {
      providerUsed: provider || state.providerUsed,
    };

    if (data.type === "function_call" && data.toolCalls) {
      const toolCallsArray = data.toolCalls.map((tc, idx) => {
        return {
          extra_content: tc.extra_content,
          function: {
            arguments: JSON.stringify(tc.arguments),
            name: tc.name,
          },
          id:
            tc.id ||
            `call_${Math.random().toString(36).substring(2, 11)}_${idx}`,
          rawArgs: tc.arguments,
        };
      });

      const assistantMessage = {
        content: null,
        rawParts: data.rawParts,
        role: "assistant",
        tool_calls: toolCallsArray.map((t) => ({
          function: t.function,
          id: t.id,
          ...(t.extra_content ? { extra_content: t.extra_content } : {}),
        })),
      };

      stateUpdate.messages = [...(state.messages || []), assistantMessage];
      stateUpdate.pendingToolCalls = toolCallsArray;
    } else {
      const finalMsg = data.text || data.content || data;
      const assistantMessage = {
        content: finalMsg,
        role: "assistant",
      };
      stateUpdate.messages = [...(state.messages || []), assistantMessage];
      stateUpdate.finalResponse = finalMsg;

      if (state.executionContext && state.executionContext.onChunk) {
        state.executionContext.onChunk({
          name: "contextualizer",
          status: "completed",
          success: true,
          type: "action_state",
        });
      }
    }

    return stateUpdate;
  } catch (error) {
    logger.error("Contextualizer node error", { error: error.message });
    return { errors: [error.message] };
  }
}

module.exports = { contextualizerNode };
