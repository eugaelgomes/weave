const chatRepository = require("@/modules/weave-ai/repositories/chat.repository");
const agentsRepository = require("@/modules/weave-ai/repositories/agents.repository");
const PlansRepository = require("@/modules/plans/repositories/plans.repository");
const PlanUsageManager = require("@/modules/plans/controllers/plans.controller");
const { PLAN_PATHS, USAGE_PATHS } = require("@/services/plans/plan-paths");
const { resolveAuthorizedFunctions } = require("@/utils/authorized-functions");
const { resolveNoteIdsToUuids } = require("@/utils/note-id-lookup");
const { resolveProjectIdsToUuids } = require("@/utils/project-id-lookup");
const chatFormatterUtil = require("../utils/chat-formatter.util");
const chatEngineService = require("./chat-engine.service");
const { getI18n } = require("../utils/weave-ai-i18n.util");

const CHAT_CONTEXT_MAX_MESSAGES = Number.parseInt(
  process.env.WEAVE_CHAT_CONTEXT_MAX_MESSAGES || "20",
  10
);

class ChatContextService {
  async prepareContext({
    userId,
    payload,
    organizationId,
    requestId,
    files,
    userLanguage,
    onChunk,
  }) {
    const t = getI18n(userLanguage);
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

    if (onChunk && !payload.sessionId) {
      onChunk({ sessionId, type: "session_created" });
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

    // Upload attached files to Digital Ocean Spaces and build metadata with URLs/keys
    const filesMetadata = [];
    if (Array.isArray(files) && files.length > 0) {
      const spacesService = require("@/services/storage");
      const { v4: uuidv4 } = require("uuid");
      for (const file of files) {
        try {
          const ext = spacesService.getFileExtensionFromMimeType(file.mimetype);
          const safeOriginalName = file.originalname
            ? file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_")
            : `file${ext}`;
          const uniqueFileName = `${uuidv4()}_${safeOriginalName}`;
          const folderPath = spacesService.buildKey(
            "chat",
            String(userId),
            String(sessionId),
            "files"
          );

          const uploadResult = await spacesService.uploadImage(
            file.buffer,
            file.mimetype || "application/octet-stream",
            userId,
            uniqueFileName,
            folderPath
          );

          if (uploadResult && uploadResult.success) {
            filesMetadata.push({
              key: uploadResult.key,
              mimeType: file.mimetype,
              originalName: file.originalname,
              path: uploadResult.key,
              size: file.size,
              url: uploadResult.url,
            });
          } else {
            filesMetadata.push({
              mimeType: file.mimetype,
              originalName: file.originalname,
              size: file.size,
            });
          }
        } catch (uploadError) {
          console.error("Failed to upload chat file attachment:", uploadError);
          filesMetadata.push({
            mimeType: file.mimetype,
            originalName: file.originalname,
            size: file.size,
          });
        }
      }
    } else {
      // Fallback if empty array or undefined
      filesMetadata.push(...chatFormatterUtil.buildFilesMetadata(files));
    }
    const existingMessagesForRequest =
      await chatRepository.getMessagesByRequestId(sessionId, userId, requestId);
    const existingAssistantMessage = existingMessagesForRequest.find(
      (message) => message.role === "assistant"
    );

    if (existingAssistantMessage) {
      return {
        idempotencyMatch: {
          response: {
            citations: existingAssistantMessage?.metadata?.citations || [],
            content: existingAssistantMessage.content || "",
            functionExecution:
              existingAssistantMessage?.metadata?.functionExecution || [],
            functions: existingAssistantMessage?.metadata?.functions || [],
            model: payload.model,
            provider: existingAssistantMessage.provider || null,
            role: "assistant",
          },
          sessionId,
        },
      };
    }

    const hasPersistedUserMessage = existingMessagesForRequest.some(
      (message) => message.role === "user"
    );
    if (!hasPersistedUserMessage) {
      await chatRepository.saveMessageIdempotent({
        agentId: payload.agentId,
        allowEdit: payload.allowEdit,
        content: payload.message,
        metadata: {
          agentId: payload.agentId,
          allowEdit: payload.allowEdit,
          context: payload.context,
          files: filesMetadata,
          noteIds: payload.noteIds,
          parentToolCallId: payload.parentToolCallId,
          projectIds: payload.projectIds,
          useCase: payload.useCase,
        },
        model: `${payload.model.name}:${payload.model.version}`,
        organizationId,
        requestId,
        role: "user",
        sessionId,
        status: "ok",
        userId,
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
          isSubAgent: Boolean(payload.isSubAgent),
          noteId: resolvedNoteIds.length > 0 ? resolvedNoteIds[0] : null,
          organizationId,
          planUsageContext,
          projectId:
            resolvedProjectIds.length > 0 ? resolvedProjectIds[0] : null,
        },
        userId,
      });
      authorizedFunctions = Array.isArray(authorization?.functions)
        ? authorization.functions
        : [];
      capabilityRules = authorization?.capabilityRules || {};
      resourceAccess = authorization?.access || {};
    } catch {
      authorizedFunctions = [];
    }

    return {
      authorizedFunctions,
      capabilityRules,
      conversationHistory,
      resolvedNoteIds,
      resolvedProjectIds,
      resourceAccess,
      selectedAgent,
      sessionId,
      usageRecord,
    };
  }
}

module.exports = new ChatContextService();
