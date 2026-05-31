/* eslint-disable no-console, sort-keys */
const { randomUUID } = require("crypto");
const chatRepository = require("@/modules/weave-ai/repositories/chat.repository");
const agentsRepository = require("@/modules/weave-ai/repositories/agents.repository");
const { getProvidersWithModels } = require("@/modules/weave-ai/llm-catalog");
const notesRepository = require("@/modules/notes/notes.repository");
const {
  ALLOWED_BLOCK_TYPES,
  normalizeBlocksTree,
  newBlockId,
} = require("@/modules/notes/block-normalizer");
const { enqueueNoteEmbeddingJob } = require("@/services/queue/queue-controller");
const PlansRepository = require("@/modules/plans/plans.repository");
const PlanUsageManager = require("@/modules/plans/plans.controller");
const { sendPlanLimitExceeded } = require("@/utils/plan-limit-http");
const { PLAN_PATHS, USAGE_PATHS } = require("@/services/plans/plan-paths");
const projectsUpdateRepository = require("@/modules/projects/repositories/projects-update.repository");
const projectsReadRepository = require("@/modules/projects/repositories/projects-read.repository");
const {
  PROJECT_WRITE_CAPABLE_ROLES,
} = require("@/modules/projects/project-role-policy");
const { resolveAuthorizedFunctions } = require("@/modules/weave-ai/authorized-functions");
const engineRpcRedis = require("@/services/queue/engine-rpc-connection");
const {
  getEngineLlmRequestQueueRedisKey,
  getEngineLlmResponsePrefixRedisKey,
} = require("@/services/queue/queue-keys");
const { NOTE_STATUS } = require("@/utils/patterns/product-patterns");
const workspaceUserScopeRepository = require("@/modules/users/repositories/workspace-user-scope.repository");
const { WORKSPACE_SHARE_DENIED } = require("@/utils/workspace-share-guard");
const {
  resolveNoteIdToUuid,
  resolveNoteIdsToUuids,
} = require("@/utils/note-id-lookup");
const { resolveProjectIdsToUuids } = require("@/utils/project-id-lookup");
const { fromUnknown } = require("@/errors");

const ENGINE_CHAT_TIMEOUT_SECONDS = Number.parseInt(
  process.env.WEAVE_ENGINE_CHAT_TIMEOUT_SECONDS || "75",
  10
);
const CHAT_CONTEXT_MAX_MESSAGES = Number.parseInt(
  process.env.WEAVE_CHAT_CONTEXT_MAX_MESSAGES || "20",
  10
);
const CHAT_CONTEXT_MAX_MESSAGE_CHARS = Number.parseInt(
  process.env.WEAVE_CHAT_CONTEXT_MAX_MESSAGE_CHARS || "1500",
  10
);
const REQUEST_ID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * @typedef {Object} ChatModelInput
 * @property {string} name
 * @property {string} version
 */

/**
 * @typedef {Object} ParsedChatPayload
 * @property {string} message
 * @property {ChatModelInput} model
 * @property {boolean} allowEdit
 * @property {string[]|null} noteIds
 * @property {string[]|null} projectIds
 * @property {string|null} agentId
 * @property {string|null} sessionId
 * @property {string|null} requestId
 * @property {string|null} useCase
 * @property {Record<string, unknown>|null} context
 */

class ChatController {
  /**
   * Validates authenticated user and returns user id.
   *
   * @param {import("express").Request} req
   * @returns {string}
   */
  _validateAuthentication(req) {
    const userId = req.user?.userId;
    if (!userId) {
      const error = new Error("Usuário não autenticado");
      error.code = "CHAT_UNAUTHENTICATED";
      error.statusCode = 401;
      throw error;
    }
    return userId;
  }

  /**
   * Parses boolean values that can arrive as string in multipart requests.
   *
   * @param {unknown} value
   * @param {boolean} fallback
   * @returns {boolean}
   */
  _parseBoolean(value, fallback = false) {
    if (typeof value === "boolean") {
      return value;
    }

    if (typeof value === "string") {
      if (value.toLowerCase() === "true") {
        return true;
      }
      if (value.toLowerCase() === "false") {
        return false;
      }
    }

    return fallback;
  }

  /**
   * Parses nullable arrays from body payloads.
   *
   * @param {unknown} value
   * @param {string} fieldName
   * @returns {string[]|null}
   */
  _parseNullableStringArray(value, fieldName) {
    if (value === undefined || value === null || value === "") {
      return null;
    }

    if (typeof value === "string") {
      if (value.toLowerCase() === "null") {
        return null;
      }

      try {
        const parsed = JSON.parse(value);
        if (parsed === null) {
          return null;
        }
        if (Array.isArray(parsed) && parsed.every((item) => typeof item === "string")) {
          return parsed;
        }
      } catch {
        // Keep parsing below for non-JSON strings.
      }
    }

    if (Array.isArray(value) && value.every((item) => typeof item === "string")) {
      return value;
    }

    const parseError = new Error(`Campo "${fieldName}" deve ser array de strings ou null`);
    parseError.code = "CHAT_INVALID_ARRAY_FIELD";
    parseError.statusCode = 400;
    throw parseError;
  }

  /**
   * Parses nullable object values from body payloads.
   *
   * @param {unknown} value
   * @param {string} fieldName
   * @returns {Record<string, unknown>|null}
   */
  _parseNullableObject(value, fieldName) {
    if (value === undefined || value === null || value === "") {
      return null;
    }

    let parsed = value;
    if (typeof value === "string") {
      if (value.toLowerCase() === "null") {
        return null;
      }

      try {
        parsed = JSON.parse(value);
      } catch {
        const parseError = new Error(`Campo "${fieldName}" deve ser um objeto JSON válido`);
        parseError.code = "CHAT_INVALID_OBJECT_FIELD";
        parseError.statusCode = 400;
        throw parseError;
      }
    }

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      const parseError = new Error(`Campo "${fieldName}" deve ser objeto ou null`);
      parseError.code = "CHAT_INVALID_OBJECT_FIELD";
      parseError.statusCode = 400;
      throw parseError;
    }

    return parsed;
  }

  /**
   * Parses and validates model payload.
   *
   * @param {unknown} value
   * @returns {ChatModelInput}
   */
  _parseModel(value) {
    let model = value;
    if (typeof model === "string") {
      try {
        model = JSON.parse(model);
      } catch {
        const parseError = new Error("Campo \"model\" inválido");
        parseError.code = "CHAT_INVALID_MODEL";
        parseError.statusCode = 400;
        throw parseError;
      }
    }

    const isValidModel =
      model &&
      typeof model === "object" &&
      typeof model.name === "string" &&
      model.name.trim() &&
      typeof model.version === "string" &&
      model.version.trim();

    if (!isValidModel) {
      const validationError = new Error(
        "Campo \"model\" deve conter \"name\" e \"version\" válidos"
      );
      validationError.code = "CHAT_INVALID_MODEL";
      validationError.statusCode = 400;
      throw validationError;
    }

    return {
      name: model.name.trim(),
      version: model.version.trim(),
    };
  }

  /**
   * Normalizes and validates chat payload.
   *
   * @param {import("express").Request} req
   * @returns {ParsedChatPayload}
   */
  _parseChatPayload(req) {
    const {
      message,
      model,
      allowEdit,
      allowWebSearch,
      noteIds,
      projectIds,
      agentId,
      sessionId,
      requestId,
      useCase,
      context,
    } = req.body;

    if (typeof message !== "string" || !message.trim()) {
      const error = new Error("Campo \"message\" é obrigatório");
      error.code = "CHAT_MESSAGE_REQUIRED";
      error.statusCode = 400;
      throw error;
    }

    const parsedModel = this._parseModel(model);
    const parsedAgentId =
      agentId === undefined || agentId === null || agentId === "" || agentId === "null"
        ? null
        : String(agentId);
    const parsedSessionId =
      sessionId === undefined || sessionId === null || sessionId === "" || sessionId === "null"
        ? null
        : String(sessionId);
    const parsedRequestId =
      requestId === undefined || requestId === null || requestId === "" || requestId === "null"
        ? null
        : String(requestId).trim();
    if (parsedRequestId && !REQUEST_ID_REGEX.test(parsedRequestId)) {
      const requestError = new Error("Campo \"requestId\" deve ser um UUID válido");
      requestError.code = "CHAT_INVALID_REQUEST_ID";
      requestError.statusCode = 400;
      throw requestError;
    }
    const parsedUseCase =
      useCase === undefined || useCase === null || useCase === "" || useCase === "null"
        ? null
        : String(useCase).trim() || null;

    return {
      message: message.trim(),
      model: parsedModel,
      allowEdit: this._parseBoolean(allowEdit, true),
      allowWebSearch: this._parseBoolean(allowWebSearch, false),
      noteIds: this._parseNullableStringArray(noteIds, "noteIds"),
      projectIds: this._parseNullableStringArray(projectIds, "projectIds"),
      agentId: parsedAgentId,
      sessionId: parsedSessionId,
      requestId: parsedRequestId,
      useCase: parsedUseCase,
      context: this._parseNullableObject(context, "context"),
    };
  }

  /**
   * @param {string} userId
   * @param {string} noteId - Internal UUID or public_note_id
   * @param {string|null} organizationId
   * @returns {Promise<string>} Internal note UUID
   */
  async _assertNoteMutationAccess(userId, noteId, organizationId = null) {
    if (!noteId) {
      const error = new Error("noteId é obrigatório");
      error.code = "CHAT_NOTE_ID_REQUIRED";
      error.statusCode = 400;
      throw error;
    }

    const internalNoteId = await resolveNoteIdToUuid(noteId);
    if (!internalNoteId) {
      const error = new Error("Nota não encontrada");
      error.code = "CHAT_NOTE_NOT_FOUND";
      error.statusCode = 404;
      throw error;
    }

    const summary = await notesRepository.getNoteAccessSummary(internalNoteId);
    if (!summary) {
      const error = new Error("Nota não encontrada");
      error.code = "CHAT_NOTE_NOT_FOUND";
      error.statusCode = 404;
      throw error;
    }

    if (String(summary.user_id) === String(userId)) {
      return internalNoteId;
    }

    const isCollaborator = await notesRepository.isCollaborator(
      internalNoteId,
      userId
    );
    if (isCollaborator) {
      return internalNoteId;
    }

    if (organizationId && summary.project_id) {
      const scopedProjectRows = await projectsReadRepository.getProjectByIdWithOrgScope(
        summary.project_id,
        organizationId
      );
      if (Array.isArray(scopedProjectRows) && scopedProjectRows.length > 0) {
        return internalNoteId;
      }
    }

    const deniedError = new Error("Sem permissão para modificar esta nota");
    deniedError.code = "CHAT_NOTE_ACCESS_DENIED";
    deniedError.statusCode = 403;
    throw deniedError;
  }

  /**
   * @param {string} userId
   * @param {string} projectId
   * @param {string|null} organizationId
   * @returns {Promise<void>}
   */
  async _assertProjectMutationAccess(userId, projectId, organizationId = null) {
    if (!projectId) {
      const error = new Error("projectId é obrigatório");
      error.code = "CHAT_PROJECT_ID_REQUIRED";
      error.statusCode = 400;
      throw error;
    }

    if (organizationId) {
      const scopedProjectRows = await projectsReadRepository.getProjectByIdWithOrgScope(
        projectId,
        organizationId
      );
      if (Array.isArray(scopedProjectRows) && scopedProjectRows.length > 0) {
        return;
      }
    }

    const ownerProjectRows = await projectsReadRepository.getProjectById(projectId, userId);
    if (Array.isArray(ownerProjectRows) && ownerProjectRows.length > 0) {
      return;
    }

    const collaboratorRole = await projectsReadRepository.getProjectMemberRole(projectId, userId);
    if (
      collaboratorRole &&
      PROJECT_WRITE_CAPABLE_ROLES.includes(String(collaboratorRole).toUpperCase())
    ) {
      return;
    }

    const deniedError = new Error("Sem permissão para modificar este projeto");
    deniedError.code = "CHAT_PROJECT_ACCESS_DENIED";
    deniedError.statusCode = 403;
    throw deniedError;
  }

  /**
   * Converts uploaded files to serializable metadata.
   *
   * @param {Array<import("multer").File>} files
   * @returns {Array<Record<string, unknown>>}
   */
  _buildFilesMetadata(files) {
    if (!Array.isArray(files) || files.length === 0) {
      return [];
    }

    return files.map((file) => ({
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
    }));
  }

  /**
   * Converts uploaded files to payload accepted by engine chat-v2 processor.
   *
   * @param {Array<import("multer").File>} files
   * @returns {Array<{name: string, mimeType: string, sizeBytes: number, base64Data: string}>}
   */
  _buildEngineFilesPayload(files) {
    if (!Array.isArray(files) || files.length === 0) {
      return [];
    }

    return files.map((file) => ({
      base64Data: Buffer.isBuffer(file.buffer) ? file.buffer.toString("base64") : "",
      mimeType: file.mimetype || "application/octet-stream",
      name: file.originalname || "file",
      sizeBytes: Number(file.size || 0),
    }));
  }

  /**
   * Normalizes persisted messages into compact conversation history.
   *
   * @param {Array<{role?: string, content?: string, model?: string, created_at?: string}>} messages
   * @returns {Array<{role: "user"|"assistant", content: string, model: string|null, createdAt: string|null}>}
   */
  _normalizeConversationHistory(messages = []) {
    if (!Array.isArray(messages) || messages.length === 0) {
      return [];
    }

    return messages
      .map((message) => {
        const role = message?.role === "assistant" ? "assistant" : "user";
        const rawContent = typeof message?.content === "string" ? message.content.trim() : "";
        if (!rawContent) {
          return null;
        }

        const content =
          rawContent.length > CHAT_CONTEXT_MAX_MESSAGE_CHARS
            ? `${rawContent.slice(0, CHAT_CONTEXT_MAX_MESSAGE_CHARS)}...`
            : rawContent;

        return {
          content,
          createdAt: message?.created_at || null,
          model: typeof message?.model === "string" ? message.model : null,
          role,
        };
      })
      .filter(Boolean);
  }

  /**
   * Resolves model string expected by engine provider client.
   *
   * @param {ChatModelInput} model
   * @returns {string}
   */
  _resolveModelForEngine(model) {
    if (model.version && model.version.trim()) {
      return model.version.trim();
    }
    return model.name.trim();
  }

  /**
   * Builds a short session title from the first user message (fits ai_chat_sessions.title).
   *
   * @param {string} message
   * @returns {string}
   */
  _deriveSessionTitleFromMessage(message) {
    if (typeof message !== "string") {
      return "";
    }
    const trimmed = message.trim();
    if (!trimmed) {
      return "";
    }
    const lines = trimmed.split(/\r?\n/);
    const firstLine =
      lines.find((line) => typeof line === "string" && line.trim().length > 0)?.trim() || trimmed;
    const collapsed = firstLine.replace(/\s+/g, " ").trim();
    if (!collapsed) {
      return "";
    }
    return collapsed.length > 255 ? collapsed.slice(0, 255) : collapsed;
  }

  /**
   * Sends chat payload to engine queue and awaits response.
   *
   * @param {object} payload
   * @returns {Promise<object>}
   */
  async _requestEngineChat(payload, requestId = randomUUID()) {
    const startedAt = Date.now();
    const requestQueueKey = getEngineLlmRequestQueueRedisKey();
    const responseQueueKey = `${getEngineLlmResponsePrefixRedisKey()}:${requestId}`;
    const job = {
      attempts: 0,
      createdAt: new Date().toISOString(),
      payload,
      requestId,
      responseQueueKey,
      taskType: "chat_v2_process",
    };

    await engineRpcRedis.lpush(requestQueueKey, JSON.stringify(job));

    const queueResult = await engineRpcRedis.blpop(responseQueueKey, ENGINE_CHAT_TIMEOUT_SECONDS);
    if (!queueResult) {
      await engineRpcRedis.del(responseQueueKey);
      const timeoutError = new Error("Tempo limite ao aguardar resposta do Weave Engine");
      timeoutError.code = "ENGINE_TIMEOUT";
      timeoutError.requestId = requestId;
      timeoutError.statusCode = 504;
      throw timeoutError;
    }

    const [, rawResponsePayload] = queueResult;
    await engineRpcRedis.del(responseQueueKey);

    let parsedResponse;
    try {
      parsedResponse = JSON.parse(rawResponsePayload);
    } catch {
      const parseError = new Error("Resposta inválida recebida do Weave Engine");
      parseError.code = "ENGINE_INVALID_RESPONSE";
      parseError.statusCode = 502;
      throw parseError;
    }

    if (!parsedResponse?.success) {
      const engineErrorPayload = this._extractEngineErrorPayload(parsedResponse?.error);
      const engineError = new Error(engineErrorPayload.message);
      engineError.code = engineErrorPayload.code;
      engineError.statusCode = 502;
      throw engineError;
    }

    return {
      data: parsedResponse.data || {},
      latencyMs: Date.now() - startedAt,
      requestId,
    };
  }

  /**
   * @param {unknown} rawError
   * @returns {{ code: string, message: string }}
   */
  _extractEngineErrorPayload(rawError) {
    if (rawError && typeof rawError === "object") {
      return {
        code:
          typeof rawError.code === "string" && rawError.code
            ? rawError.code
            : "ENGINE_TASK_FAILED",
        message:
          typeof rawError.message === "string" && rawError.message
            ? rawError.message
            : "Falha ao processar no Weave Engine",
      };
    }

    if (typeof rawError === "string" && rawError.trim()) {
      return {
        code: "ENGINE_TASK_FAILED",
        message: rawError,
      };
    }

    return {
      code: "ENGINE_TASK_FAILED",
      message: "Falha ao processar no Weave Engine",
    };
  }

  /**
   * @param {unknown} error
   * @param {{ code: string, message: string, statusCode?: number }} fallback
   * @returns {{ code: string, message: string, statusCode: number }}
   */
  _normalizeApiError(error, fallback) {
    const mapped = fromUnknown(error, fallback.code);
    const isProduction = process.env.NODE_ENV === "production";

    if (
      isProduction ||
      !mapped.isOperational ||
      mapped.statusCode >= 500
    ) {
      return {
        code: fallback.code,
        message: fallback.message,
        statusCode: fallback.statusCode || 500,
      };
    }

    return {
      code: mapped.code || fallback.code,
      message: mapped.message || fallback.message,
      statusCode: mapped.statusCode || fallback.statusCode || 500,
    };
  }

  /**
   * @param {object} enginePayload
   * @returns {{ inputTokens: number|null, outputTokens: number|null, totalTokens: number|null }}
   */
  _extractTokenUsage(enginePayload = {}) {
    const usage = enginePayload?.data?.usage || enginePayload?.usage || {};
    const inputTokens =
      usage.inputTokens ||
      usage.input_tokens ||
      usage.promptTokens ||
      usage.prompt_tokens ||
      null;
    const outputTokens =
      usage.outputTokens ||
      usage.output_tokens ||
      usage.completionTokens ||
      usage.completion_tokens ||
      null;
    const totalTokens = usage.totalTokens || usage.total_tokens || null;

    return {
      inputTokens: Number.isFinite(Number(inputTokens)) ? Number(inputTokens) : null,
      outputTokens: Number.isFinite(Number(outputTokens)) ? Number(outputTokens) : null,
      totalTokens: Number.isFinite(Number(totalTokens)) ? Number(totalTokens) : null,
    };
  }

  /**
   * Contrato de blocos para o engine (substitui o documento ProseMirror monolítico).
   *
   * @returns {{ allowedBlockTypes: string[], version: number }}
   */
  _buildNoteBlocksContract() {
    return {
      allowedBlockTypes: [...ALLOWED_BLOCK_TYPES],
      version: 1,
    };
  }

  /**
   * Verifica se há texto não vazio em algum bloco da árvore.
   *
   * @param {unknown[]} blocksTree
   * @returns {boolean}
   */
  _blocksTreeHasMeaningfulText(blocksTree) {
    if (!Array.isArray(blocksTree)) return false;
    const stack = [...blocksTree];
    while (stack.length > 0) {
      const node = stack.pop();
      if (!node || typeof node !== "object") continue;
      const props =
        node.properties && typeof node.properties === "object"
          ? node.properties
          : {};
      const t =
        typeof node.text === "string"
          ? node.text
          : typeof props.text === "string"
            ? props.text
            : "";
      if (t.trim().length > 0) return true;
      if (Array.isArray(node.children) && node.children.length > 0) {
        stack.push(...node.children);
      }
    }
    return false;
  }

  /**
   * Reads nested property by dot notation.
   *
   * @param {Record<string, any>|null|undefined} source
   * @param {string} path
   * @returns {unknown}
   */
  _getNestedValue(source, path) {
    if (!source || typeof source !== "object" || !path) {
      return null;
    }

    return path.split(".").reduce((acc, key) => {
      if (!acc || typeof acc !== "object") {
        return null;
      }
      return acc[key];
    }, source);
  }

  /**
   * Builds compact plan usage context for Weave Engine prompts.
   *
   * @param {string} userId
   * @param {string|null} organizationId
   * @returns {Promise<Record<string, unknown>|null>}
   */
  async _buildPlanUsageContext(userId, organizationId = null) {
    try {
      const [effectivePlan, usageRecord] = await Promise.all([
        PlansRepository.getEffectivePlanByUserId(userId),
        PlansRepository.getPlanUsage(userId, organizationId),
      ]);

      if (!effectivePlan && !usageRecord) {
        return null;
      }

      const planDetails = effectivePlan?.plan_details || {};
      const usageDetails = usageRecord?.usage_details || {};

      const aiEnabled = Boolean(
        this._getNestedValue(planDetails, "weave_ai.enabled")
      );
      const monthlyMessagesLimit = this._getNestedValue(
        planDetails,
        "weave_ai.config.monthly_messages"
      );
      const monthlyMessagesUsed = this._getNestedValue(
        usageDetails,
        "monthly_cycle.weave_ai.messages_sent"
      );
      const monthlyTokensUsed = this._getNestedValue(
        usageDetails,
        "monthly_cycle.weave_ai.tokens_estimated"
      );

      return {
        plan: {
          id: effectivePlan?.plan_id || null,
          name: effectivePlan?.plan_name || null,
          subscriberType: effectivePlan?.subscriber_type || null,
        },
        usage: {
          periodEnd:
            this._getNestedValue(usageDetails, "monthly_cycle.current_period_end") || null,
          periodStart:
            this._getNestedValue(usageDetails, "monthly_cycle.current_period_start") || null,
          weaveAi: {
            aiEnabled,
            monthlyMessagesLimit:
              Number.isFinite(Number(monthlyMessagesLimit))
                ? Number(monthlyMessagesLimit)
                : null,
            monthlyMessagesUsed:
              Number.isFinite(Number(monthlyMessagesUsed))
                ? Number(monthlyMessagesUsed)
                : null,
            monthlyTokensUsed:
              Number.isFinite(Number(monthlyTokensUsed))
                ? Number(monthlyTokensUsed)
                : null,
          },
        },
      };
    } catch (error) {
      console.error("[weave-ai/chat] failed to fetch plan usage context", {
        code: error?.code || null,
        message: error?.message || String(error),
      });
      return null;
    }
  }

  /**
   * Execute a single authorized tool/function call.
   *
   * @param {string} userId
   * @param {{name: string, arguments?: Record<string, unknown>}} functionCall
   * @returns {Promise<{name: string, success: boolean, result?: object}>}
   */
  async _executeFunctionCall(userId, functionCall, organizationId = null) {
    const name = String(functionCall?.name || "");
    const args = functionCall?.arguments && typeof functionCall.arguments === "object"
      ? functionCall.arguments
      : {};

    switch (name) {
      case "create_note": {
        if (args.projectId) {
          await this._assertProjectMutationAccess(
            userId,
            String(args.projectId),
            organizationId
          );
        }

        const createdNote = await notesRepository.createNotesQuery(
          userId,
          args.title || "Nova Tarefa",
          args.content || "",
          Array.isArray(args.tags) ? args.tags : [],
          NOTE_STATUS.VISIBLE,
          args.projectId || null,
          args.priorityId || null
        );

        if (!createdNote || (!createdNote.id && !createdNote.note_id)) {
          throw new Error("Falha ao criar nota.");
        }

        const noteId = createdNote.id || createdNote.note_id;

        const updateData = {};
        if (args.projectId) {
          let resolvedStageId = args.stageId ? String(args.stageId) : null;
          if (!resolvedStageId) {
            resolvedStageId = await projectsReadRepository.getFirstProjectStageId(
              String(args.projectId)
            );
            if (!resolvedStageId) {
              throw new Error(
                "O projeto não possui estágios. Crie pelo menos um estágio antes de associar tarefas."
              );
            }
          } else {
            const stages = await projectsReadRepository.getProjectStages(
              String(args.projectId)
            );
            if (!stages.some((s) => String(s.id) === resolvedStageId)) {
              throw new Error("Estágio não encontrado para este projeto.");
            }
          }
          updateData.project_stage_id = resolvedStageId;
        }
        if (args.dueDate) {
          try {
            const normalizedDueDate = new Date(String(args.dueDate)).toISOString();
            updateData.due_date = normalizedDueDate;
          } catch (e) {
            // ignorar data invalida
          }
        }

        const propertiesUpdate = {};
        if (Array.isArray(args.urls) && args.urls.length > 0) propertiesUpdate.urls = args.urls;
        if (Array.isArray(args.files) && args.files.length > 0) propertiesUpdate.files = args.files;
        if (Array.isArray(args.relations) && args.relations.length > 0) propertiesUpdate.relations = args.relations;

        if (Object.keys(propertiesUpdate).length > 0) {
          updateData.properties = propertiesUpdate;
        }

        if (Object.keys(updateData).length > 0) {
          await notesRepository.updateNoteById(noteId, updateData);
        }

        if (Array.isArray(args.blocks) && args.blocks.length > 0) {
          const tree = normalizeBlocksTree(args.blocks);
          await notesRepository.bulkInsertNoteBlocks(noteId, userId, tree);
        } else if (typeof args.content === "string" && args.content.trim().length > 0) {
          await notesRepository.bulkInsertNoteBlocks(
            noteId,
            userId,
            normalizeBlocksTree([
              {
                id: newBlockId(),
                type: "paragraph",
                properties: { text: args.content },
              },
            ])
          );
        } else {
          await notesRepository.insertDefaultNoteBlock(noteId, userId);
        }
        await enqueueNoteEmbeddingJob(noteId).catch(() => {});

        if (Array.isArray(args.collaboratorIds) && args.collaboratorIds.length > 0) {
          for (const collabId of args.collaboratorIds) {
            if (collabId && typeof collabId === "string") {
              const mayShare = await workspaceUserScopeRepository.usersMayInteract(
                userId,
                collabId
              );
              if (!mayShare) {
                const err = new Error(WORKSPACE_SHARE_DENIED.message);
                err.statusCode = 403;
                err.code = "WORKSPACE_SHARE_DENIED";
                throw err;
              }
              await notesRepository.addCollaborator(noteId, collabId);
            }
          }
        }

        return { name, result: { noteId, created: true }, success: true };
      }
      case "update_note_title": {
        const noteId = await this._assertNoteMutationAccess(
          userId,
          String(args.noteId || ""),
          organizationId
        );
        const result = await notesRepository.updateNoteById(noteId, {
          title: args.title,
        });
        return { name, result: { noteId, updated: Boolean(result) }, success: true };
      }
      case "update_note_content": {
        const rawNoteId = String(args.noteId || "");
        if (!rawNoteId) {
          throw new Error("update_note_content requer noteId");
        }
        const noteId = await this._assertNoteMutationAccess(
          userId,
          rawNoteId,
          organizationId
        );

        let tree;
        if (Array.isArray(args.blocks) && args.blocks.length > 0) {
          tree = normalizeBlocksTree(args.blocks);
        } else if (typeof args.content === "string" && args.content.trim().length > 0) {
          tree = [
            {
              id: newBlockId(),
              type: "paragraph",
              properties: { text: args.content },
            },
          ];
        } else {
          const error = new Error(
            "update_note_content requer content (string) ou blocks (array) não vazio"
          );
          error.code = "CHAT_FUNCTION_INVALID_CONTENT";
          error.statusCode = 400;
          throw error;
        }

        if (!this._blocksTreeHasMeaningfulText(tree)) {
          const error = new Error(
            "update_note_content requer conteúdo textual não vazio"
          );
          error.code = "CHAT_FUNCTION_INVALID_CONTENT";
          error.statusCode = 400;
          throw error;
        }

        await notesRepository.deleteAllNoteBlocks(noteId);
        await notesRepository.bulkInsertNoteBlocks(noteId, userId, tree);
        await enqueueNoteEmbeddingJob(noteId).catch(() => {});

        return {
          name,
          result: { noteId, updated: true },
          success: true,
        };
      }
      case "update_note_stage": {
        const noteId = await this._assertNoteMutationAccess(
          userId,
          String(args.noteId || ""),
          organizationId
        );
        const note = await notesRepository.getNoteById(noteId);
        if (!note?.project_id) {
          throw new Error(
            "A nota não está associada a um projeto. Associe a nota a um projeto antes de alterar o estágio."
          );
        }
        const projectId = String(note.project_id);
        const parsedStageId =
          args.stageId === undefined || args.stageId === null || args.stageId === ""
            ? null
            : String(args.stageId);
        if (!parsedStageId) {
          throw new Error(
            "Estágio é obrigatório. Informe um stageId válido para esta tarefa."
          );
        }
        const stages = await projectsReadRepository.getProjectStages(projectId);
        if (!stages.some((s) => String(s.id) === parsedStageId)) {
          throw new Error("Estágio não encontrado para este projeto.");
        }
        const result = await notesRepository.updateNoteById(noteId, {
          project_stage_id: parsedStageId,
        });
        return { name, result: { noteId, updated: Boolean(result) }, success: true };
      }
      case "update_note_priority": {
        const noteId = await this._assertNoteMutationAccess(
          userId,
          String(args.noteId || ""),
          organizationId
        );
        const result = await notesRepository.updateNoteById(noteId, {
          priority_id: args.priorityId || null,
        });
        return { name, result: { noteId, updated: Boolean(result) }, success: true };
      }
      case "update_note_due_date": {
        const noteId = await this._assertNoteMutationAccess(
          userId,
          String(args.noteId || ""),
          organizationId
        );
        const normalizedDueDate = args.dueDate ? new Date(String(args.dueDate)).toISOString() : null;
        const result = await notesRepository.updateNoteById(noteId, {
          due_date: normalizedDueDate,
        });
        return { name, result: { noteId, updated: Boolean(result) }, success: true };
      }
      case "update_note_tags": {
        const noteId = await this._assertNoteMutationAccess(
          userId,
          String(args.noteId || ""),
          organizationId
        );
        const tags = Array.isArray(args.tags) ? args.tags : [];
        const result = await notesRepository.updateNoteById(noteId, {
          tags,
        });
        return { name, result: { noteId, updated: Boolean(result) }, success: true };
      }
      case "update_note_collaborator_add": {
        const noteId = await this._assertNoteMutationAccess(
          userId,
          String(args.noteId || ""),
          organizationId
        );
        const collabUid = String(args.collaboratorUserId || "");
        if (!collabUid) {
          const error = new Error("update_note_collaborator_add requer collaboratorUserId");
          error.statusCode = 400;
          throw error;
        }
        const mayShare = await workspaceUserScopeRepository.usersMayInteract(
          userId,
          collabUid
        );
        if (!mayShare) {
          const err = new Error(WORKSPACE_SHARE_DENIED.message);
          err.statusCode = 403;
          err.code = "WORKSPACE_SHARE_DENIED";
          throw err;
        }
        const result = await notesRepository.addCollaborator(noteId, collabUid);
        return { name, result: { noteId, updated: Boolean(result) }, success: true };
      }
      case "update_note_collaborator_remove": {
        const noteId = await this._assertNoteMutationAccess(
          userId,
          String(args.noteId || ""),
          organizationId
        );
        const result = await notesRepository.removeCollaborator(
          noteId,
          args.collaboratorUserId
        );
        return {
          name,
          result: { noteId, rowCount: Number(result?.rowCount || 0) },
          success: true,
        };
      }
      case "update_project_title": {
        await this._assertProjectMutationAccess(
          userId,
          String(args.projectId || ""),
          organizationId
        );
        const result = await projectsUpdateRepository.updateProject(args.projectId, userId, {
          title: args.title,
        });
        return {
          name,
          result: { projectId: args.projectId, updated: Array.isArray(result) && result.length > 0 },
          success: true,
        };
      }
      case "search_users": {
        const searchTerm = String(args.searchTerm || "").trim();
        if (!searchTerm) {
          throw new Error("search_users requer searchTerm");
        }
        const searchUsersRepository = require("@/modules/users/repositories/search-users.repository");
        const users = await searchUsersRepository.searchUsers(searchTerm, userId);
        return {
          name,
          result: { users: users.map(u => ({ id: u.user_id, name: u.name, username: u.username, email: u.email })) },
          success: true,
        };
      }
      case "search_projects": {
        const searchTerm = String(args.searchTerm || "").trim();
        if (!searchTerm) {
          throw new Error("search_projects requer searchTerm");
        }
        
        const scope = organizationId 
          ? { mode: "organization", organizationId } 
          : { mode: "user", userId };
          
        const { rows } = await projectsReadRepository.getAllProjectsFiltered(
          scope,
          { search: searchTerm },
          { limit: 10, offset: 0 },
          { field: "created_at", order: "desc" },
          { collaborators: false, notes: false, subprojects: false },
          userId
        );
        
        return {
          name,
          result: { projects: rows.map(p => ({ id: p.id, public_id: p.public_project_id, title: p.title, status: p.status })) },
          success: true,
        };
      }
      default: {
        const error = new Error(`Função não suportada para execução: ${name}`);
        error.code = "CHAT_FUNCTION_NOT_SUPPORTED";
        error.statusCode = 400;
        throw error;
      }
    }
  }

  /**
   * Executes all function calls from engine response.
   *
   * @param {string} userId
   * @param {Array<{name: string, arguments?: Record<string, unknown>}>} functionCalls
   * @returns {Promise<Array<object>>}
   */
  async _executeFunctionCalls(userId, functionCalls = [], organizationId = null) {
    const results = [];
    for (const functionCall of functionCalls) {
      const execution = await this._executeFunctionCall(
        userId,
        functionCall,
        organizationId
      );
      results.push(execution);
    }
    return results;
  }

  /**
   * Handles user chat message ingestion and persistence.
   *
   * @param {import("express").Request} req
   * @param {import("express").Response} res
   * @returns {Promise<void>}
   */
  async chat(req, res) {
    try {
      const userId = this._validateAuthentication(req);
      const payload = this._parseChatPayload(req);
      const organizationId = req.user?.organizationId || null;
      const userLanguage = req.user?.language || req.user?.userLanguage || null;
      const requestId = payload.requestId || randomUUID();
      let selectedAgent = null;
      let authorizedFunctions = [];
      let capabilityRules = {};
      let resourceAccess = {};
      const planUsageContext = await this._buildPlanUsageContext(userId, organizationId);

      const usageRecord = await PlanUsageManager.managePlanUsage(userId, organizationId).catch(() => null);
      if (usageRecord && planUsageContext) {
        const effectivePlan = await PlansRepository.getEffectivePlanByUserId(userId);
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
              message: "Monthly AI message limit reached for your current plan.",
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
              message: "Agente não encontrado para o usuário",
            },
          });
        }
      }

      let sessionId = payload.sessionId;
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
              message: "Sessão não encontrada para o usuário",
            },
          });
        }
      } else {
        const session = await chatRepository.createSession(userId);
        sessionId = session.id;
      }

      const rawConversationHistory = await chatRepository.getSessionMessagesForContext(
        sessionId,
        userId,
        CHAT_CONTEXT_MAX_MESSAGES
      );
      const conversationHistory = this._normalizeConversationHistory(rawConversationHistory);

      const filesMetadata = this._buildFilesMetadata(req.files);
      const existingMessagesForRequest = await chatRepository.getMessagesByRequestId(
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
        const derivedTitle = this._deriveSessionTitleFromMessage(payload.message);
        if (derivedTitle) {
          await chatRepository.updateSessionTitle(sessionId, userId, derivedTitle);
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
          description: "Ask the user for confirmation or clarification before proceeding with an action.",
          parameters: {
            type: "object",
            properties: {
              question: {
                type: "string",
                description: "The clear and friendly question or confirmation message to present to the user."
              },
              options: {
                type: "array",
                items: {
                  type: "string"
                },
                description: "An array of possible answers/choices the user can select (e.g. ['Yes, delete it', 'No, cancel'])."
              }
            },
            required: ["question"]
          }
        });
        
        capabilityRules = authorization?.capabilityRules || {};
        resourceAccess = authorization?.access || {};
      } catch {
        authorizedFunctions = [];
      }

      const engineResponse = await this._requestEngineChat({
        agent: selectedAgent,
        allowEdit: payload.allowEdit,
        allowWebSearch: payload.allowWebSearch,
        context: {
          capabilityRules,
          clientContext: payload.context,
          noteBlocksContract: this._buildNoteBlocksContract(),
          noteDocumentContract: this._buildNoteBlocksContract(),
          organizationId,
          resourceAccess,
          useCase: payload.useCase,
          userLanguage,
        },
        files: this._buildEngineFilesPayload(req.files),
        functions: authorizedFunctions,
        message: payload.message,
        model: this._resolveModelForEngine(payload.model),
        noteIds: resolvedNoteIds,
        organizationId,
        projectIds: resolvedProjectIds,
        conversationHistory,
        sessionId,
        user_id: userId,
        userId,
        ...(organizationId ? { org_id: organizationId } : {}),
        userLanguage,
      }, requestId);
      const enginePayload = engineResponse?.data || {};

      const assistantText =
        enginePayload?.data?.response ||
        enginePayload?.data?.text ||
        enginePayload?.data?.content ||
        "";
      const responseFunctions = Array.isArray(enginePayload?.functions)
        ? enginePayload.functions
        : [];
        
      const askUserInputCall = responseFunctions.find((f) => f.name === "ask_user_input");
      let functionExecution = [];
      let messageStatus = "ok";
      
      if (askUserInputCall) {
        messageStatus = "requires_input";
      } else if (responseFunctions.length > 0) {
        messageStatus = "function_call";
        functionExecution = await this._executeFunctionCalls(userId, responseFunctions, organizationId);
      }
      
      const fallbackText =
        askUserInputCall
          ? askUserInputCall.arguments?.question || "Awaiting your input..."
          : functionExecution.length > 0
            ? "Solicitacao executada com sucesso."
            : responseFunctions.length > 0
              ? "Solicitacao entendida. Recebi uma chamada de funcao, mas nao houve alteracoes executadas."
            : "Solicitacao recebida, mas o modelo nao retornou conteudo textual.";
      const finalAssistantText = assistantText || fallbackText;
      const providerUsed = enginePayload?.providerUsed || null;
      const tokenUsage = this._extractTokenUsage(enginePayload);
      
      const messageMetadata = {
        citations: enginePayload?.data?.citations || [],
        functionExecution,
        functions: responseFunctions,
        providerUsed,
        requestId,
      };
      
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
        latencyMs: engineResponse?.latencyMs || null,
        inputTokens: tokenUsage.inputTokens,
        outputTokens: tokenUsage.outputTokens,
        totalTokens: tokenUsage.totalTokens,
        agentId: payload.agentId,
        allowEdit: payload.allowEdit,
        metadata: messageMetadata,
      });

      if (usageRecord?.id) {
        PlanUsageManager.consumeAiMessage(usageRecord.id, tokenUsage.totalTokens || 0).catch((err) => {
          console.error("[weave-ai/chat] failed to enqueue AI usage consumption", {
            usageId: usageRecord.id,
            error: err?.message || String(err),
          });
        });
      }

      return res.json({
        success: true,
        sessionId,
        response: {
          role: "assistant",
          content: finalAssistantText,
          citations: enginePayload?.data?.citations || [],
          functionExecution,
          functions: responseFunctions,
          model: payload.model,
          provider: providerUsed,
        },
      });
    } catch (error) {
      const normalizedError = this._normalizeApiError(error, {
        code: "CHAT_PROCESSING_FAILED",
        message: "Failed to process chat request",
        statusCode: 500,
      });
      const cause = error?.cause;
      const causeSummary =
        cause instanceof Error
          ? { name: cause.name, message: cause.message, code: cause.code }
          : cause != null && typeof cause === "object"
            ? { message: String(cause.message || cause) }
            : cause != null
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
          null,
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
   * Returns user chat history. If sessionId is provided, returns messages.
   *
   * @param {import("express").Request} req
   * @param {import("express").Response} res
   * @returns {Promise<void>}
   */
  async getChatHistory(req, res) {
    try {
      const userId = this._validateAuthentication(req);
      const { sessionId } = req.query;
      const parsedLimit = Number.parseInt(String(req.query.limit || "10"), 10);
      const limit = Number.isNaN(parsedLimit) || parsedLimit <= 0 ? 10 : parsedLimit;
      const parsedOffset = Number.parseInt(String(req.query.offset || "0"), 10);
      const offset = Number.isNaN(parsedOffset) || parsedOffset < 0 ? 0 : parsedOffset;

      if (sessionId) {
        const messages = await chatRepository.getSessionMessages(String(sessionId), userId);
        return res.json({
          success: true,
          sessionId: String(sessionId),
          messages,
        });
      }

      const sessions = await chatRepository.getUserSessions(userId, limit, offset);
      return res.json({
        success: true,
        sessions,
      });
    } catch (error) {
      const normalizedError = this._normalizeApiError(error, {
        code: "CHAT_HISTORY_FETCH_FAILED",
        message: "Failed to fetch chat history",
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
   * @param {import("express").Request} req
   * @param {import("express").Response} res
   * @returns {Promise<void>}
   */
  async deleteChatSession(req, res) {
    try {
      const userId = this._validateAuthentication(req);
      const sessionId = String(req.params?.sessionId || "").trim();

      if (!sessionId) {
        return res.status(400).json({
          success: false,
          error: {
            code: "CHAT_SESSION_ID_REQUIRED",
            message: "ID da sessão é obrigatório",
          },
        });
      }

      const deleted = await chatRepository.deleteSession(sessionId, userId);
      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: {
            code: "CHAT_SESSION_NOT_FOUND",
            message: "Sessão não encontrada para o usuário",
          },
        });
      }

      return res.status(200).json({
        success: true,
        sessionId,
      });
    } catch (error) {
      const normalizedError = this._normalizeApiError(error, {
        code: "CHAT_SESSION_DELETE_FAILED",
        message: "Failed to delete chat session",
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
   * @param {import("express").Request} req
   * @param {import("express").Response} res
   * @returns {void}
   */
  getAvailableModels(req, res) {
    try {
      this._validateAuthentication(req);
      const providers = getProvidersWithModels();

      return res.json({
        success: true,
        providers,
      });
    } catch (error) {
      const normalizedError = this._normalizeApiError(error, {
        code: "CHAT_MODELS_FETCH_FAILED",
        message: "Failed to fetch available models",
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
