/**
 * @module weave-ai/services/chat-orchestrator.service
 * @description Core service orchestrating the Weave AI ReAct (Reasoning and Acting) chat loop.
 * Delegates work to ChatContextService and ChatLoopService.
 *
 * Dependencies:
 * - `./chat-context.service`
 * - `./chat-loop.service`
 *
 * Used by:
 * - `weave-ai/controllers/chat.controller.js`: Primary entrypoint for HTTP requests.
 */
const chatContextService = require("./chat-context.service");
const chatLoopService = require("./chat-loop.service");

class ChatOrchestratorService {
  /**
   * Orchestrates the chat flow by preparing the context and running the ReAct loop.
   */
  async orchestrateChat({
    userId,
    payload,
    organizationId,
    requestId,
    files,
    userLanguage,
    onChunk,
  }) {
    // 1. Setup Context and Authorizations
    const contextData = await chatContextService.prepareContext({
      userId,
      payload,
      organizationId,
      requestId,
      files,
      userLanguage,
      onChunk,
    });

    // Se houve hit de idempotency, retorna imediatamente.
    if (contextData.idempotencyMatch) {
      return contextData.idempotencyMatch;
    }

    // 2. Run ReAct Loop
    return await chatLoopService.executeReActLoop({
      userId,
      payload,
      organizationId,
      requestId,
      files,
      userLanguage,
      onChunk,
      contextData,
    });
  }
}

module.exports = new ChatOrchestratorService();
