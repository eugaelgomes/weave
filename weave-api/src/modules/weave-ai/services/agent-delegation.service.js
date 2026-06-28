/**
 * @module weave-ai/services/agent-delegation.service
 * @description Handles the execution of the `delegate_to_agent` tool, creating an inner ReAct loop
 * by delegating the task to the chat-orchestrator service in "sub-agent" mode.
 */
const { randomUUID } = require("crypto");
// We require it dynamically or lazily if there's a circular dependency, 
// since chat-functions requires this, and this requires chat-orchestrator, which requires chat-functions.
let chatOrchestratorService = null;

class AgentDelegationService {
  /**
   * Executes the delegation to a specialized agent.
   *
   * @param {string} userId - The user ID.
   * @param {string|null} organizationId - The organization ID.
   * @param {string} userLanguage - The user's language.
   * @param {string} agentId - The target agent ID to invoke.
   * @param {string} taskDescription - The description of the task.
   * @param {string} parentToolCallId - The ID of the tool call that initiated this delegation.
   * @param {Array<Object>} files - Uploaded files metadata, if they should be forwarded.
   * @returns {Promise<Object>} The result containing the final answer and sub-session ID.
   */
  async executeDelegateToAgent(
    userId,
    organizationId,
    userLanguage,
    agentId,
    taskDescription,
    parentToolCallId,
    files = []
  ) {
    if (!chatOrchestratorService) {
      chatOrchestratorService = require("./chat-orchestrator.service");
    }

    const subSessionId = randomUUID();
    const subRequestId = randomUUID();

    try {
      // Initiate a sub-agent session by calling the orchestrator
      const result = await chatOrchestratorService.orchestrateChat({
        userId,
        organizationId,
        requestId: subRequestId,
        userLanguage,
        files: [], // Do not forward raw file buffers by default to save bandwidth, unless requested. We can pass files if needed.
        payload: {
          sessionId: subSessionId,
          agentId: agentId,
          message: taskDescription,
          isSubAgent: true,
          parentToolCallId, // To be tracked in the session's metadata
          model: { name: "default", version: "latest" }, // The engine or orchestrator will resolve the appropriate model
          allowEdit: false, // Prevent destructive edits directly from sub-agents by default
          allowWebSearch: true,
          context: {},
        },
        onChunk: null, // We do not stream the sub-agent's inner monologue directly to the UI
      });

      return {
        success: true,
        result: {
          finalAnswer: result.response.content,
          subSessionId: result.sessionId,
          agentId: agentId,
        },
      };
    } catch (error) {
      console.error("[weave-ai/agent-delegation] Delegation failed:", error);
      return {
        success: false,
        error: error.message || "Failed to execute sub-agent delegation.",
      };
    }
  }
}

module.exports = new AgentDelegationService();
