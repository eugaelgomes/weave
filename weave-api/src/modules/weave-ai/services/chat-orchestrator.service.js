/**
 * @module weave-ai/services/chat-orchestrator.service
 * @description Core service orchestrating the Weave AI ReAct (Reasoning and Acting) chat loop.
 * Handles state persistence, authorization, tool invocation, and LLM retry logic.
 *
 * Dependencies:
 * - `../repositories/chat.repository`: To save messages and history.
 * - `./chat-engine.service`: To request prompt generation.
 * - `./chat-functions.service`: To execute tool calls requested by the LLM.
 * - `../policies/authorized-functions`: To resolve tool access per user context.
 *
 * Used by:
 * - `weave-ai/controllers/chat.controller.js`: Primary entrypoint for HTTP requests.
 */
const { randomUUID } = require("crypto");
const { v5: uuidv5 } = require("uuid");
const chatRepository = require("@/modules/weave-ai/repositories/chat.repository");
const agentsRepository = require("@/modules/weave-ai/repositories/agents.repository");
const PlansRepository = require("@/modules/plans/plans.repository");
const PlanUsageManager = require("@/modules/plans/plans.controller");
const { PLAN_PATHS, USAGE_PATHS } = require("@/services/plans/plan-paths");
const {
  resolveAuthorizedFunctions,
} = require("@/modules/weave-ai/policies/authorized-functions");
const { resolveNoteIdsToUuids } = require("@/utils/note-id-lookup");
const { resolveProjectIdsToUuids } = require("@/utils/project-id-lookup");

const chatFormatterUtil = require("../utils/chat-formatter.util");
const chatEngineService = require("./chat-engine.service");
const chatFunctionsService = require("./chat-functions.service");
const { getI18n, getLocalChatI18n } = require("../utils/weave-ai-i18n.util");

const CHAT_CONTEXT_MAX_MESSAGES = Number.parseInt(
  process.env.WEAVE_CHAT_CONTEXT_MAX_MESSAGES || "20",
  10
);

class ChatOrchestratorService {
  /**
   * Orchestrates the chat flow: fetches history, checks permissions, resolves authorized tools,
   * and runs a ReAct loop to interact with the LLM and execute requested functions until a final answer is produced.
   *
   * @param {Object} params - The orchestration parameters.
   * @param {string} params.userId - Authenticated user UUID.
   * @param {Object} params.payload - The parsed chat request payload.
   * @param {string|null} params.organizationId - User's organization UUID.
   * @param {string} params.requestId - Idempotency key for this request.
   * @param {Array<Object>} params.files - Uploaded files metadata.
   * @param {string} params.userLanguage - Resolved user language.
   * @param {Function} params.onChunk - Callback for streaming response chunks.
   * @returns {Promise<{sessionId: string, response: Object}>} The final assistant response.
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
    const t = getI18n(userLanguage);
    const chatI18n = getLocalChatI18n(userLanguage);
    let selectedAgent = null;
    let authorizedFunctions = [];
    let capabilityRules = {};
    let resourceAccess = {};

    const planUsageContext = await chatEngineService.buildPlanUsageContext(
      userId,
      organizationId
    );

    const usageRecord = await PlanUsageManager.managePlanUsage(
      userId,
      organizationId
    ).catch(() => null);

    if (usageRecord && planUsageContext) {
      const effectivePlan =
        await PlansRepository.getEffectivePlanByUserId(userId);
      const planDetails = effectivePlan?.plan_details;
      if (planDetails) {
        const allowed = PlanUsageManager.checkLimit(
          planDetails,
          usageRecord.usage_details,
          USAGE_PATHS.MONTHLY.WEAVE_AI.MESSAGES_SENT,
          PLAN_PATHS.WEAVE_AI.CONFIG.MONTHLY_MESSAGES
        );
        if (!allowed) {
          const limitError = new Error(
            "Monthly AI message limit reached for your current plan."
          );
          limitError.code = "PLAN_LIMIT_EXCEEDED";
          limitError.statusCode = 403;
          throw limitError;
        }
      }
    }

    if (payload.agentId) {
      selectedAgent = await agentsRepository.getAgentByIdWithAccess(
        payload.agentId,
        userId
      );
      if (!selectedAgent) {
        const agentError = new Error(t.agentNotFound);
        agentError.code = "CHAT_AGENT_NOT_FOUND";
        agentError.statusCode = 404;
        throw agentError;
      }
    }

    let sessionId = payload.sessionId;
    if (sessionId) {
      const sessions = await chatRepository.getUserSessions(userId, 200);
      const hasSessionAccess = sessions.some(
        (session) => String(session.id) === String(sessionId)
      );

      if (!hasSessionAccess) {
        const sessionError = new Error(t.sessionNotFound);
        sessionError.code = "CHAT_SESSION_NOT_FOUND";
        sessionError.statusCode = 404;
        throw sessionError;
      }
    } else {
      const session = await chatRepository.createSession(userId);
      sessionId = session.id;
    }

    const rawConversationHistory =
      await chatRepository.getSessionMessagesForContext(
        sessionId,
        userId,
        CHAT_CONTEXT_MAX_MESSAGES
      );
    const conversationHistory = chatFormatterUtil.normalizeConversationHistory(
      rawConversationHistory
    );

    const filesMetadata = chatFormatterUtil.buildFilesMetadata(files);
    const existingMessagesForRequest =
      await chatRepository.getMessagesByRequestId(sessionId, userId, requestId);
    const existingAssistantMessage = existingMessagesForRequest.find(
      (message) => message.role === "assistant"
    );

    if (existingAssistantMessage) {
      return {
        sessionId,
        response: {
          role: "assistant",
          content: existingAssistantMessage.content || "",
          citations: existingAssistantMessage?.metadata?.citations || [],
          functionExecution:
            existingAssistantMessage?.metadata?.functionExecution || [],
          functions: existingAssistantMessage?.metadata?.functions || [],
          model: payload.model,
          provider: existingAssistantMessage.provider || null,
        },
      };
    }

    const hasPersistedUserMessage = existingMessagesForRequest.some(
      (message) => message.role === "user"
    );
    if (!hasPersistedUserMessage) {
      await chatRepository.saveMessageIdempotent({
        sessionId,
        userId,
        organizationId,
        role: "user",
        content: payload.message,
        model: `${payload.model.name}:${payload.model.version}`,
        requestId,
        status: "ok",
        agentId: payload.agentId,
        allowEdit: payload.allowEdit,
        metadata: {
          allowEdit: payload.allowEdit,
          context: payload.context,
          noteIds: payload.noteIds,
          projectIds: payload.projectIds,
          files: filesMetadata,
          agentId: payload.agentId,
          useCase: payload.useCase,
        },
      });
    }

    if (conversationHistory.length === 0) {
      const derivedTitle = chatFormatterUtil.deriveSessionTitleFromMessage(
        payload.message
      );
      if (derivedTitle) {
        await chatRepository.updateSessionTitle(
          sessionId,
          userId,
          derivedTitle
        );
      }
    }

    const resolvedNoteIds = await resolveNoteIdsToUuids(
      Array.isArray(payload.noteIds) ? payload.noteIds : []
    );
    const resolvedProjectIds = await resolveProjectIdsToUuids(
      Array.isArray(payload.projectIds) ? payload.projectIds : []
    );

    try {
      const authorization = await resolveAuthorizedFunctions({
        allowEdit: payload.allowEdit,
        context: {
          planUsageContext,
          organizationId,
          noteId: resolvedNoteIds.length > 0 ? resolvedNoteIds[0] : null,
          projectId:
            resolvedProjectIds.length > 0 ? resolvedProjectIds[0] : null,
        },
        userId,
      });
      authorizedFunctions = Array.isArray(authorization?.functions)
        ? authorization.functions
        : [];

      authorizedFunctions.push({
        name: "ask_user_input",
        description:
          "CRITICAL: Ask the user for confirmation ONLY before proceeding with DESTRUCTIVE or CRITICAL actions (e.g., delete, rollback, overwrite). DO NOT use this for normal creations or updates unless specifically requested by the user.",
        parameters: {
          type: "object",
          properties: {
            question: {
              type: "string",
              description:
                "The clear and friendly question or confirmation message to present to the user.",
            },
            options: {
              type: "array",
              items: {
                type: "string",
              },
              description:
                "An array of possible answers/choices the user can select (e.g. ['Yes, delete it', 'No, cancel']).",
            },
          },
          required: ["question"],
        },
      });

      capabilityRules = authorization?.capabilityRules || {};
      resourceAccess = authorization?.access || {};
    } catch {
      authorizedFunctions = [];
    }

    let currentLoop = 0;
    const MAX_LOOPS = 5;

    let finalAssistantText = "";
    let responseFunctions = [];
    let functionExecution = [];
    let engineActions = [];
    let messageStatus = "ok";
    let providerUsed = null;
    const tokenUsage = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
    const messageMetadata = {
      citations: [],
      functionExecution: [],
      functions: [],
      providerUsed: null,
      requestId,
    };
    let askUserInputCall = null;

    let currentMessage = payload.message;
    const currentConversationHistory = [...conversationHistory];
    let totalLatencyMs = 0;

    // Begin the ReAct (Reasoning and Acting) loop.
    // The engine might respond with tool calls instead of text. If so, we execute the tools,
    // append the results to the context, and ask the engine again, up to MAX_LOOPS times.
    while (currentLoop < MAX_LOOPS) {
      const engineResponse = await chatEngineService.requestEngineChat(
        {
          agent: selectedAgent,
          allowEdit: payload.allowEdit,
          allowWebSearch: payload.allowWebSearch,
          context: {
            capabilityRules,
            clientContext: payload.context,
            noteBlocksContract: chatFormatterUtil.buildNoteBlocksContract(),
            noteDocumentContract: chatFormatterUtil.buildNoteBlocksContract(),
            organizationId,
            resourceAccess,
            useCase: payload.useCase,
            userLanguage,
          },
          files:
            currentLoop === 0
              ? chatFormatterUtil.buildEngineFilesPayload(files)
              : [],
          functions: authorizedFunctions,
          message: currentMessage,
          model: chatFormatterUtil.resolveModelForEngine(payload.model),
          noteIds: resolvedNoteIds,
          organizationId,
          projectIds: resolvedProjectIds,
          conversationHistory: currentConversationHistory,
          sessionId,
          user_id: userId,
          userId,
          ...(organizationId ? { org_id: organizationId } : {}),
          userLanguage,
        },
        requestId,
        onChunk
      );

      totalLatencyMs += engineResponse?.latencyMs || 0;
      const enginePayload = engineResponse?.data || {};

      const engineExecutedActions = Array.isArray(
        enginePayload?.executedActions
      )
        ? enginePayload.executedActions
        : [];
      if (engineExecutedActions.length > 0) {
        engineActions = [...engineActions, ...engineExecutedActions];
      }

      const assistantText =
        enginePayload?.data?.response ||
        enginePayload?.data?.text ||
        enginePayload?.data?.content ||
        "";
      const currentFunctions = Array.isArray(enginePayload?.functions)
        ? enginePayload.functions
        : [];

      providerUsed = enginePayload?.providerUsed || providerUsed;
      // Accumulate token usage across all iterations of the ReAct loop
      const currentTokenUsage =
        chatFormatterUtil.extractTokenUsage(enginePayload);
      tokenUsage.inputTokens =
        (tokenUsage.inputTokens || 0) + (currentTokenUsage.inputTokens || 0);
      tokenUsage.outputTokens =
        (tokenUsage.outputTokens || 0) + (currentTokenUsage.outputTokens || 0);
      tokenUsage.totalTokens =
        (tokenUsage.totalTokens || 0) + (currentTokenUsage.totalTokens || 0);

      if (Array.isArray(enginePayload?.data?.citations)) {
        messageMetadata.citations = [
          ...messageMetadata.citations,
          ...enginePayload.data.citations,
        ];
      }

      askUserInputCall = currentFunctions.find(
        (f) => f.name === "ask_user_input"
      );

      if (askUserInputCall) {
        messageStatus = "ok"; // Changed from requires_input to comply with DB constraints
        responseFunctions = [...responseFunctions, ...currentFunctions];
        finalAssistantText =
          assistantText ||
          askUserInputCall.arguments?.question ||
          chatI18n.awaitingInput;
        break;
      } else if (currentFunctions.length > 0) {
        messageStatus = "function_call";
        const currentExecutions =
          await chatFunctionsService.executeFunctionCalls(
            userId,
            currentFunctions,
            organizationId,
            userLanguage
          );
        functionExecution = [...functionExecution, ...currentExecutions];
        responseFunctions = [...responseFunctions, ...currentFunctions];

        if (assistantText) {
          finalAssistantText +=
            (finalAssistantText ? "\n\n" : "") + assistantText;
        }

        await chatRepository.saveMessageIdempotent({
          sessionId,
          userId,
          organizationId,
          role: "assistant",
          content: assistantText || null,
          model: `${payload.model.name}:${payload.model.version}`,
          requestId: uuidv5(`call_${currentLoop}`, requestId),
          provider: providerUsed,
          status: "function_call",
          latencyMs: engineResponse?.latencyMs || null,
          inputTokens: currentTokenUsage.inputTokens,
          outputTokens: currentTokenUsage.outputTokens,
          totalTokens: currentTokenUsage.totalTokens,
          agentId: payload.agentId,
          allowEdit: payload.allowEdit,
          toolCalls: currentFunctions,
          metadata: {
            citations: enginePayload?.data?.citations || [],
            providerUsed,
          },
        });

        // Execute each tool and persist the result into the database
        // to maintain conversational context and debuggability.
        for (let i = 0; i < currentExecutions.length; i++) {
          const exec = currentExecutions[i];
          const fn = currentFunctions[i];
          const tId = fn.id || `call_${currentLoop}_${i}`;
          const execContent =
            typeof exec.result === "string"
              ? exec.result
              : JSON.stringify(exec.result || exec.error || exec);

          await chatRepository.saveMessageIdempotent({
            sessionId,
            userId,
            organizationId,
            role: "tool",
            content: execContent,
            model: `${payload.model.name}:${payload.model.version}`,
            requestId: uuidv5(`tool_${currentLoop}_${i}`, requestId),
            provider: providerUsed,
            status: exec.success ? "ok" : "error",
            errorCode: exec.success ? null : "TOOL_EXECUTION_FAILED",
            errorMessage: exec.success ? null : String(exec.error),
            agentId: payload.agentId,
            allowEdit: payload.allowEdit,
            toolCallId: tId,
          });
        }

        currentConversationHistory.push({
          role: "user",
          content: currentMessage,
        });
        currentConversationHistory.push({
          role: "assistant",
          content: assistantText || chatI18n.callingFunctions,
        });

        currentMessage = chatI18n.functionResults(
          JSON.stringify(currentExecutions, null, 2)
        );
        currentLoop++;
      } else {
        if (assistantText) {
          finalAssistantText +=
            (finalAssistantText ? "\n\n" : "") + assistantText;
        } else {
          if (!finalAssistantText) {
            finalAssistantText =
              functionExecution.length > 0
                ? chatI18n.successFallback
                : responseFunctions.length > 0
                  ? chatI18n.functionUnderstoodFallback
                  : chatI18n.noContentFallback;
          }
        }
        break;
      }
    }

    if (engineActions.length > 0) {
      messageMetadata.engineActions = engineActions;
      for (const action of engineActions) {
        functionExecution.push({
          name: action.name,
          success: !action.result?.error,
          result: action.result,
          source: "engine",
        });
      }
    }

    messageMetadata.functionExecution = functionExecution;
    messageMetadata.functions = responseFunctions;
    messageMetadata.providerUsed = providerUsed;

    if (askUserInputCall) {
      messageMetadata.requires_input = askUserInputCall.arguments || {};
      messageMetadata.status = "requires_input";
    }

    await chatRepository.saveMessageIdempotent({
      sessionId,
      userId,
      organizationId,
      role: "assistant",
      content: finalAssistantText,
      model: `${payload.model.name}:${payload.model.version}`,
      requestId,
      provider: providerUsed,
      status: messageStatus,
      latencyMs: totalLatencyMs || null,
      inputTokens: tokenUsage.inputTokens,
      outputTokens: tokenUsage.outputTokens,
      totalTokens: tokenUsage.totalTokens,
      agentId: payload.agentId,
      allowEdit: payload.allowEdit,
      metadata: messageMetadata,
    });

    if (usageRecord?.id) {
      PlanUsageManager.consumeAiMessage(
        usageRecord.id,
        tokenUsage.totalTokens || 0
      ).catch((err) => {
        console.error(
          "[weave-ai/chat] failed to enqueue AI usage consumption",
          {
            usageId: usageRecord.id,
            error: err?.message || String(err),
          }
        );
      });
    }

    // Sanitize functionExecution for the HTTP response to save bandwidth
    const sanitizedFunctionExecution = functionExecution.map((exec) => {
      let sanitizedResult = exec.result;
      if (sanitizedResult) {
        const jsonStr = JSON.stringify(sanitizedResult);
        if (jsonStr.length > 3000) {
          if (Array.isArray(sanitizedResult)) {
            sanitizedResult = [
              ...sanitizedResult.slice(0, 3),
              { _warning: "Additional results truncated for UI performance." },
            ];
          } else {
            sanitizedResult = {
              _warning: "Result payload too large, truncated for UI rendering.",
            };
          }
        }
      }
      return {
        ...exec,
        result: sanitizedResult,
      };
    });

    return {
      sessionId,
      response: {
        role: "assistant",
        content: finalAssistantText,
        citations: messageMetadata.citations,
        functionExecution: sanitizedFunctionExecution,
        functions: responseFunctions,
        model: payload.model,
        provider: providerUsed,
        metadata: {
          ...messageMetadata,
          functionExecution: sanitizedFunctionExecution,
        },
      },
    };
  }
}

module.exports = new ChatOrchestratorService();
