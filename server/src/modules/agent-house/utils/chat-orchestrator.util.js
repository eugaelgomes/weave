/**
 * @module agent-house/services/chat-orchestrator.service
 * @description Core service orchestrating the Weave AI ReAct (Reasoning and Acting) chat loop.
 * Delegates work to ChatContextService and ChatLoopService.
 *
 * Dependencies:
 * - `./chat-context.service`
 * - `./chat-loop.service`
 *
 * Used by:
 * - `agent-house/controllers/chat.controller.js`: Primary entrypoint for HTTP requests.
 */
const chatContextService = require("./chat-context.util");
const chatLoopService = require("./chat-loop.util");

class ChatOrchestratorService {
  /**
   * Orchestrates the chat flow by preparing the context and running the ReAct loop.
   */
  async orchestrateChat({ userId, payload, workspaceId, requestId, files, userLanguage, onChunk }) {
    // 1. Setup Context and Authorizations
    const contextData = await chatContextService.prepareContext({
      files,
      onChunk,
      payload,
      requestId,
      userId,
      userLanguage,
      workspaceId,
    });

    // Se houve hit de idempotency, retorna imediatamente.
    if (contextData.idempotencyMatch) {
      return contextData.idempotencyMatch;
    }

    // 2. Run ReAct Loop
    return await chatLoopService.executeReActLoop({
      contextData,
      files,
      onChunk,
      payload,
      requestId,
      userId,
      userLanguage,
      workspaceId,
    });
  }
}

module.exports = new ChatOrchestratorService();
