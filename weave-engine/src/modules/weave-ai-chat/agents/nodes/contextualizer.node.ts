/**
 * @module weave-engine/modules/weave-ai-chat/agents/nodes/contextualizer.node
 */
import { callAIProvider } from "../../../../llm-conectors/llm-provider.client";
import { logger } from "../../../../config/logger";
import { getInternalToolDefinitions } from "../../../../llm-conectors/mcp-tools";

const CONTEXTUALIZER_SYSTEM_PROMPT = `
You are the Workspace & User Contextualizer Agent for Weave. 
You specialize in answering questions about the organization, user profile, workspace structure, and team members.
Use your internal tools to gather data and answer the user's questions clearly and accurately.
`;

export async function contextualizerNode(state: Record<string, unknown>) {
  logger.info("Contextualizer node running");
  const s = state as any;

  if (s.executionContext && s.executionContext.onChunk) {
    s.executionContext.onChunk({
      name: "contextualizer",
      status: "running",
      type: "action_state",
    });
  }

  // Provide access to ALL tools
  const allTools = await getInternalToolDefinitions(s.executionContext);

  try {
    const { data, provider } = await callAIProvider({
      model: s.jobContext?.model || null,
      options: {
        allowEdit: false,
        functions: allTools,
        messages: (s.messages as any[]) || [],
      },
      prompt: "",
      systemMessage:
        (s.jobContext?.systemMessage || "") +
        "\n\n" +
        CONTEXTUALIZER_SYSTEM_PROMPT,
    });

    const stateUpdate: Record<string, unknown> = {
      providerUsed: provider || s.providerUsed,
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

      stateUpdate.messages = [...((s.messages as any[]) || []), assistantMessage];
      stateUpdate.pendingToolCalls = toolCallsArray;
    } else {
      const finalMsg = data.text || data.content || data;
      const assistantMessage = {
        content: finalMsg,
        role: "assistant",
      };
      stateUpdate.messages = [...((s.messages as any[]) || []), assistantMessage];
      stateUpdate.finalResponse = finalMsg;

      if (s.executionContext && s.executionContext.onChunk) {
        s.executionContext.onChunk({
          name: "contextualizer",
          status: "completed",
          success: true,
          type: "action_state",
        });
      }
    }

    return stateUpdate;
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : String(error);
    logger.error("Contextualizer node error", { error: errMessage });
    return { errors: [errMessage] };
  }
}
