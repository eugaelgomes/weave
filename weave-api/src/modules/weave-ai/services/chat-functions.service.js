/**
 * @module weave-ai/services/chat-functions.service
 * @description Service responsible for executing tools/functions requested by the LLM.
 *
 * Dependencies:
 * - `../handlers/tool-registry`: To dynamically resolve tool names to their handler implementations.
 * - `../utils/weave-ai-i18n.util`: For localized error messages if a function is not supported.
 *
 * Used by:
 * - `weave-ai/services/chat-orchestrator.service.js`: During the ReAct loop to execute functions returned by the engine.
 */
const notesRepository = require("@/modules/notes/notes.repository");
const projectsReadRepository = require("@/modules/projects/repositories/projects-read.repository");
const projectsUpdateRepository = require("@/modules/projects/repositories/projects-update.repository");
const workspaceUserScopeRepository = require("@/modules/users/repositories/workspace-user-scope.repository");
const chatAccessUtil = require("../utils/chat-access.util");
const chatFormatterUtil = require("../utils/chat-formatter.util");
const { markdownToBlocks } = require("../utils/markdown-to-blocks.util");
const { NOTE_STATUS } = require("@/utils/patterns/product-patterns");
const { WORKSPACE_SHARE_DENIED } = require("@/utils/workspace-share-guard");
const {
  normalizeBlocksTree,
  newBlockId,
} = require("@/modules/notes/block-normalizer");
const {
  enqueueNoteEmbeddingJob,
} = require("@/services/queue/queue-controller");
const { getI18n } = require("../utils/weave-ai-i18n.util");

class ChatFunctionsService {
  /**
   * Execute a single authorized tool/function call.
   *
   * @param {string} userId - The ID of the authenticated user.
   * @param {{name: string, arguments?: Record<string, unknown>}} functionCall - The tool execution details.
   * @param {string|null} [organizationId=null] - Optional organization ID scope for the call.
   * @param {string} [lang="pt"] - User language for error translations.
   * @returns {Promise<{name: string, success: boolean, result?: object}>} Result of the tool execution.
   */
  async executeFunctionCall(
    userId,
    functionCall,
    organizationId = null,
    lang = "pt",
    files = []
  ) {
    const t = getI18n(lang);
    const name = String(functionCall?.name || "");
    const args =
      functionCall?.arguments && typeof functionCall.arguments === "object"
        ? functionCall.arguments
        : {};

    const registry = require("../handlers/tool-registry");
    const handler = registry.getHandler(name);

    if (!handler) {
      const error = new Error(
        typeof t.functionNotSupported === "function"
          ? t.functionNotSupported(name)
          : t.functionNotSupported
      );
      error.code = "CHAT_FUNCTION_NOT_SUPPORTED";
      error.statusCode = 400;
      throw error;
    }

    return await handler.execute({
      userId,
      args,
      organizationId,
      lang,
      t,
      name,
      files,
    });
  }

  /**
   * Executes all function calls from engine response.
   *
   * @param {string} userId - The ID of the authenticated user.
   * @param {Array<{name: string, arguments?: Record<string, unknown>}>} functionCalls - Array of tool execution details.
   * @param {string|null} [organizationId=null] - Optional organization ID scope for the calls.
   * @param {string} [lang="pt"] - User language for error translations.
   * @param {Function} [onChunk=null] - Callback to stream real-time execution state.
   * @returns {Promise<Array<object>>} Results of all tool executions.
   */
  async executeFunctionCalls(
    userId,
    functionCalls = [],
    organizationId = null,
    lang = "pt",
    onChunk = null,
    files = []
  ) {
    const results = [];
    for (const functionCall of functionCalls) {
      if (onChunk) {
        onChunk({
          type: "action_state",
          name: functionCall?.name,
          status: "running",
        });
      }
      try {
        const execution = await this.executeFunctionCall(
          userId,
          functionCall,
          organizationId,
          lang,
          files
        );
        results.push(execution);
        if (onChunk) {
          onChunk({
            type: "action_state",
            name: functionCall?.name,
            status: "completed",
            success: execution.success,
          });
        }
      } catch (error) {
        console.warn(
          `[weave-ai/chat] Tool execution failed for ${functionCall?.name}:`,
          error?.message
        );
        results.push({
          name: functionCall?.name || "unknown",
          success: false,
          error: error?.message || String(error),
        });
        if (onChunk) {
          onChunk({
            type: "action_state",
            name: functionCall?.name,
            status: "completed",
            success: false,
          });
        }
      }
    }
    return results;
  }
}

module.exports = new ChatFunctionsService();
