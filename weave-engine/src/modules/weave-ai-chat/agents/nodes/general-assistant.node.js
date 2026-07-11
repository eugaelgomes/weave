/**
 * @module weave-engine/modules/weave-ai-chat/agents/nodes/general-assistant.node
 */
const { callAIProvider } = require("../../../../services/llm/llm-provider.client");
const { logger } = require("../../../../services/logger");
const { getInternalToolDefinitions } = require("../../../../tools/tool-dispatcher");

const GENERAL_ASSISTANT_SYSTEM_PROMPT = `
You are the General Assistant Agent for Weave. 
You handle casual conversation, generic web searches, or tasks that don't fit into the specialized project management buckets.
Answer the user's questions clearly, accurately, and politely.
`;

async function generalAssistantNode(state) {
  logger.info("General Assistant node running");
  
  if (state.executionContext && state.executionContext.onChunk) {
    state.executionContext.onChunk({
      type: "action_state",
      name: "general_assistant",
      status: "running",
    });
  }

  // Provide access to ALL tools
  const allTools = getInternalToolDefinitions(state.executionContext);

  try {
    const { data, provider } = await callAIProvider({
      model: state.jobContext?.model || null,
      prompt: "",
      systemMessage: (state.jobContext?.systemMessage || "") + "\n\n" + GENERAL_ASSISTANT_SYSTEM_PROMPT,
      options: { 
        allowEdit: state.options?.allowEdit ?? false,
        messages: state.messages || [],
        functions: allTools
      },
    });

    const stateUpdate = {
      providerUsed: provider || state.providerUsed,
    };

    if (data.type === "function_call" && data.toolCalls) {
      const toolCallsArray = data.toolCalls.map((tc, idx) => {
        return {
          id: tc.id || `call_${Math.random().toString(36).substring(2, 11)}_${idx}`,
          function: {
            name: tc.name,
            arguments: JSON.stringify(tc.arguments),
          },
          rawArgs: tc.arguments,
          extra_content: tc.extra_content,
        };
      });

      const assistantMessage = {
        role: "assistant",
        content: null,
        rawParts: data.rawParts,
        tool_calls: toolCallsArray.map((t) => ({
          id: t.id,
          function: t.function,
          ...(t.extra_content ? { extra_content: t.extra_content } : {}),
        })),
      };

      stateUpdate.messages = [...(state.messages || []), assistantMessage];
      stateUpdate.pendingToolCalls = toolCallsArray;
      
    } else {
      const finalMsg = data.text || data.content || data;
      const assistantMessage = {
        role: "assistant",
        content: finalMsg,
      };
      stateUpdate.messages = [...(state.messages || []), assistantMessage];
      stateUpdate.finalResponse = finalMsg;
      
      if (state.executionContext && state.executionContext.onChunk) {
        state.executionContext.onChunk({
          type: "action_state",
          name: "general_assistant",
          status: "completed",
          success: true,
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
