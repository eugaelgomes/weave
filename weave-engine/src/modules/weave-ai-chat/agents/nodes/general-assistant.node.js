/**
 * @module weave-engine/modules/weave-ai-chat/agents/nodes/general-assistant.node
 */
const {
  callAIProvider,
} = require("../../../../services/llm/llm-provider.client");
const { logger } = require("../../../../services/logger");
const {
  getInternalToolDefinitions,
} = require("../../../../tools/tool-dispatcher");

const GENERAL_ASSISTANT_SYSTEM_PROMPT = `
You are the General Assistant Agent for Weave. 
You handle casual conversation, generic web searches, or tasks that don't fit into the specialized project management buckets.
Answer the user's questions clearly, accurately, and politely.
`;

async function generalAssistantNode(state) {
  logger.info("General Assistant node running");

  if (state.executionContext && state.executionContext.onChunk) {
    state.executionContext.onChunk({
      name: "general_assistant",
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
        allowEdit: state.options?.allowEdit ?? false,
        functions: allTools,
        messages: state.messages || [],
      },
      prompt: "",
      systemMessage:
        (state.jobContext?.systemMessage || "") +
        "\n\n" +
        GENERAL_ASSISTANT_SYSTEM_PROMPT,
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
          name: "general_assistant",
          status: "completed",
          success: true,
          type: "action_state",
        });
      }
    }

    return stateUpdate;
  } catch (error) {
    logger.error("General Assistant node error", { error: error.message });
    return { errors: [error.message] };
  }
}

module.exports = { generalAssistantNode };
