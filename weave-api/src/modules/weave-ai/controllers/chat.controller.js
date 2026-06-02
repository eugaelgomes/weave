/* eslint-disable no-console, sort-keys */
const { randomUUID } = require("crypto");
const chatRepository = require("@/modules/weave-ai/repositories/chat.repository");
const agentsRepository = require("@/modules/weave-ai/repositories/agents.repository");
const { getProvidersWithModels } = require("@/modules/weave-ai/llm-catalog");
const PlansRepository = require("@/modules/plans/plans.repository");
const PlanUsageManager = require("@/modules/plans/plans.controller");
const { sendPlanLimitExceeded } = require("@/utils/plan-limit-http");
const { PLAN_PATHS, USAGE_PATHS } = require("@/services/plans/plan-paths");
const {
  resolveAuthorizedFunctions,
} = require("@/modules/weave-ai/authorized-functions");
const { resolveNoteIdsToUuids } = require("@/utils/note-id-lookup");
const { resolveProjectIdsToUuids } = require("@/utils/project-id-lookup");

const chatParserUtil = require("../utils/chat-parser.util");
const chatFormatterUtil = require("../utils/chat-formatter.util");
const chatEngineService = require("../services/chat-engine.service");
const chatFunctionsService = require("../services/chat-functions.service");
const { getI18n, getLangFromReq } = require("../utils/weave-ai-i18n.util");

const CHAT_CONTEXT_MAX_MESSAGES = Number.parseInt(
  process.env.WEAVE_CHAT_CONTEXT_MAX_MESSAGES || "20",
  10
);

const CHAT_I18N = {
  pt: {
    callingFunctions: "Chamando funções...",
    functionResults: (results) =>
      `Resultados das funções executadas:\n${results}\n\nPor favor, continue a tarefa com base nestes resultados. Se a tarefa foi concluída, você pode responder ao usuário.\n\nDica de UI: Sempre que se referir a projetos ou tarefas/anotações recém criadas/modificadas, gere links Markdown clicáveis! Use o formato [Nome da Tarefa](/projects/[projectPublicId]/tasks/[publicNoteId]) ou [Nome do Projeto](/projects/[projectPublicId]) utilizando os IDs públicos retornados. Para avatares, use ![Foto](avatar_url).`,
    successFallback: "Solicitação executada com sucesso.",
    functionUnderstoodFallback:
      "Solicitação entendida. Recebi uma chamada de função, mas não houve alterações executadas.",
    noContentFallback:
      "Solicitação recebida, mas o modelo não retornou conteúdo textual.",
    awaitingInput: "Aguardando sua entrada...",
  },
  en: {
    callingFunctions: "Calling functions...",
    functionResults: (results) =>
      `Function execution results:\n${results}\n\nPlease continue the task based on these results. If the task is completed, you can reply to the user.\n\nUI Tip: Whenever referring to newly created or modified projects/notes, generate clickable Markdown links! Use the format [Task Name](/projects/[projectPublicId]/tasks/[publicNoteId]) or [Project Name](/projects/[projectPublicId]) using the public IDs returned in the executions. For avatars, use ![Avatar](avatar_url).`,
    successFallback: "Request executed successfully.",
    functionUnderstoodFallback:
      "Request understood. Received a function call, but no changes were executed.",
    noContentFallback:
      "Request received, but the model did not return any textual content.",
    awaitingInput: "Awaiting your input...",
  },
  es: {
    callingFunctions: "Llamando funciones...",
    functionResults: (results) =>
      `Resultados de la ejecución de las funciones:\n${results}\n\nContinúe la tarea en función de estos resultados. Si la tarea se ha completado, puede responder al usuario.\n\nConsejo de UI: ¡Siempre que te refieras a proyectos o notas recién creadas/modificadas, genera enlaces Markdown clicables! Usa el formato [Nombre de la Tarea](/projects/[projectPublicId]/tasks/[publicNoteId]) o [Nombre del Proyecto](/projects/[projectPublicId]) con los IDs públicos devueltos. Para avatares, usa ![Foto](avatar_url).`,
    successFallback: "Solicitud ejecutada exitosamente.",
    functionUnderstoodFallback:
      "Solicitud entendida. Recibí una llamada de función, pero no se ejecutaron cambios.",
    noContentFallback:
      "Solicitud recibida, mas el modelo no devolvió ningún contenido textual.",
    awaitingInput: "Esperando tu entrada...",
  },
};

function getLocalChatI18n(lang) {
  const normalized = String(lang || "pt")
    .trim()
    .substring(0, 2)
    .toLowerCase();
  if (normalized === "en") return CHAT_I18N["en"];
  if (normalized === "es") return CHAT_I18N["es"];
  return CHAT_I18N["pt"];
}

class ChatController {
  /**
   * Handles user chat message ingestion and persistence.
   *
   * @param {import("express").Request} req - The Express request object.
   * @param {import("express").Response} res - The Express response object.
   * @returns {Promise<void>}
   */
  async chat(req, res) {
    const userLanguage = getLangFromReq(req);
    const t = getI18n(userLanguage);
    const chatI18n = getLocalChatI18n(userLanguage);
    let userId = null;
    let payload = null;
    let sessionId = null;
    let requestId = null;

    try {
      userId = chatParserUtil.validateAuthentication(req);
      payload = chatParserUtil.parseChatPayload(req);
      const organizationId = req.user?.organizationId || null;
      requestId = payload.requestId || randomUUID();
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
            return sendPlanLimitExceeded(res, {
              resource: "weave_ai",
              limit_key: "weave_ai.config.monthly_messages",
              message:
                "Monthly AI message limit reached for your current plan.",
            });
          }
        }
      }

      if (payload.agentId) {
        selectedAgent = await agentsRepository.getAgentByIdWithAccess(
          payload.agentId,
          userId
        );
        if (!selectedAgent) {
          return res.status(404).json({
            success: false,
            error: {
              code: "CHAT_AGENT_NOT_FOUND",
              message: t.agentNotFound,
            },
          });
        }
      }

      sessionId = payload.sessionId;
      if (sessionId) {
        const sessions = await chatRepository.getUserSessions(userId, 200);
        const hasSessionAccess = sessions.some(
          (session) => String(session.id) === String(sessionId)
        );

        if (!hasSessionAccess) {
          return res.status(404).json({
            success: false,
            error: {
              code: "CHAT_SESSION_NOT_FOUND",
              message: t.sessionNotFound,
            },
          });
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
      const conversationHistory =
        chatFormatterUtil.normalizeConversationHistory(rawConversationHistory);

      const filesMetadata = chatFormatterUtil.buildFilesMetadata(req.files);
      const existingMessagesForRequest =
        await chatRepository.getMessagesByRequestId(
          sessionId,
          userId,
          requestId
        );
      const existingAssistantMessage = existingMessagesForRequest.find(
        (message) => message.role === "assistant"
      );
      if (existingAssistantMessage) {
        return res.json({
          success: true,
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
        });
      }

      const hasPersistedUserMessage = existingMessagesForRequest.some(
        (message) => message.role === "user"
      );
      if (!hasPersistedUserMessage) {
        await chatRepository.saveMessageIdempotent({
          sessionId,
          userId,
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
            "Ask the user for confirmation or clarification before proceeding with an action.",
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
                ? chatFormatterUtil.buildEngineFilesPayload(req.files)
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
          requestId
        );

        totalLatencyMs += engineResponse?.latencyMs || 0;
        const enginePayload = engineResponse?.data || {};

        const assistantText =
          enginePayload?.data?.response ||
          enginePayload?.data?.text ||
          enginePayload?.data?.content ||
          "";
        const currentFunctions = Array.isArray(enginePayload?.functions)
          ? enginePayload.functions
          : [];

        providerUsed = enginePayload?.providerUsed || providerUsed;
        const currentTokenUsage =
          chatFormatterUtil.extractTokenUsage(enginePayload);
        tokenUsage.inputTokens =
          (tokenUsage.inputTokens || 0) + (currentTokenUsage.inputTokens || 0);
        tokenUsage.outputTokens =
          (tokenUsage.outputTokens || 0) +
          (currentTokenUsage.outputTokens || 0);
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
          messageStatus = "requires_input";
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
            role: "assistant",
            content: assistantText || null,
            model: `${payload.model.name}:${payload.model.version}`,
            requestId: `${requestId}_call_${currentLoop}`,
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

          for (let i = 0; i < currentExecutions.length; i++) {
            const exec = currentExecutions[i];
            const fn = currentFunctions[i];
            const tId = fn.id || `call_${currentLoop}_${i}`;
            const execContent = typeof exec.result === "string" 
              ? exec.result 
              : JSON.stringify(exec.result || exec.error || exec);
              
            await chatRepository.saveMessageIdempotent({
              sessionId,
              userId,
              role: "tool",
              content: execContent,
              model: `${payload.model.name}:${payload.model.version}`,
              requestId: `${requestId}_tool_${currentLoop}_${i}`,
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

      return res.json({
        success: true,
        sessionId,
        response: {
          role: "assistant",
          content: finalAssistantText,
          citations: messageMetadata.citations,
          functionExecution,
          functions: responseFunctions,
          model: payload.model,
          provider: providerUsed,
        },
      });
    } catch (error) {
      const normalizedError = chatFormatterUtil.normalizeApiError(error, {
        code: "CHAT_PROCESSING_FAILED",
        message: t.processChatFailed,
        statusCode: 500,
      });
      const cause = error?.cause;
      const causeSummary =
        cause instanceof Error
          ? { name: cause.name, message: cause.message, code: cause.code }
          : cause !== null && cause !== undefined && typeof cause === "object"
            ? { message: String(cause.message || cause) }
            : cause !== null && cause !== undefined
              ? { detail: String(cause) }
              : undefined;

      console.error("[weave-ai/chat] request failed", {
        cause: causeSummary,
        code: normalizedError.code,
        errorCode: error?.code,
        errorName: error?.name,
        message: normalizedError.message,
        requestId:
          (typeof req.body?.requestId === "string" && req.body.requestId) ||
          error?.requestId ||
          requestId ||
          null,
        statusCode: normalizedError.statusCode,
      });

      if (userId && sessionId && payload) {
        chatRepository
          .saveMessageIdempotent({
            sessionId,
            userId,
            role: "assistant",
            content: null,
            model: `${payload.model?.name || "unknown"}:${payload.model?.version || "unknown"}`,
            requestId,
            status: "error",
            errorCode: normalizedError.code,
            errorMessage: normalizedError.message,
            agentId: payload.agentId,
          })
          .catch((err) => {
            console.error("[weave-ai/chat] failed to save error message", err);
          });
      }
      return res.status(normalizedError.statusCode).json({
        success: false,
        error: {
          code: normalizedError.code,
          message: normalizedError.message,
        },
      });
    }
  }

  /**
   * Returns user chat history. If sessionId is provided, returns messages.
   *
   * @param {import("express").Request} req - The Express request object.
   * @param {import("express").Response} res - The Express response object.
   * @returns {Promise<void>}
   */
  async getChatHistory(req, res) {
    const userLanguage = getLangFromReq(req);
    const t = getI18n(userLanguage);
    try {
      const userId = chatParserUtil.validateAuthentication(req);
      const { sessionId } = req.query;
      const parsedLimit = Number.parseInt(String(req.query.limit || "10"), 10);
      const limit =
        Number.isNaN(parsedLimit) || parsedLimit <= 0 ? 10 : parsedLimit;
      const parsedOffset = Number.parseInt(String(req.query.offset || "0"), 10);
      const offset =
        Number.isNaN(parsedOffset) || parsedOffset < 0 ? 0 : parsedOffset;

      if (sessionId) {
        const messages = await chatRepository.getSessionMessages(
          String(sessionId),
          userId
        );
        return res.json({
          success: true,
          sessionId: String(sessionId),
          messages,
        });
      }

      const sessions = await chatRepository.getUserSessions(
        userId,
        limit,
        offset
      );
      return res.json({
        success: true,
        sessions,
      });
    } catch (error) {
      const normalizedError = chatFormatterUtil.normalizeApiError(error, {
        code: "CHAT_HISTORY_FETCH_FAILED",
        message: t.fetchHistoryFailed,
        statusCode: 500,
      });
      console.error("[weave-ai/chat-history] request failed", {
        code: normalizedError.code,
        message: normalizedError.message,
        statusCode: normalizedError.statusCode,
      });
      return res.status(normalizedError.statusCode).json({
        success: false,
        error: {
          code: normalizedError.code,
          message: normalizedError.message,
        },
      });
    }
  }

  /**
   * Soft deletes a user chat session.
   *
   * @param {import("express").Request} req - The Express request object.
   * @param {import("express").Response} res - The Express response object.
   * @returns {Promise<void>}
   */
  async deleteChatSession(req, res) {
    const userLanguage = getLangFromReq(req);
    const t = getI18n(userLanguage);
    try {
      const userId = chatParserUtil.validateAuthentication(req);
      const sessionId = String(req.params?.sessionId || "").trim();

      if (!sessionId) {
        return res.status(400).json({
          success: false,
          error: {
            code: "CHAT_SESSION_ID_REQUIRED",
            message: t.sessionIdRequired,
          },
        });
      }

      const deleted = await chatRepository.deleteSession(sessionId, userId);
      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: {
            code: "CHAT_SESSION_NOT_FOUND",
            message: t.sessionNotFoundGen,
          },
        });
      }

      return res.status(200).json({
        success: true,
        sessionId,
      });
    } catch (error) {
      const normalizedError = chatFormatterUtil.normalizeApiError(error, {
        code: "CHAT_SESSION_DELETE_FAILED",
        message: t.deleteSessionFailed,
        statusCode: 500,
      });
      return res.status(normalizedError.statusCode).json({
        success: false,
        error: {
          code: normalizedError.code,
          message: normalizedError.message,
        },
      });
    }
  }

  /**
   * Returns available providers and models.
   *
   * @param {import("express").Request} req - The Express request object.
   * @param {import("express").Response} res - The Express response object.
   * @returns {void}
   */
  getAvailableModels(req, res) {
    const userLanguage = getLangFromReq(req);
    const t = getI18n(userLanguage);
    try {
      chatParserUtil.validateAuthentication(req);
      const providers = getProvidersWithModels();

      return res.json({
        success: true,
        providers,
      });
    } catch (error) {
      const normalizedError = chatFormatterUtil.normalizeApiError(error, {
        code: "CHAT_MODELS_FETCH_FAILED",
        message: t.fetchModelsFailed,
        statusCode: 500,
      });
      console.error("[weave-ai/models] request failed", {
        code: normalizedError.code,
        message: normalizedError.message,
        statusCode: normalizedError.statusCode,
      });
      return res.status(normalizedError.statusCode).json({
        success: false,
        error: {
          code: normalizedError.code,
          message: normalizedError.message,
        },
      });
    }
  }
}

module.exports = new ChatController();
