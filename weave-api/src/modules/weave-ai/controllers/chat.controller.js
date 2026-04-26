const {
  processChatV2,
} = require("@/modules/weave-ai/ai-service");
const {
  FunctionCategory,
  getAllInOpenAIFormat,
  getFunctionsByCategory,
  getFunctionsBySecurityLevel,
} = require("@/modules/weave-ai/function-schemas");
const notesRepository = require("@/modules/notes/notes.repository");
const searchUsersRepository = require("@/modules/users/repositories/search-users.repository");
const {
  blocksToDocument,
  documentToBlocks,
} = require("@/modules/notes/document-blocks-adapter");
const projectsRepository = require("@/modules/projects/repositories/projects.repository");
const agentsRepository = require("@/modules/weave-ai/repositories/agents.repository");

const responseCache = new Map();
const cacheConfig = {
  cacheKey(model, prompt, context) {
    return JSON.stringify({ context, model, prompt });
  },
  enabled: false,
  maxSize: 100,
  ttl: 300,
};

const MODEL_ALIASES = {
  auto: "auto",
  gemini: "gemini-2.0-flash",
  openai: "gpt-4o-mini",
};

function normalizeModelInput(rawModel) {
  if (typeof rawModel !== "string") {
    return "";
  }

  const normalized = rawModel.trim().toLowerCase();
  if (!normalized) {
    return "";
  }

  if (normalized.startsWith("models/")) {
    return normalized.slice("models/".length);
  }

  return normalized;
}

function isGeminiModel(modelName) {
  return modelName.startsWith("gemini-");
}

function isOpenAiModel(modelName) {
  return (
    modelName.startsWith("gpt-") ||
    modelName.startsWith("o1") ||
    modelName.startsWith("o3") ||
    modelName.startsWith("o4") ||
    modelName.startsWith("chatgpt-")
  );
}

/**
 * Creates a standardized validation error.
 *
 * @param {string} message
 * @returns {Error}
 */
function createValidationError(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

/**
 * Resolves incoming payload to an engine-supported model name.
 *
 * @param {{name?: string}|null} modelSelection
 * @param {unknown} requestedProvider
 * @returns {string}
 */
function resolveEngineModel(modelSelection, requestedProvider) {
  const candidates = [modelSelection?.name, requestedProvider, "auto"];

  for (const raw of candidates) {
    const input = normalizeModelInput(raw);
    if (!input) {
      continue;
    }

    const normalized = MODEL_ALIASES[input] || input;

    if (normalized === "auto") {
      return "auto";
    }

    if (isOpenAiModel(normalized)) {
      return normalized;
    }

    if (isGeminiModel(normalized)) {
      return normalized;
    }
  }

  throw createValidationError(
    "Unsupported model. Use 'auto', a Gemini model (gemini-*), or an OpenAI model (gpt-*, o3-*)."
  );
}

function formatExecutionSummary(functionName, successfulExecutions = [], userLanguage) {
  const firstResult = successfulExecutions[0];
  const isPortuguese =
    typeof userLanguage === "string" &&
    userLanguage.toLowerCase().startsWith("pt");

  if (functionName === "get_user_profile" && firstResult && typeof firstResult === "object") {
    const userName = firstResult.name || firstResult.username || "User";
    const userEmail = firstResult.email || "not provided";
    if (isPortuguese) {
      return `Perfil localizado com sucesso.\n\nNome: ${userName}\nEmail: ${userEmail}`;
    }
    return `Profile fetched successfully.\n\nName: ${userName}\nEmail: ${userEmail}`;
  }

  if (isPortuguese) {
    return "A ação foi executada com sucesso e os dados foram processados corretamente.";
  }
  return "The action was executed successfully and data was processed correctly.";
}

/**
 * Parses booleans from JSON or multipart payloads.
 *
 * @param {unknown} value
 * @param {boolean} [fallback=false]
 * @returns {boolean}
 */
function parseBoolean(value, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  return fallback;
}

/**
 * Parses an optional object from payload.
 *
 * @param {unknown} value
 * @param {string} fieldName
 * @returns {Record<string, unknown>}
 */
function parseOptionalObject(value, fieldName) {
  if (value === undefined || value === null || value === "") return {};
  if (typeof value === "object" && !Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      throw createValidationError(`Campo "${fieldName}" deve ser um objeto JSON válido.`);
    }
  }

  throw createValidationError(`Campo "${fieldName}" deve ser um objeto.`);
}

/**
 * Parses an optional string array from payload.
 *
 * @param {unknown} value
 * @param {string} fieldName
 * @returns {string[]}
 */
function parseOptionalStringArray(value, fieldName) {
  if (value === undefined || value === null || value === "") return [];
  if (Array.isArray(value)) {
    const invalid = value.some((item) => typeof item !== "string" || item.trim() === "");
    if (invalid) {
      throw createValidationError(`Campo "${fieldName}" deve conter apenas strings não vazias.`);
    }
    return value.map((item) => item.trim());
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];

    if (trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed);
        return parseOptionalStringArray(parsed, fieldName);
      } catch {
        throw createValidationError(`Campo "${fieldName}" deve ser um array JSON válido.`);
      }
    }

    return trimmed
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  throw createValidationError(`Campo "${fieldName}" deve ser um array de strings.`);
}

/**
 * Parses model payload from JSON or multipart input.
 * Supports legacy string model and object model `{ name, version }`.
 *
 * @param {unknown} value
 * @returns {{name: string, version?: string}|null}
 */
function parseModelSelection(value) {
  if (value === undefined || value === null || value === "") return null;

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;

    if (trimmed.startsWith("{")) {
      try {
        return parseModelSelection(JSON.parse(trimmed));
      } catch {
        throw createValidationError("Campo \"model\" deve ser um JSON válido.");
      }
    }

    return { name: trimmed };
  }

  if (typeof value === "object" && !Array.isArray(value)) {
    const modelName = typeof value.name === "string" ? value.name.trim() : "";
    const modelVersion = typeof value.version === "string" ? value.version.trim() : "";

    if (!modelName) {
      throw createValidationError(
        "Campo \"model.name\" é obrigatório quando model é objeto."
      );
    }

    return {
      name: modelName,
      version: modelVersion || undefined,
    };
  }

  throw createValidationError("Campo \"model\" deve ser string ou objeto.");
}

/**
 * Normalizes uploaded files metadata for prompt/context usage.
 *
 * @param {Array<import("multer").File>} files
 * @returns {Array<{name: string, mimeType: string, sizeBytes: number}>}
 */
function normalizeUploadedFiles(files) {
  if (!Array.isArray(files) || files.length === 0) {
    return [];
  }

  return files.map((file) => ({
    mimeType: file.mimetype,
    name: file.originalname,
    sizeBytes: file.size,
  }));
}

const toDocumentFromAiBlocks = (blocks) => {
  if (!Array.isArray(blocks) || blocks.length === 0) return null;
  const normalizedBlocks = blocks.map((block, index) => ({
    id: `ai-${Date.now()}-${index}`,
    note_id: "",
    position: index,
    properties: block?.properties || {},
    text: block?.text || "",
    type: block?.type || "paragraph",
  }));
  return blocksToDocument(normalizedBlocks);
};

// Cache
function cleanCache() {
  const now = Date.now();

  for (const [key, value] of responseCache.entries()) {
    if (now - value.timestamp > cacheConfig.ttl * 1000) {
      responseCache.delete(key);
    }
  }

  // Enforce max cache size by evicting the oldest entries
  while (responseCache.size > cacheConfig.maxSize) {
    const firstKey = responseCache.keys().next().value;
    responseCache.delete(firstKey);
  }
}

// Limpar cache a cada 10 minutos
setInterval(cleanCache, 10 * 60 * 1000);

/**
 * Controlador principal para processar requisições de IA
 */
class AIController {
  /**
   * POST /api/ai/generate
   * Gera conteúdo baseado no caso de uso
   */
  async generateContent(req, res) {
    try {
      const userId = req.user?.userId;
      const {
        useCase,
        prompt,
        context = {},
        provider: requestedProvider,
      } = req.body;

      // Validações
      if (!prompt || !useCase) {
        return res.status(400).json({
          error: "Parâmetros obrigatórios: prompt, useCase",
        });
      }

      const selectedModelName = resolveEngineModel(null, requestedProvider);

      // Verifica cache
      if (cacheConfig.enabled) {
        const cacheKey = cacheConfig.cacheKey(
          selectedModelName,
          prompt,
          context
        );

        if (responseCache.has(cacheKey)) {
          const cached = responseCache.get(cacheKey);
          return res.json({
            ...cached.data,
            cached: true,
            cachedAt: new Date(cached.timestamp).toISOString(),
          });
        }
      }

      const engineResponse = await processChatV2({
        allowEdit: false,
        context,
        files: [],
        functions: [],
        message: prompt,
        model: selectedModelName,
        noteIds: Array.isArray(context.noteIds) ? context.noteIds : [],
        projectIds: Array.isArray(context.projectIds) ? context.projectIds : [],
        useCase,
        userId,
      });

      const engineData =
        engineResponse && typeof engineResponse.data === "object"
          ? engineResponse.data
          : {};
      const response =
        engineData.response ||
        engineData.text ||
        engineData.content ||
        "";
      const usedProvider = engineResponse?.providerUsed || selectedModelName;

      // Prepara resposta
      const result = {
        success: true,
        useCase,
        provider: usedProvider,
        response,
        citations: engineData.citations || null,
        createdData: null,
        timestamp: new Date().toISOString(),
      };

      if (cacheConfig.enabled) {
        const cacheKey = cacheConfig.cacheKey(
          selectedModelName,
          prompt,
          context
        );
        responseCache.set(cacheKey, {
          data: result,
          timestamp: Date.now(),
        });
      }

      res.json(result);
    } catch (error) {
      console.error("Erro no AI Controller:", error);
      res.status(500).json({
        error: "Erro ao processar requisição de IA",
        message: error.message,
      });
    }
  }

  /**
   * POST /api/ai/analyze-note
   * Analisa uma nota e fornece sugestões
   */
  // Métodos removidos: analyzeNote, analyzeProject, research
  // Tudo agora é feito via chat unificado com allowEdit

  /**
   * GET /api/ai/use-cases
   * Lista casos de uso disponíveis
   */
  async listUseCases(req, res) {
    try {
      res.json({
        capabilities: {
          byCategory: {
            blocks: getFunctionsByCategory(FunctionCategory.BLOCKS).length,
            chat: getFunctionsByCategory(FunctionCategory.CHAT).length,
            notes: getFunctionsByCategory(FunctionCategory.NOTES).length,
            projects: getFunctionsByCategory(FunctionCategory.PROJECTS).length,
            search: getFunctionsByCategory(FunctionCategory.SEARCH).length,
            stats: getFunctionsByCategory(FunctionCategory.STATS).length,
            users: getFunctionsByCategory(FunctionCategory.USERS).length,
          },
          bySecurityLevel: {
            moderate: getFunctionsBySecurityLevel("moderate").length,
            restricted: getFunctionsBySecurityLevel("restricted").length,
            safe: getFunctionsBySecurityLevel("safe").length,
          },
        },
        note: "As capacidades sao orientadas por funcoes autorizadas pelo server antes de qualquer processamento no engine.",
        success: true,
      });
    } catch (error) {
      console.error("Erro ao listar casos de uso:", error);
      res.status(500).json({
        error: "Erro ao listar casos de uso",
        message: error.message,
      });
    }
  }

  /**
   * GET /api/ai/functions
   * Lista todas as funções disponíveis para a IA executar
   */
  async listAvailableFunctions(req, res) {
    try {
      const functions = getAllInOpenAIFormat();

      res.json({
        success: true,
        totalFunctions: functions.length,
        functions,
        bySecurityLevel: {
          safe: getFunctionsBySecurityLevel("safe").length,
          moderate: getFunctionsBySecurityLevel("moderate").length,
          restricted: getFunctionsBySecurityLevel("restricted").length,
        },
        byCategory: {
          notes: getFunctionsByCategory("notes").length,
          projects: getFunctionsByCategory("projects").length,
          blocks: getFunctionsByCategory("blocks").length,
          chat: getFunctionsByCategory("chat").length,
          users: getFunctionsByCategory("users").length,
          search: getFunctionsByCategory("search").length,
          stats: getFunctionsByCategory("stats").length,
        },
      });
    } catch (error) {
      console.error("Erro ao listar funções:", error);
      res.status(500).json({
        success: false,
        error: "Erro ao listar funções disponíveis",
      });
    }
  }

  /**
   * Executa uma função chamada pela IA
   * @private
   */
  async _executeFunctionCall(userId, functionCall, context) {
    const { name, arguments: args } = functionCall;
    const allowedFunctionNames = context?.allowedFunctionNames;

    if (
      Array.isArray(allowedFunctionNames) &&
      !allowedFunctionNames.includes(name)
    ) {
      throw new Error(`Funcao ${name} nao autorizada para este contexto`);
    }

    // Executa a função apropriada
    switch (name) {
      // ========== NOTAS ==========
      case "get_user_notes":
        return await notesRepository.getAllNotesByUserId(userId);

      case "get_notes_with_pagination":
        return await notesRepository.getAllNotesWithPagination(userId, {
          limit: args.limit,
          page: args.page,
          search: args.searchTerm || args.search || "",
          sortBy: args.sortBy,
          sortOrder: args.sortOrder,
          tags: args.tags,
        });

      case "create_note":
        const createdDocument = toDocumentFromAiBlocks(args.blocks);
        const newNote = await notesRepository.createNotesQuery(
          userId,
          args.title,
          args.description || "",
          args.tags || [],
          NOTE_STATUS.VISIBLE,
          null,
          null,
          null,
          createdDocument
        );
        return newNote;

      case "update_note":
        const noteUpdateData = {
          title: args.title,
          description: args.description,
          tags: args.tags,
          status: args.status,
        };
        if (Array.isArray(args.blocks)) {
          noteUpdateData.document = blocksToDocument(
            args.blocks.map((block, index) => ({
              id: `fn-${Date.now()}-${index}`,
              note_id: String(args.noteId),
              position: index,
              properties: block?.properties || {},
              text: block?.text || "",
              type: block?.type || "paragraph",
            }))
          );
        }
        const updatedNote = await notesRepository.updateNoteById(
          args.noteId,
          noteUpdateData
        );
        return updatedNote;

      case "delete_note":
        return await notesRepository.deleteNoteById(args.noteId);

      case "get_note":
        const note = await notesRepository.getNoteById(args.noteId);
        if (note) {
          note.blocks = documentToBlocks(note.document, String(args.noteId));
        }
        return note;

      case "get_note_by_id":
        return await this._executeFunctionCall(
          userId,
          {
            arguments: {
              noteId: args.noteId,
            },
            name: "get_note",
          },
          context
        );

      case "search_notes":
        const allNotes = await notesRepository.getAllNotesByUserId(userId);
        const query = args.query || args.title || "";
        const limit = args.limit || 10;

        const filteredNotes = allNotes.filter((note) => {
          const searchLower = query.toLowerCase();
          const matchText =
            !query ||
            note.title.toLowerCase().includes(searchLower) ||
            (note.description &&
              note.description.toLowerCase().includes(searchLower));

          const matchTags =
            !args.tags || args.tags.some((tag) => note.tags?.includes(tag));
          const matchStatus = !args.status || note.status === args.status;

          return matchText && matchTags && matchStatus;
        });

        return filteredNotes.slice(0, limit);

      case "get_notes_stats":
        return await notesRepository.getAllNotesStats(userId);

      // ========== PROJETOS ==========
      case "get_user_projects":
        return await projectsRepository.getAllProjects(userId);

      case "create_project":
        return await projectsRepository.createProject(
          userId,
          args.title,
          args.description || "",
          args.status || PROJECT_STATUS.OPEN,
          args.properties || {}
        );

      case "update_project":
        return await projectsRepository.updateProject(args.projectId, userId, {
          title: args.title,
          description: args.description,
          status: args.status,
          properties: args.properties,
        });

      case "delete_project":
        return await projectsRepository.deleteProject(args.projectId, userId);

      case "get_project":
        return await projectsRepository.getProjectByIdWithAccess(
          args.projectId,
          userId
        );

      case "get_project_by_id":
        return await this._executeFunctionCall(
          userId,
          {
            arguments: {
              projectId: args.projectId,
            },
            name: "get_project",
          },
          context
        );

      case "get_project_notes":
        return await projectsRepository.getAssociatedNotes(args.projectId, userId);

      case "add_note_to_project":
        return await projectsRepository.addNoteToProject(
          args.projectId,
          args.noteId,
          userId
        );

      case "remove_note_from_project":
        return await projectsRepository.removeNoteFromProject(
          args.projectId,
          args.noteId,
          userId
        );

      // ========== USERS ==========
      case "get_user_profile":
        return await searchUsersRepository.getUserById(userId);

      case "search_users":
        return await searchUsersRepository.searchUsers(args.searchTerm || "");

      default:
        throw new Error(`Função ${name} não implementada`);
    }
  }

  /**
   * GET /api/ai/models
   * Lista modelos de IA disponíveis
   */
  async getAvailableModels(req, res) {
    try {
      const geminiAvailable = !!process.env.GEMINI_API_KEY;

      const models = [
        {
          id: "gemini",
          name: "Gemini Flash 2.0",
          version: "2.0-flash",
          provider: "gemini",
          description:
            "Modelo rápido e eficiente para criação de conteúdo e análise",
          capabilities: [
            "Geração de texto",
            "Análise de conteúdo",
            "Sugestões criativas",
            "Formatação estruturada",
          ],
          mode: "funcoes autorizadas por contexto",
          isAvailable: geminiAvailable,
        },
      ];

      res.json({
        success: true,
        models: models.filter((m) => m.isAvailable),
      });
    } catch (error) {
      console.error("Erro ao listar modelos:", error);
      res.status(500).json({
        success: false,
        error: "Erro ao listar modelos de IA",
      });
    }
  }

  /**
   * POST /api/ai/chat
   * Envia mensagem no chat
   */
  /**
   * POST /api/ai/chat
   * Chat unificado - pode executar funções ou apenas responder
   */
  async chat(req, res) {
    try {
      const userId = req.user?.userId;
      const parsedContext = parseOptionalObject(req.body?.context, "context");
      const {
        message,
        allowEdit: rawAllowEdit,
        useCase = "chat",
        provider: requestedProvider,
        model: selectedModel,
        agentId,
        sessionId,
      } = req.body;
      const modelSelection = parseModelSelection(selectedModel);
      const allowEdit = parseBoolean(rawAllowEdit, false);
      const requestFiles = normalizeUploadedFiles(req.files);
      const noteIds = parseOptionalStringArray(
        req.body?.noteIds ?? parsedContext.noteIds,
        "noteIds"
      );
      const projectIds = parseOptionalStringArray(
        req.body?.projectIds ?? parsedContext.projectIds,
        "projectIds"
      );

      if (typeof message !== "string" || !message.trim()) {
        throw createValidationError("Campo \"message\" é obrigatório.");
      }

      const chatRepository = require("@/modules/weave-ai/repositories/chat.repository");

      // Cria ou obtém sessão
      let currentSessionId = sessionId;
      if (!currentSessionId) {
        const session = await chatRepository.createSession(userId);
        currentSessionId = session.id;
      }

      const selectedModelName = resolveEngineModel(modelSelection, requestedProvider);
      let selectedAgent = null;
      if (typeof agentId === "string" && agentId.trim()) {
        selectedAgent = await agentsRepository.getAgentById(agentId.trim(), userId);
        if (!selectedAgent) {
          throw createValidationError("Agent selecionado não encontrado.");
        }
      }
      const authorizedFunctions = allowEdit ? getAllInOpenAIFormat() : [];
      const allowedFunctionNames = authorizedFunctions.map((tool) => tool.name);

      // Salva mensagem do usuário
      await chatRepository.saveMessage({
        sessionId: currentSessionId,
        userId,
        role: "user",
        content: message,
        model: selectedModelName,
        metadata: {
          agentId: selectedAgent?.id || null,
          modelSelection,
          ...parsedContext,
          files: requestFiles,
          noteIds,
          projectIds,
          useCase,
          allowEdit,
        },
      });

      const engineResponse = await processChatV2({
        agent: selectedAgent
          ? {
              id: selectedAgent.id,
              personality: selectedAgent.personality || {},
            }
          : null,
        agentId: selectedAgent?.id || null,
        allowEdit,
        context: parsedContext,
        files: requestFiles,
        functions: authorizedFunctions,
        message,
        model: selectedModelName,
        noteIds,
        projectIds,
        sessionId: currentSessionId,
        useCase,
        userId,
      });

      const engineData =
        engineResponse && typeof engineResponse.data === "object"
          ? engineResponse.data
          : {};
      const requestedFunctions = Array.isArray(engineResponse?.functions)
        ? engineResponse.functions
        : engineData.functionCall
          ? [engineData.functionCall]
          : [];

      const executedFunctions = [];
      const blockedFunctions = [];
      for (const functionCall of requestedFunctions) {
        if (!allowEdit) {
          blockedFunctions.push({
            functionCall,
            reason: "allowEdit=false",
          });
          continue;
        }

        try {
          const result = await this._executeFunctionCall(userId, functionCall, {
            ...parsedContext,
            allowedFunctionNames,
            noteIds,
            projectIds,
          });
          executedFunctions.push({
            functionCall,
            result,
            success: true,
          });
        } catch (executionError) {
          executedFunctions.push({
            error: executionError.message,
            functionCall,
            success: false,
          });
        }
      }

      const successfulExecutions = executedFunctions
        .filter((item) => item.success)
        .map((item) => item.result);
      const failedExecutions = executedFunctions.filter((item) => !item.success);
      const executionResult = successfulExecutions.length > 0
        ? successfulExecutions
        : null;

      let finalContent =
        engineData.response ||
        engineData.text ||
        engineData.content ||
        null;

      if (!finalContent && successfulExecutions.length > 0) {
        finalContent = formatExecutionSummary(
          requestedFunctions[0]?.name || "multiple_functions",
          successfulExecutions,
          req.body?.userLanguage || parsedContext?.userLanguage
        );
      }

      if (!finalContent && blockedFunctions.length > 0) {
        finalContent =
          "Recebi instruções de escrita da engine, mas ignorei as actions porque allowEdit está desativado.";
      }

      if (!finalContent && failedExecutions.length > 0) {
        const firstFailure = failedExecutions[0];
        finalContent = `A função solicitada pela IA falhou: ${firstFailure.error || "erro desconhecido"}.`;
      }

      if (!finalContent) {
        finalContent = "Não foi possível gerar uma resposta para essa solicitação.";
      }

      // Salva resposta da IA
      const assistantMessage = await chatRepository.saveMessage({
        sessionId: currentSessionId,
        userId,
        role: "assistant",
        content: finalContent,
        model: selectedModelName,
        metadata: {
          agentId: selectedAgent?.id || null,
          blockedFunctions,
          citations: engineData.citations || null,
          executionResult,
          failedExecutions,
          allowEdit,
          requestedFunctions,
          providerUsed: engineResponse?.providerUsed || selectedModelName,
        },
      });

      // Atualiza título da sessão se for a primeira mensagem
      const messageCount =
        await chatRepository.getSessionMessageCount(currentSessionId);
      if (messageCount === 2) {
        const title =
          message.substring(0, 50) + (message.length > 50 ? "..." : "");
        await chatRepository.updateSessionTitle(currentSessionId, title);
      }

      res.json({
        success: true,
        message: assistantMessage,
        sessionId: currentSessionId,
        model: selectedModelName,
        provider: engineResponse?.providerUsed || selectedModelName,
        useCase,
        allowEdit,
        agentId: selectedAgent?.id || null,
        executionResult,
      });
    } catch (error) {
      console.error("Erro no chat:", error);
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({
        success: false,
        error:
          statusCode === 400 ? error.message : "Erro ao processar mensagem",
      });
    }
  }

  /**
   * GET /api/ai/chat/history
   * Busca histórico de chat
   */
  async getChatHistory(req, res) {
    try {
      const userId = req.user?.userId;
      const { sessionId } = req.query;

      const chatRepository = require("@/modules/weave-ai/repositories/chat.repository");

      if (sessionId) {
        // Busca mensagens de uma sessão específica
        const messages = await chatRepository.getSessionMessages(
          sessionId,
          userId
        );
        return res.json({
          success: true,
          messages,
        });
      }

      // Busca todas as sessões do usuário
      const sessions = await chatRepository.getUserSessions(userId);
      res.json({
        success: true,
        sessions,
      });
    } catch (error) {
      console.error("Erro ao buscar histórico:", error);
      res.status(500).json({
        success: false,
        error: "Erro ao buscar histórico de chat",
      });
    }
  }
}

module.exports = new AIController();
