/* eslint-disable no-console, sort-keys */
const { randomUUID } = require("crypto");
const chatRepository = require("@/modules/weave-ai/repositories/chat.repository");
const agentsRepository = require("@/modules/weave-ai/repositories/agents.repository");
const { getProvidersWithModels } = require("@/modules/weave-ai/llm-catalog");
const notesRepository = require("@/modules/notes/notes.repository");
const { blocksToDocument } = require("@/modules/notes/document-blocks-adapter");
const {
  ALLOWED_NOTE_DOCUMENT_MARKS,
  ALLOWED_NOTE_DOCUMENT_NODES,
  normalizeNoteDocumentPayload,
} = require("@/modules/notes/document-normalizer");
const PlansRepository = require("@/modules/plans/plans.repository");
const projectsUpdateRepository = require("@/modules/projects/repositories/projects-update.repository");
const { resolveAuthorizedFunctions } = require("@/modules/weave-ai/authorized-functions");
const redis = require("@/services/queue/connection");
const {
  getEngineLlmRequestQueueRedisKey,
  getEngineLlmResponsePrefixRedisKey,
} = require("@/services/queue/queue-keys");
const { NOTE_STATUS } = require("@/utils/patterns/product-patterns");

const ENGINE_CHAT_TIMEOUT_SECONDS = Number.parseInt(
  process.env.WEAVE_ENGINE_CHAT_TIMEOUT_SECONDS || "45",
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
    const { message, model, allowEdit, allowWebSearch, noteIds, projectIds, agentId, sessionId } = req.body;

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

    return {
      message: message.trim(),
      model: parsedModel,
      allowEdit: this._parseBoolean(allowEdit, true),
      allowWebSearch: this._parseBoolean(allowWebSearch, false),
      noteIds: this._parseNullableStringArray(noteIds, "noteIds"),
      projectIds: this._parseNullableStringArray(projectIds, "projectIds"),
      agentId: parsedAgentId,
      sessionId: parsedSessionId,
    };
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
      payload,
      requestId,
      responseQueueKey,
      taskType: "chat_v2_process",
    };

    await redis.lpush(requestQueueKey, JSON.stringify(job));

    const queueResult = await redis.blpop(responseQueueKey, ENGINE_CHAT_TIMEOUT_SECONDS);
    if (!queueResult) {
      await redis.del(responseQueueKey);
      const timeoutError = new Error("Tempo limite ao aguardar resposta do Weave Engine");
      timeoutError.code = "ENGINE_TIMEOUT";
      timeoutError.statusCode = 504;
      throw timeoutError;
    }

    const [, rawResponsePayload] = queueResult;
    await redis.del(responseQueueKey);

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
    return {
      code:
        typeof error?.code === "string" && error.code
          ? error.code
          : fallback.code,
      message:
        typeof error?.message === "string" && error.message
          ? error.message
          : fallback.message,
      statusCode:
        typeof error?.statusCode === "number" && error.statusCode
          ? error.statusCode
          : fallback.statusCode || 500,
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
   * Builds note document contract shared with the engine prompt.
   *
   * @returns {{ allowedNodeTypes: string[], allowedMarkTypes: string[], version: number }}
   */
  _buildNoteDocumentContract() {
    return {
      allowedMarkTypes: [...ALLOWED_NOTE_DOCUMENT_MARKS],
      allowedNodeTypes: [...ALLOWED_NOTE_DOCUMENT_NODES],
      version: 1,
    };
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
   * Accepts multiple document payload shapes and normalizes to the
   * canonical note document state before validation.
   *
   * @param {unknown} rawDocument
   * @returns {{ document: object, version: number }|null}
   */
  _coerceDocumentPayload(rawDocument) {
    if (!rawDocument) {
      return null;
    }

    let value = rawDocument;
    if (typeof value === "string") {
      try {
        value = JSON.parse(value);
      } catch {
        return null;
      }
    }

    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return null;
    }

    // Canonical shape already: { document: {...}, version }
    if (value.document && typeof value.document === "object") {
      return value;
    }

    // LLM may send root doc node directly: { type: "doc", content: [...] }
    if (value.type === "doc" && Array.isArray(value.content)) {
      return {
        document: value,
        version: 1,
      };
    }

    return null;
  }

  /**
   * Checks if document has meaningful text content.
   *
   * @param {unknown} node
   * @returns {boolean}
   */
  _hasMeaningfulText(node) {
    if (!node || typeof node !== "object") {
      return false;
    }

    if (node.type === "text" && typeof node.text === "string") {
      return node.text.trim().length > 0;
    }

    if (!Array.isArray(node.content)) {
      return false;
    }

    return node.content.some((child) => this._hasMeaningfulText(child));
  }

  /**
   * Execute a single authorized tool/function call.
   *
   * @param {string} userId
   * @param {{name: string, arguments?: Record<string, unknown>}} functionCall
   * @returns {Promise<{name: string, success: boolean, result?: object}>}
   */
  async _executeFunctionCall(userId, functionCall) {
    const name = String(functionCall?.name || "");
    const args = functionCall?.arguments && typeof functionCall.arguments === "object"
      ? functionCall.arguments
      : {};

    switch (name) {
      case "create_note": {
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
        if (args.stageId) updateData.project_stage_id = args.stageId;
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

        if (Array.isArray(args.collaboratorIds) && args.collaboratorIds.length > 0) {
          for (const collabId of args.collaboratorIds) {
            if (collabId && typeof collabId === "string") {
              await notesRepository.addCollaborator(noteId, collabId);
            }
          }
        }

        return { name, result: { noteId, created: true }, success: true };
      }
      case "update_note_title": {
        const result = await notesRepository.updateNoteById(args.noteId, {
          title: args.title,
        });
        return { name, result: { noteId: args.noteId, updated: Boolean(result) }, success: true };
      }
      case "update_note_content": {
        let nextDocument = null;

        const coercedDocument = this._coerceDocumentPayload(args.document);
        if (coercedDocument) {
          nextDocument = normalizeNoteDocumentPayload(coercedDocument);
        } else if (Array.isArray(args.blocks)) {
          nextDocument = normalizeNoteDocumentPayload(blocksToDocument(args.blocks));
        } else {
          const content = typeof args.content === "string" ? args.content : "";
          nextDocument = normalizeNoteDocumentPayload(
            blocksToDocument([
              {
                children: [],
                properties: {},
                text: content,
                type: "paragraph",
              },
            ])
          );
        }

        if (!this._hasMeaningfulText(nextDocument?.document)) {
          const error = new Error(
            "update_note_content requer conteúdo textual não vazio no document/blocks/content"
          );
          error.code = "CHAT_FUNCTION_INVALID_CONTENT";
          error.statusCode = 400;
          throw error;
        }

        const result = await notesRepository.updateNoteById(args.noteId, {
          document: nextDocument,
        });
        return { name, result: { noteId: args.noteId, updated: Boolean(result) }, success: true };
      }
      case "update_note_stage": {
        const result = await notesRepository.updateNoteById(args.noteId, {
          project_stage_id: args.stageId || null,
        });
        return { name, result: { noteId: args.noteId, updated: Boolean(result) }, success: true };
      }
      case "update_note_priority": {
        const result = await notesRepository.updateNoteById(args.noteId, {
          priority_id: args.priorityId || null,
        });
        return { name, result: { noteId: args.noteId, updated: Boolean(result) }, success: true };
      }
      case "update_note_due_date": {
        const normalizedDueDate = args.dueDate ? new Date(String(args.dueDate)).toISOString() : null;
        const result = await notesRepository.updateNoteById(args.noteId, {
          due_date: normalizedDueDate,
        });
        return { name, result: { noteId: args.noteId, updated: Boolean(result) }, success: true };
      }
      case "update_note_tags": {
        const tags = Array.isArray(args.tags) ? args.tags : [];
        const result = await notesRepository.updateNoteById(args.noteId, {
          tags,
        });
        return { name, result: { noteId: args.noteId, updated: Boolean(result) }, success: true };
      }
      case "update_note_collaborator_add": {
        const result = await notesRepository.addCollaborator(
          args.noteId,
          args.collaboratorUserId
        );
        return { name, result: { noteId: args.noteId, updated: Boolean(result) }, success: true };
      }
      case "update_note_collaborator_remove": {
        const result = await notesRepository.removeCollaborator(
          args.noteId,
          args.collaboratorUserId
        );
        return {
          name,
          result: { noteId: args.noteId, rowCount: Number(result?.rowCount || 0) },
          success: true,
        };
      }
      case "update_project_title": {
        const result = await projectsUpdateRepository.updateProject(args.projectId, userId, {
          title: args.title,
        });
        return {
          name,
          result: { projectId: args.projectId, updated: Array.isArray(result) && result.length > 0 },
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
  async _executeFunctionCalls(userId, functionCalls = []) {
    const results = [];
    for (const functionCall of functionCalls) {
      const execution = await this._executeFunctionCall(userId, functionCall);
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
      const requestId = randomUUID();
      let selectedAgent = null;
      let authorizedFunctions = [];
      let capabilityRules = {};
      let resourceAccess = {};
      const planUsageContext = await this._buildPlanUsageContext(userId, organizationId);

      if (payload.agentId) {
        selectedAgent = await agentsRepository.getAgentById(payload.agentId, userId);
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
      await chatRepository.saveMessage({
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
          noteIds: payload.noteIds,
          projectIds: payload.projectIds,
          files: filesMetadata,
          agentId: payload.agentId,
        },
      });

      try {
        const authorization = await resolveAuthorizedFunctions({
          allowEdit: payload.allowEdit,
          context: {
            planUsageContext,
            noteId: Array.isArray(payload.noteIds) && payload.noteIds.length > 0
              ? payload.noteIds[0]
              : null,
            projectId: Array.isArray(payload.projectIds) && payload.projectIds.length > 0
              ? payload.projectIds[0]
              : null,
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

      const engineResponse = await this._requestEngineChat({
        agent: selectedAgent,
        allowEdit: payload.allowEdit,
        allowWebSearch: payload.allowWebSearch,
        context: {
          capabilityRules,
          noteDocumentContract: this._buildNoteDocumentContract(),
          organizationId,
          resourceAccess,
          userLanguage,
        },
        files: this._buildEngineFilesPayload(req.files),
        functions: authorizedFunctions,
        message: payload.message,
        model: this._resolveModelForEngine(payload.model),
        noteIds: Array.isArray(payload.noteIds) ? payload.noteIds : [],
        organizationId,
        projectIds: Array.isArray(payload.projectIds) ? payload.projectIds : [],
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
      const functionExecution = responseFunctions.length > 0
        ? await this._executeFunctionCalls(userId, responseFunctions)
        : [];
      const fallbackText =
        functionExecution.length > 0
          ? "Solicitacao executada com sucesso."
          : responseFunctions.length > 0
            ? "Solicitacao entendida. Recebi uma chamada de funcao, mas nao houve alteracoes executadas."
          : "Solicitacao recebida, mas o modelo nao retornou conteudo textual.";
      const finalAssistantText = assistantText || fallbackText;
      const providerUsed = enginePayload?.providerUsed || null;
      const tokenUsage = this._extractTokenUsage(enginePayload);
      await chatRepository.saveMessage({
        sessionId,
        userId,
        role: "assistant",
        content: finalAssistantText,
        model: `${payload.model.name}:${payload.model.version}`,
        requestId,
        provider: providerUsed,
        status: responseFunctions.length > 0 ? "function_call" : "ok",
        latencyMs: engineResponse?.latencyMs || null,
        inputTokens: tokenUsage.inputTokens,
        outputTokens: tokenUsage.outputTokens,
        totalTokens: tokenUsage.totalTokens,
        agentId: payload.agentId,
        allowEdit: payload.allowEdit,
        metadata: {
          citations: enginePayload?.data?.citations || [],
          functionExecution,
          functions: responseFunctions,
          providerUsed,
          requestId,
        },
      });

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
        message: "Erro ao processar chat",
        statusCode: 500,
      });
      console.error("[weave-ai/chat] request failed", {
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
      const parsedLimit = Number.parseInt(String(req.query.limit || "50"), 10);
      const limit = Number.isNaN(parsedLimit) || parsedLimit <= 0 ? 50 : parsedLimit;

      if (sessionId) {
        const messages = await chatRepository.getSessionMessages(String(sessionId), userId);
        return res.json({
          success: true,
          sessionId: String(sessionId),
          messages,
        });
      }

      const sessions = await chatRepository.getUserSessions(userId, limit);
      return res.json({
        success: true,
        sessions,
      });
    } catch (error) {
      const normalizedError = this._normalizeApiError(error, {
        code: "CHAT_HISTORY_FETCH_FAILED",
        message: "Erro ao buscar histórico do chat",
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
        message: "Erro ao excluir sessão do chat",
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
        message: "Erro ao obter modelos disponíveis",
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
