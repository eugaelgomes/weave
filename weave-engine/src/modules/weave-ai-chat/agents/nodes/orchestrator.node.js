/**
 * @module weave-engine/modules/weave-ai-chat/agents/nodes/orchestrator.node
 */
const { callAIProvider } = require("../../../../services/llm/llm-provider.client");
const { logger } = require("../../../../services/logger");

function buildOrchestratorPrompt(availableAgents = []) {
  const customAgentsList = availableAgents
    .map((a) => `- "${a.id}": ${a.name || "Custom Agent"} - ${a.description || "Custom user agent"}`)
    .join("\n");

  return `
You are the Chat Router for Weave, a project management and organizational workspace application.
Your ONLY job is to analyze the user's latest message and the conversation context to determine which specialized agent should handle the request.

Available Agents:
- "contextualizer": For questions about the organization, user profile, workspace structure, or who is on the team.
- "project_manager": For questions about projects, tasks, notes, comments, project health, breakdowns, or timelines.
- "general_assistant": For general conversation, greetings, web searches, generic coding, or anything that doesn't fit the above.${customAgentsList.length > 0 ? '\n' + customAgentsList : ''}

You must respond with ONLY a single JSON object containing the "agent" key. No markdown, no formatting.
Example: {"agent": "project_manager"}
`;
}

async function orchestratorNode(state) {
  logger.info("Chat Orchestrator node running");

  if (state.executionContext && state.executionContext.onChunk) {
    state.executionContext.onChunk({
      type: "action_state",
      name: "orchestrator",
      status: "running",
    });
  }

  try {
    const orchestratorPrompt = buildOrchestratorPrompt(state.availableAgents || []);
    
    const { data, provider } = await callAIProvider({
      model: state.jobContext?.model || null,
      prompt: "Based on the conversation, which agent should handle this request? Respond strictly in JSON.",
      systemMessage: (state.jobContext?.systemMessage || "") + "\n\n" + orchestratorPrompt,
      options: { 
        allowEdit: false,
        messages: state.messages || [],
      },
    });

    let activeAgent = "general_assistant";
    try {
      const resultText = data.text || data.content || data;
      // Strip any markdown formatting just in case
      const cleanJson = resultText.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleanJson);
      
      const validAgents = ["contextualizer", "project_manager", "general_assistant", ...(state.availableAgents || []).map(a => a.id)];
      if (validAgents.includes(parsed.agent)) {
        activeAgent = parsed.agent;
      }
    } catch (parseError) {
      logger.warn("Orchestrator failed to parse JSON, falling back to general_assistant", { response: data.text });
    }

    if (state.executionContext && state.executionContext.onChunk) {
      state.executionContext.onChunk({
        type: "action_state",
        name: "orchestrator",
        status: "completed",
        success: true,
      });
    }

    return {
      activeAgent,
      providerUsed: provider || state.providerUsed,
    };
  } catch (error) {
    logger.error("Chat Orchestrator node error", { error: error.message });
    return { errors: [error.message], activeAgent: "general_assistant" };
  }
}

module.exports = { orchestratorNode };
