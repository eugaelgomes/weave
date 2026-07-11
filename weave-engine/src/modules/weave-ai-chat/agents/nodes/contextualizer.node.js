/**
 * @module weave-engine/modules/weave-ai-chat/agents/nodes/contextualizer.node
 */
const { callAIProvider } = require("../../../../services/llm/llm-provider.client");
const { logger } = require("../../../../services/logger");
const { getInternalToolDefinitions } = require("../../../../tools/tool-dispatcher");

const CONTEXTUALIZER_SYSTEM_PROMPT = `
You are the Workspace & User Contextualizer Agent for Weave. 
You specialize in answering questions about the organization, user profile, workspace structure, and team members.
Use your internal tools to gather data and answer the user's questions clearly and accurately.
`;

async function contextualizerNode(state) {
  logger.info("Contextualizer node running");
  
  if (state.executionContext && state.executionContext.onChunk) {
    state.executionContext.onChunk({
      type: "action_state",
      name: "contextualizer",
      status: "running",
    });
  }

  // Provide access to ALL tools
  const allTools = getInternalToolDefinitions(state.executionContext);

  try {
    const { data, provider } = await callAIProvider({
      model: state.jobContext?.model || null,
      prompt: "",
      systemMessage: (state.jobContext?.systemMessage || "") + "\n\n" + CONTEXTUALIZER_SYSTEM_PROMPT,
      options: { 
        allowEdit: false,
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
          name: "contextualizer",
          status: "completed",
          success: true,
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
