/**
 * @module weave-engine/modules/weave-ai-chat/agents/nodes/orchestrator.node
 */
import { callAIProvider } from "../../../../llm-conectors/llm-provider.client";
import { logger } from "../../../../config/logger";

interface Agent {
  id: string;
  name?: string;
  description?: string;
}

interface OrchestratorState {
  availableAgents?: Agent[];
  executionContext?: {
    onChunk?: (chunk: Record<string, unknown>) => void;
  };
  jobContext?: {
    model?: string;
    systemMessage?: string;
  };
  messages?: unknown[];
  providerUsed?: string | null;
}

function buildOrchestratorPrompt(availableAgents: Agent[] = []): string {
  const customAgentsList = availableAgents
    .map(
      (a) =>
        `- "${a.id}": ${a.name || "Custom Agent"} - ${a.description || "Custom user agent"}`
    )
    .join("\n");

  return `
You are the Chat Router for Weave, a project management and organizational workspace application.
Your ONLY job is to analyze the user's latest message and the conversation context to determine which specialized agent should handle the request.

Available Agents:
- "contextualizer": For questions about the organization, user profile, workspace structure, or who is on the team.
- "project_manager": For questions about projects, tasks, notes, comments, project health, breakdowns, or timelines.
- "general_assistant": For general conversation, greetings, web searches, generic coding, or anything that doesn't fit the above.${customAgentsList.length > 0 ? "\n" + customAgentsList : ""}

You must respond with ONLY a single JSON object containing the "agent" key. No markdown, no formatting.
Example: {"agent": "project_manager"}
`;
}

export async function orchestratorNode(state: OrchestratorState) {
  logger.info("Chat Orchestrator node running");

  if (state.executionContext && state.executionContext.onChunk) {
    state.executionContext.onChunk({
      name: "orchestrator",
      status: "running",
      type: "action_state",
    });
  }

  try {
    const orchestratorPrompt = buildOrchestratorPrompt(
      state.availableAgents || []
    );

    const { data, provider } = await callAIProvider({
      model: state.jobContext?.model || null,
      options: {
        allowEdit: false,
        messages: state.messages || [],
      },
      prompt:
        "Based on the conversation, which agent should handle this request? Respond strictly in JSON.",
      systemMessage:
        (state.jobContext?.systemMessage || "") + "\n\n" + orchestratorPrompt,
    });

    let activeAgent = "general_assistant";
    try {
      const resultText = typeof data === "string" ? data : (data as Record<string, unknown>).text || (data as Record<string, unknown>).content;
      // Strip any markdown formatting just in case
      const cleanJson = String(resultText)
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();
      const parsed = JSON.parse(cleanJson);

      const validAgents = [
        "contextualizer",
        "project_manager",
        "general_assistant",
        ...(state.availableAgents || []).map((a) => a.id),
      ];
      if (validAgents.includes(parsed.agent)) {
        activeAgent = parsed.agent;
      }
    } catch (parseError: unknown) {
      const errorMsg = parseError instanceof Error ? parseError.message : "Unknown error";
      const responseText = typeof data === "string" ? data : (data as Record<string, unknown>).text || (data as Record<string, unknown>).content;
      logger.warn(
        "Orchestrator failed to parse JSON, falling back to general_assistant",
        { error: errorMsg, response: responseText }
      );
    }

    if (state.executionContext && state.executionContext.onChunk) {
      state.executionContext.onChunk({
        name: "orchestrator",
        status: "completed",
        success: true,
        type: "action_state",
      });
    }

    return {
      activeAgent,
      providerUsed: provider || state.providerUsed,
    };
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    logger.error("Chat Orchestrator node error", { error: errorMsg });
    return { activeAgent: "general_assistant", errors: [errorMsg] };
  }
}

