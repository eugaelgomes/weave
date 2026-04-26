const {
  buildSystemMessage,
  callAIProvider,
  generateSmartResponse,
  getFewShotExamples,
  processChatV2,
} = require("@/modules/weave-ai/ai-service");
const {
  FunctionCategory,
  getAllInOpenAIFormat,
  getFunctionsByCategory,
  getFunctionsBySecurityLevel,
} = require("@/modules/weave-ai/function-schemas");
const notesRepository = require("@/modules/notes/notes.repository");
const {
  blocksToDocument,
  documentToBlocks,
} = require("@/modules/notes/document-blocks-adapter");
const projectsRepository = require("@/modules/projects/repositories/projects.repository");
const agentsRepository = require("@/modules/weave-ai/repositories/agents.repository");
const {
  NOTE_STATUS,
  PROJECT_STATUS,
} = require("@/utils/patterns/product-patterns");

const responseCache = new Map();
const cacheConfig = {
  cacheKey(provider, prompt, context) {
    return JSON.stringify({ context, prompt, provider });
  },
  enabled: false,
  maxSize: 100,
  ttl: 300,
};

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

      // Verifica cache
      if (cacheConfig.enabled) {
        const cacheKey = cacheConfig.cacheKey(
          requestedProvider || "auto",
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

      // Determina o provider ideal
      const provider = requestedProvider || "auto";

      // Enriquece contexto com Context Provider dinâmico
      const enrichedContext = await this._enrichContext(
        userId,
        useCase,
        context
      );

      // Constrói mensagem do sistema
      const systemMessage = await buildSystemMessage(useCase, enrichedContext);

      // Adiciona few-shot examples se disponível
      const examples = await getFewShotExamples(useCase);
      let fullPrompt = prompt;
      if (examples.length > 0) {
        const examplesText = examples
          .map((ex) => `Usuário: ${ex.user}\n\nAssistente: ${ex.assistant}`)
          .join("\n\n---\n\n");
        fullPrompt = `${examplesText}\n\n---\n\nUsuário: ${prompt}`;
      }

      // Se há uma action, instrui a IA a retornar JSON estruturado
      if (context.action) {
        fullPrompt = this._buildActionPrompt(context.action, prompt, context);
      }

      const response = await callAIProvider(provider, fullPrompt, systemMessage, {
        useCase,
      });
      const usedProvider = response.providerUsed || provider;

      // Se context tem action, executa ação de criar dados
      let createdData = null;
      if (context.action) {
        createdData = await this._executeAction(
          userId,
          context.action,
          response,
          context
        );
      }

      // Prepara resposta
      const result = {
        success: true,
        useCase,
        provider: usedProvider,
        response:
          typeof response === "string"
            ? response
            : response.content || response.text,
        citations: response.citations || null,
        createdData: createdData || null,
        timestamp: new Date().toISOString(),
      };

      // Salva no cache apenas se não houver ação de criação
      if (cacheConfig.enabled && !context.action) {
        const cacheKey = cacheConfig.cacheKey(
          requestedProvider || "auto",
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
   * Constrói prompt específico para ações que precisam de JSON
   * @private
   */
  _buildActionPrompt(action, originalPrompt, context) {
    const actionPrompts = {
      create_note: `${originalPrompt}

IMPORTANTE: Retorne APENAS um JSON válido, sem texto adicional, seguindo esta estrutura exata:
{
  "title": "Título da nota (máximo 100 caracteres)",
  "description": "Descrição detalhada em markdown",
  "tags": ["tag1", "tag2", "tag3"],
  "blocks": [
    {"type": "paragraph", "text": "Conteúdo do parágrafo"},
    {"type": "heading", "text": "Título da seção"},
    {"type": "list", "text": "Item da lista"}
  ]
}

Tipos de blocos permitidos: text, paragraph, heading, h1, h2, h3, todo, list, page, code, quote, image, divider
${context.includeBlocks === false ? "NÃO inclua a propriedade blocks." : ""}`,

      create_project: `${originalPrompt}

IMPORTANTE: Retorne APENAS um JSON válido, sem texto adicional, seguindo esta estrutura exata:
{
  "title": "Título do projeto",
  "description": "Descrição do projeto",
  "status": "ativo",
  "properties": {
    "priority": "alta",
    "category": "categoria"
  }${
    context.includeNotes
      ? `,
  "notes": [
    {
      "title": "Título da nota",
      "description": "Descrição da nota",
      "tags": ["tag1", "tag2"]
    }
  ]`
      : ""
  }
}`,

      create_blocks: `${originalPrompt}

IMPORTANTE: Retorne APENAS um JSON válido, sem texto adicional, seguindo esta estrutura exata:
{
  "blocks": [
    {"type": "paragraph", "text": "Conteúdo", "properties": {}},
    {"type": "heading", "text": "Título", "properties": {}},
    {"type": "list", "text": "Item", "properties": {}}
  ]
}

Tipos permitidos: text, paragraph, heading, h1, h2, h3, todo, list, page, code, quote, image, divider`,

      update_note: `${originalPrompt}

IMPORTANTE: Retorne APENAS um JSON válido com os campos a atualizar:
{
  "title": "Título atualizado",
  "description": "Descrição atualizada",
  "tags": ["tags", "atualizadas"],
  "status": "status"
}

Inclua apenas os campos que devem ser atualizados.`,

      update_project: `${originalPrompt}

IMPORTANTE: Retorne APENAS um JSON válido com os campos a atualizar:
{
  "title": "Título atualizado",
  "description": "Descrição atualizada",
  "status": "ativo",
  "properties": {
    "priority": "alta",
    "category": "categoria"
  }
}

Inclua apenas os campos que devem ser atualizados.`,
    };

    return actionPrompts[action] || originalPrompt;
  }

  /**
   * Executa ações de criar/atualizar dados baseado na resposta da IA
   * @private
   */
  async _executeAction(userId, action, aiResponse, context) {
    try {
      // Parse da resposta se for string
      let parsedResponse = aiResponse;
      if (typeof aiResponse === "string") {
        // Remove markdown code blocks se existirem
        const cleanResponse = aiResponse
          .replace(/```json\n?/g, "")
          .replace(/```\n?/g, "")
          .trim();

        try {
          parsedResponse = JSON.parse(cleanResponse);
        } catch (parseError) {
          // Se não conseguir parsear, retorna erro
          console.error("Erro ao parsear resposta da IA:", parseError);
          throw new Error("Resposta da IA não está em formato JSON válido");
        }
      } else if (aiResponse.content) {
        const cleanContent = aiResponse.content
          .replace(/```json\n?/g, "")
          .replace(/```\n?/g, "")
          .trim();

        try {
          parsedResponse = JSON.parse(cleanContent);
        } catch (parseError) {
          console.error("Erro ao parsear conteúdo da IA:", parseError);
          throw new Error("Conteúdo da IA não está em formato JSON válido");
        }
      }

      switch (action) {
        case "create_note": {
          // Cria nota
          const tags = [
            ...(context.tags || []),
            ...(parsedResponse.tags || []),
          ];
          const uniqueTags = [...new Set(tags)];

          const generatedDocument =
            context.includeBlocks !== false
              ? toDocumentFromAiBlocks(parsedResponse.blocks)
              : null;

          const note = await notesRepository.createNotesQuery(
            userId,
            parsedResponse.title,
            parsedResponse.description,
            uniqueTags,
            NOTE_STATUS.VISIBLE,
            null,
            null,
            null,
            generatedDocument
          );

          return {
            type: "note",
            blocks:
              generatedDocument && note?.id
                ? documentToBlocks(generatedDocument, String(note.id))
                : null,
            note,
          };
        }

        case "create_project": {
          // Cria projeto
          const project = await projectsRepository.createProject(
            userId,
            parsedResponse.title,
            parsedResponse.description,
            parsedResponse.status || PROJECT_STATUS.OPEN,
            parsedResponse.properties || {}
          );

          // Cria notas associadas se fornecidas
          const notes = [];
          if (
            context.includeNotes &&
            parsedResponse.notes &&
            parsedResponse.notes.length > 0
          ) {
            for (const noteData of parsedResponse.notes) {
              const note = await notesRepository.createNotesQuery(
                userId,
                noteData.title,
                noteData.description || "",
                noteData.tags || []
              );

              // Associa nota ao projeto
              await projectsRepository.addNoteToProject(
                project[0].id,
                note.id,
                userId
              );

              notes.push(note);
            }
          }

          return {
            type: "project",
            project: project[0],
            notes: notes.length > 0 ? notes : null,
          };
        }

        case "create_blocks": {
          // Adiciona conteúdo no documento de uma nota existente
          if (!context.noteId) {
            throw new Error("noteId é obrigatório para atualizar conteúdo");
          }

          const existingNote = await notesRepository.getNoteById(
            context.noteId
          );
          if (!existingNote) {
            throw new Error("Nota não encontrada");
          }

          const currentBlocks = documentToBlocks(
            existingNote.document,
            String(context.noteId)
          );
          const newBlocks = Array.isArray(parsedResponse.blocks)
            ? parsedResponse.blocks.map((block, index) => ({
                id: `ai-${Date.now()}-${index}`,
                note_id: String(context.noteId),
                position: currentBlocks.length + index,
                properties: block?.properties || {},
                text: block?.text || "",
                type: block?.type || "paragraph",
              }))
            : [];
          const mergedBlocks = [...currentBlocks, ...newBlocks];
          const nextDocument = blocksToDocument(mergedBlocks);

          await notesRepository.updateNoteById(context.noteId, {
            document: nextDocument,
          });

          return {
            type: "blocks",
            blocks: newBlocks,
            noteId: context.noteId,
          };
        }

        case "update_note": {
          // Atualiza nota existente
          if (!context.noteId) {
            throw new Error("noteId é obrigatório para atualizar nota");
          }

          const updateData = {};
          if (parsedResponse.title) updateData.title = parsedResponse.title;
          if (parsedResponse.description)
            updateData.description = parsedResponse.description;
          if (parsedResponse.tags) updateData.tags = parsedResponse.tags;
          if (parsedResponse.status) updateData.status = parsedResponse.status;
          if (Array.isArray(parsedResponse.blocks)) {
            updateData.document = blocksToDocument(
              parsedResponse.blocks.map((block, index) => ({
                id: `ai-${Date.now()}-${index}`,
                note_id: String(context.noteId),
                position: index,
                properties: block?.properties || {},
                text: block?.text || "",
                type: block?.type || "paragraph",
              }))
            );
          }

          const updatedNote = await notesRepository.updateNoteById(
            context.noteId,
            updateData
          );

          return {
            type: "note_updated",
            note: updatedNote,
          };
        }

        case "update_project": {
          // Atualiza projeto existente
          if (!context.projectId) {
            throw new Error("projectId é obrigatório para atualizar projeto");
          }

          const updateData = {};
          if (parsedResponse.title) updateData.title = parsedResponse.title;
          if (parsedResponse.description)
            updateData.description = parsedResponse.description;
          if (parsedResponse.status) updateData.status = parsedResponse.status;
          if (parsedResponse.properties)
            updateData.properties = parsedResponse.properties;

          const updatedProject = await projectsRepository.updateProject(
            context.projectId,
            userId,
            updateData
          );

          return {
            type: "project_updated",
            project: updatedProject[0],
          };
        }

        default:
          return null;
      }
    } catch (error) {
      console.error(`Erro ao executar ação ${action}:`, error);
      throw error;
    }
  }

  /**
   * Enriquece o contexto com dados do usuário usando Context Provider
   * @private
   */
  async _enrichContext(userId, useCase, context) {
    try {
      // Buscar dados completos de notas e projetos indexados
      const indexedNotes = [];
      const indexedProjects = [];

      if (context.noteIds && Array.isArray(context.noteIds)) {
        for (const noteId of context.noteIds) {
          try {
            const note = await notesRepository.getNoteById(noteId, userId);
            if (note) {
              indexedNotes.push({
                id: note.id,
                title: note.title,
                description: note.description,
                tags: note.tags,
                status: note.status,
              });
            }
          } catch (err) {
            console.warn(`Nota ${noteId} não encontrada ou sem acesso`);
          }
        }
      }

      if (context.projectIds && Array.isArray(context.projectIds)) {
        for (const projectId of context.projectIds) {
          try {
            const project = await projectsRepository.getProjectById(
              projectId,
              userId
            );
            if (project) {
              indexedProjects.push({
                id: project.id,
                title: project.title,
                description: project.description,
                status: project.status,
                properties: project.properties,
              });
            }
          } catch (err) {
            console.warn(`Projeto ${projectId} não encontrado ou sem acesso`);
          }
        }
      }

      // Mescla com contexto fornecido
      return {
        ...context,
        // Adiciona notas e projetos indexados ao contexto
        indexedNotes: indexedNotes.length > 0 ? indexedNotes : undefined,
        indexedProjects:
          indexedProjects.length > 0 ? indexedProjects : undefined,
      };
    } catch (error) {
      console.warn("Erro ao enriquecer contexto:", error.message);
      return context;
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

      // ========== PROJETOS ==========
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
      const perplexityAvailable = !!process.env.PERPLEXITY_API_KEY;

      const models = [
        {
          id: "gemini",
          name: "Gemini Flash 2.0",
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
        {
          id: "perplexity",
          name: "Perplexity Sonar Pro",
          provider: "perplexity",
          description: "Modelo focado em pesquisa e informações atualizadas",
          capabilities: [
            "Pesquisa em tempo real",
            "Citação de fontes",
            "Análise de tendências",
            "Verificação de fatos",
          ],
          mode: "funcoes autorizadas por contexto",
          isAvailable: perplexityAvailable,
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

      // Determina provider (usa preferredProvider se não especificado)
      const provider = selectedModel || requestedProvider || "auto";
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
        model: provider,
        metadata: {
          agentId: selectedAgent?.id || null,
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
        model: provider,
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
      const executionResult = successfulExecutions.length > 0
        ? successfulExecutions
        : null;

      let finalContent =
        engineData.response ||
        engineData.text ||
        engineData.content ||
        null;

      if (!finalContent && successfulExecutions.length > 0) {
        const systemMessage = await buildSystemMessage(useCase, {
          ...parsedContext,
          noteIds,
          projectIds,
        });
        finalContent = await generateSmartResponse({
          executionResult: successfulExecutions,
          functionName: requestedFunctions[0]?.name || "multiple_functions",
          originalMessage: message,
          provider,
          systemMessage,
        });
      }

      if (!finalContent && blockedFunctions.length > 0) {
        finalContent =
          "Recebi instruções de escrita da engine, mas ignorei as actions porque allowEdit está desativado.";
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
        model: provider,
        metadata: {
          agentId: selectedAgent?.id || null,
          blockedFunctions,
          citations: engineData.citations || null,
          executionResult,
          allowEdit,
          requestedFunctions,
          providerUsed: engineResponse?.providerUsed || provider,
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
        model: provider,
        provider,
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
