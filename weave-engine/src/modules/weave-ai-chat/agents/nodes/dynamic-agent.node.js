/**
 * @module weave-engine/modules/weave-ai-chat/agents/nodes/dynamic-agent.node
 */
const { callAIProvider } = require("../../../../services/llm/llm-provider.client");
const { logger } = require("../../../../services/logger");
const { getInternalToolDefinitions } = require("../../../../tools/tool-dispatcher");

function extractAgentInstructions(agent) {
  if (!agent || typeof agent !== "object") {
    return "";
  }

  const personality = agent.personality || {};
  const persona = personality.persona || {};
  const metadata = personality.metadata || {};
  const behavior = personality.behavior || {};
  const systemInstructions = behavior.system_instructions || {};
  const contextText = systemInstructions.context || "";
  const rules = Array.isArray(systemInstructions.rules)
    ? systemInstructions.rules.filter(Boolean).join(" | ")
    : "";

  const lines = [
    `agentId: ${agent.id || "unknown"}`,
    metadata.name ? `name: ${metadata.name}` : "",
    persona.role ? `role: ${persona.role}` : "",
    persona.tone ? `tone: ${persona.tone}` : "",
    persona.language ? `language: ${persona.language}` : "",
    contextText ? `instructions: ${contextText}` : "",
    rules ? `rules: ${rules}` : "",
  ].filter(Boolean);

  return lines.join("\n");
}

async function dynamicAgentNode(state) {
  const activeAgentId = state.activeAgent;
  const agent = (state.availableAgents || []).find(a => a.id === activeAgentId);

  if (!agent) {
    logger.error(`Dynamic Agent node error: Agent ${activeAgentId} not found in availableAgents`);
    return { errors: [`Agent ${activeAgentId} not found`] };
  }

  logger.info(`Dynamic Agent node running for agent ${agent.name || activeAgentId}`);
  
  if (state.executionContext && state.executionContext.onChunk) {
    state.executionContext.onChunk({
      type: "action_state",
      name: agent.name || activeAgentId,
      status: "running",
    });
  }

  const allTools = getInternalToolDefinitions(state.executionContext);
  const agentInstructions = extractAgentInstructions(agent);

  try {
    const { data, provider } = await callAIProvider({
      model: state.jobContext?.model || null,
      prompt: "",
      systemMessage: (state.jobContext?.systemMessage || "") + `\n\n[Agent]: ${agentInstructions}`,
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
          name: agent.name || activeAgentId,
          status: "completed",
          success: true,
        });
      }
    }

    return stateUpdate;
  } catch (error) {
    logger.error("Dynamic Agent node error", { error: error.message });
    return { errors: [error.message] };
  }
}

module.exports = { dynamicAgentNode };
