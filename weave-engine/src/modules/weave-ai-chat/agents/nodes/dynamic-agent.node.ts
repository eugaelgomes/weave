/**
 * @module weave-engine/modules/weave-ai-chat/agents/nodes/dynamic-agent.node
 */
import { callAIProvider } from "../../../../llm-conectors/llm-provider.client";
import { logger } from "../../../../config/logger";
import { getInternalToolDefinitions } from "../../../../llm-conectors/mcp-tools";

function extractAgentInstructions(agent: Record<string, unknown> | null | undefined) {
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

export async function dynamicAgentNode(state: Record<string, unknown>) {
  const activeAgentId = state.activeAgent;
  const agent = (state.availableAgents || []).find(
    (a: Record<string, unknown>) => a.id === activeAgentId
  );

  if (!agent) {
    logger.error(
      `Dynamic Agent node error: Agent ${activeAgentId} not found in availableAgents`
    );
    return { errors: [`Agent ${activeAgentId} not found`] };
  }

  logger.info(
    `Dynamic Agent node running for agent ${agent.name || activeAgentId}`
  );

  if (state.executionContext && state.executionContext.onChunk) {
    state.executionContext.onChunk({
      name: agent.name || activeAgentId,
      status: "running",
      type: "action_state",
    });
  }

  const allTools = await getInternalToolDefinitions(state.executionContext);
  const agentInstructions = extractAgentInstructions(agent);

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
        `\n\n[Agent]: ${agentInstructions}`,
    });

    const stateUpdate: Record<string, unknown> = {
      providerUsed: provider || state.providerUsed,
    };

    if (data.type === "function_call" && data.toolCalls) {
      const toolCallsArray = data.toolCalls.map((tc: Record<string, unknown>, idx: number) => {
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
        tool_calls: toolCallsArray.map((t: Record<string, unknown>) => ({
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
          name: agent.name || activeAgentId,
          status: "completed",
          success: true,
          type: "action_state",
        });
      }
    }

    return stateUpdate;
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : String(error);
    logger.error("Dynamic Agent node error", { error: errMessage });
    return { errors: [errMessage] };
  }
}
