/* eslint-disable sort-keys */
const { randomUUID } = require("crypto");
const chatRepository = require("@/modules/weave-ai/repositories/chat.repository");
const agentsRepository = require("@/modules/weave-ai/repositories/agents.repository");
const { resolveAuthorizedFunctions } = require("@/modules/weave-ai/authorized-functions");
const redis = require("@/services/queue/connection");
const {
  getEngineLlmRequestQueueRedisKey,
  getEngineLlmResponsePrefixRedisKey,
} = require("@/services/queue/queue-keys");

const LLM_PROVIDERS = {
  CLAUDE: "claude",
  GEMINI: "gemini",
  OPENAI: "openai",
  PERPLEXITY: "perplexity",
};

const LLM_MODELS = {
  [LLM_PROVIDERS.PERPLEXITY]: {
    DEFAULT: "sonar-pro",
    LEGACY: "pplx-online",
    REASONING: "sonar-reasoning-pro",
  },
  [LLM_PROVIDERS.OPENAI]: {
    DEFAULT: "gpt-5.4",
    LEGACY: "gpt-4o",
    LIGHT: "gpt-4o-mini",
    REASONING: "o3-mini",
  },
  [LLM_PROVIDERS.GEMINI]: {
    DEFAULT: "gemini-3.1-flash",
    LEGACY: "gemini-2.0-flash",
    PRO: "gemini-3.1-pro",
    REASONING: "gemini-3.1-pro-deep-think",
  },
  [LLM_PROVIDERS.CLAUDE]: {
    DEFAULT: "claude-4.6-sonnet-latest",
    LEGACY: "claude-3-5-sonnet-latest",
    LIGHT: "claude-4.6-haiku-latest",
  },
};

const ENGINE_CHAT_TIMEOUT_SECONDS = Number.parseInt(
  process.env.WEAVE_ENGINE_CHAT_TIMEOUT_SECONDS || "45",
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
    const { message, model, allowEdit, noteIds, projectIds, agentId, sessionId } = req.body;

    if (typeof message !== "string" || !message.trim()) {
      const error = new Error("Campo \"message\" é obrigatório");
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
   * @returns {Array<{name: string, mimeType: string, sizeBytes: number}>}
   */
  _buildEngineFilesPayload(files) {
    if (!Array.isArray(files) || files.length === 0) {
      return [];
    }

    return files.map((file) => ({
      mimeType: file.mimetype || "application/octet-stream",
      name: file.originalname || "file",
      sizeBytes: Number(file.size || 0),
    }));
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
  async _requestEngineChat(payload) {
    const requestId = randomUUID();
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
      parseError.statusCode = 502;
      throw parseError;
    }

    if (!parsedResponse?.success) {
      const engineError = new Error(parsedResponse?.error || "Falha ao processar no Weave Engine");
      engineError.statusCode = 502;
      throw engineError;
    }

    return parsedResponse.data || {};
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
      let selectedAgent = null;
      let authorizedFunctions = [];
      let capabilityRules = {};
      let resourceAccess = {};

      if (payload.agentId) {
        selectedAgent = await agentsRepository.getAgentById(payload.agentId, userId);
        if (!selectedAgent) {
          return res.status(404).json({
            success: false,
            error: "Agente não encontrado para o usuário",
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
            error: "Sessão não encontrada para o usuário",
          });
        }
      } else {
        const session = await chatRepository.createSession(userId);
        sessionId = session.id;
      }

      const filesMetadata = this._buildFilesMetadata(req.files);
      await chatRepository.saveMessage({
        sessionId,
        userId,
        role: "user",
        content: payload.message,
        model: `${payload.model.name}:${payload.model.version}`,
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
        context: {
          capabilityRules,
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
        sessionId,
        userId,
        userLanguage,
      });

      const assistantText =
        engineResponse?.data?.response ||
        engineResponse?.data?.text ||
        engineResponse?.data?.content ||
        "";
      const responseFunctions = Array.isArray(engineResponse?.functions)
        ? engineResponse.functions
        : [];
      const fallbackText =
        responseFunctions.length > 0
          ? "Solicitacao entendida. Recebi uma chamada de funcao e estou processando a acao."
          : "Solicitacao recebida, mas o modelo nao retornou conteudo textual.";
      const finalAssistantText = assistantText || fallbackText;
      await chatRepository.saveMessage({
        sessionId,
        userId,
        role: "assistant",
        content: finalAssistantText,
        model: `${payload.model.name}:${payload.model.version}`,
        metadata: {
          citations: engineResponse?.data?.citations || [],
          functions: responseFunctions,
          providerUsed: engineResponse?.providerUsed || null,
        },
      });

      return res.json({
        success: true,
        sessionId,
        response: {
          role: "assistant",
          content: finalAssistantText,
          citations: engineResponse?.data?.citations || [],
          functions: responseFunctions,
          model: payload.model,
          provider: engineResponse?.providerUsed || null,
        },
      });
    } catch (error) {
      if (
        error.statusCode === 401 ||
        error.statusCode === 400 ||
        error.statusCode === 502 ||
        error.statusCode === 504
      ) {
        return res.status(error.statusCode).json({
          success: false,
          error: error.message,
        });
      }

      return res.status(500).json({
        success: false,
        error: "Erro ao processar chat",
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
      if (error.statusCode === 401) {
        return res.status(401).json({ success: false, error: error.message });
      }

      return res.status(500).json({
        success: false,
        error: "Erro ao buscar histórico do chat",
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
      const providers = Object.values(LLM_PROVIDERS).map((provider) => ({
        name: provider,
        models: LLM_MODELS[provider] || {},
      }));

      return res.json({
        success: true,
        providers,
      });
    } catch (error) {
      if (error.statusCode === 401) {
        return res.status(401).json({ success: false, error: error.message });
      }

      return res.status(500).json({
        success: false,
        error: "Erro ao obter modelos disponíveis",
      });
    }
  }
}

module.exports = new ChatController();
