/**
 * AI Agent Controller
 * Controlador para integração com serviços de IA (Gemini e Perplexity)
 */

const axios = require("axios");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const {
  getProviderConfig,
  getProviderForUseCase,
  AI_PROVIDERS,
  fallbackConfig,
  cacheConfig,
} = require("@/services/ai-server/ai-config");
const {
  buildSystemMessage,
  getFewShotExamples,
} = require("@/services/ai-server/ai-personality");
const notesRepository = require("@/repositories/notes-manager");
const projectsRepository = require("@/repositories/projetcs");

// Cache simples em memória
const responseCache = new Map();

// Inicializa cliente Gemini
let genAI = null;
if (process.env.GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
}

/**
 * Limpa cache antigo periodicamente
 */
function cleanCache() {
  const now = Date.now();
  for (const [key, value] of responseCache.entries()) {
    if (now - value.timestamp > cacheConfig.ttl * 1000) {
      responseCache.delete(key);
    }
  }
  
  // Limita tamanho do cache
  if (responseCache.size > cacheConfig.maxSize) {
    const firstKey = responseCache.keys().next().value;
    responseCache.delete(firstKey);
  }
}

// Limpar cache a cada 10 minutos
setInterval(cleanCache, 10 * 60 * 1000);

/**
 * Chamada para API do Gemini usando a biblioteca oficial
 */
async function callGeminiAPI(prompt, systemMessage, config) {
  if (!genAI) {
    throw new Error("Gemini API não está configurada. Verifique GEMINI_API_KEY");
  }

  const model = genAI.getGenerativeModel({
    model: config.model,
    generationConfig: {
      temperature: config.temperature,
      topP: config.topP,
      topK: config.topK,
      maxOutputTokens: config.maxOutputTokens,
    },
    safetySettings: config.safetySettings,
  });

  // Combina system message com o prompt
  const fullPrompt = `${systemMessage}\n\n---\n\n${prompt}`;

  const result = await model.generateContent(fullPrompt);
  const response = await result.response;
  
  return response.text();
}

/**
 * Chamada para API do Perplexity
 */
async function callPerplexityAPI(prompt, systemMessage, config) {
  const url = `${config.baseURL}/chat/completions`;
  
  const payload = {
    model: config.model,
    messages: [
      {
        role: "system",
        content: systemMessage,
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: config.temperature,
    top_p: config.topP,
    max_tokens: config.maxTokens,
    return_citations: config.returnCitations,
    return_images: config.returnImages,
    search_recency_filter: config.searchRecencyFilter,
    search_domain_filter: config.searchDomainFilter,
  };

  const response = await axios.post(url, payload, {
    timeout: config.timeout,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
  });

  return {
    content: response.data.choices[0]?.message?.content || "",
    citations: response.data.citations || [],
  };
}

/**
 * Executa chamada para provider de IA com retry
 */
async function callAIProvider(provider, prompt, systemMessage, retryCount = 0) {
  const config = getProviderConfig(provider);

  try {
    if (provider === AI_PROVIDERS.GEMINI) {
      return await callGeminiAPI(prompt, systemMessage, config);
    } else if (provider === AI_PROVIDERS.PERPLEXITY) {
      return await callPerplexityAPI(prompt, systemMessage, config);
    }
  } catch (error) {
    // Retry logic
    if (retryCount < config.retry.maxRetries) {
      const delay = config.retry.initialDelay * Math.pow(config.retry.backoffFactor, retryCount);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return callAIProvider(provider, prompt, systemMessage, retryCount + 1);
    }
    
    throw error;
  }
}

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
      let provider = requestedProvider || getProviderForUseCase(useCase);
      
      // Enriquece contexto se necessário
      const enrichedContext = await this._enrichContext(userId, context);

      // Constrói mensagem do sistema
      const systemMessage = buildSystemMessage(useCase, enrichedContext);

      // Adiciona few-shot examples se disponível
      const examples = getFewShotExamples(useCase);
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

      let response;
      let usedProvider = provider;

      try {
        // Tenta com provider primário
        response = await callAIProvider(provider, fullPrompt, systemMessage);
      } catch (error) {
        console.error(`Erro ao chamar ${provider}:`, error.message);

        // Tenta fallback se habilitado
        if (fallbackConfig.enableFallback) {
          const fallbackProvider = fallbackConfig.fallbackPriority.find(
            (p) => p !== provider
          );

          if (fallbackProvider) {
            console.log(`Tentando fallback para ${fallbackProvider}...`);
            try {
              response = await callAIProvider(
                fallbackProvider,
                fullPrompt,
                systemMessage
              );
              usedProvider = fallbackProvider;
            } catch (fallbackError) {
              console.error(
                `Erro no fallback ${fallbackProvider}:`,
                fallbackError.message
              );
              throw error; // Lança erro original
            }
          } else {
            throw error;
          }
        } else {
          throw error;
        }
      }

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
          typeof response === "string" ? response : response.content,
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
  async analyzeNote(req, res) {
    try {
      const userId = req.user?.userId;
      const { noteId, analysisType = "general" } = req.body;

      if (!noteId) {
        return res.status(400).json({ error: "noteId é obrigatório" });
      }

      // Busca a nota
      const note = await notesRepository.getNoteById(noteId);
      
      if (!note) {
        return res.status(404).json({ error: "Nota não encontrada" });
      }

      // Verifica permissão
      if (note.user_id !== userId) {
        const isCollab = await notesRepository.isCollaborator(noteId, userId);
        if (!isCollab) {
          return res.status(403).json({ error: "Sem permissão para acessar esta nota" });
        }
      }

      // Determina o tipo de análise
      let useCase;
      let prompt;

      switch (analysisType) {
        case "summarize":
          useCase = "note_summarization";
          prompt = `Resuma a seguinte nota:\n\nTítulo: ${note.title}\n\nConteúdo: ${note.description}\n\nTags: ${note.tags?.join(", ") || "nenhuma"}`;
          break;

        case "improve":
          useCase = "content_enhancement";
          prompt = `Melhore a escrita e estrutura desta nota:\n\nTítulo: ${note.title}\n\nConteúdo: ${note.description}`;
          break;

        case "tags":
          useCase = "tag_suggestion";
          prompt = `Sugira tags relevantes para esta nota:\n\nTítulo: ${note.title}\n\nConteúdo: ${note.description}\n\nTags atuais: ${note.tags?.join(", ") || "nenhuma"}`;
          break;

        case "general":
        default:
          useCase = "note_generation";
          prompt = `Analise esta nota e forneça sugestões de melhoria:\n\nTítulo: ${note.title}\n\nConteúdo: ${note.description}\n\nTags: ${note.tags?.join(", ") || "nenhuma"}\n\nStatus: ${note.status}`;
          break;
      }

      // Chama o gerador de conteúdo
      req.body = {
        useCase,
        prompt,
        context: { noteInfo: note },
      };

      return this.generateContent(req, res);
    } catch (error) {
      console.error("Erro ao analisar nota:", error);
      res.status(500).json({
        error: "Erro ao analisar nota",
        message: error.message,
      });
    }
  }

  /**
   * POST /api/ai/analyze-project
   * Analisa um projeto e fornece insights
   */
  async analyzeProject(req, res) {
    try {
      const userId = req.user?.userId;
      const { projectId, analysisType = "general" } = req.body;

      if (!projectId) {
        return res.status(400).json({ error: "projectId é obrigatório" });
      }

      // Busca o projeto
      const projectData = await projectsRepository.getProjectByIdWithAccess(
        projectId,
        userId
      );

      if (!projectData || projectData.length === 0) {
        return res.status(404).json({ error: "Projeto não encontrado" });
      }

      const project = projectData[0];

      // Busca notas associadas
      const notes = await projectsRepository.getAssociatedNotes(
        projectId,
        userId
      );

      let useCase;
      let prompt;

      switch (analysisType) {
        case "progress":
          useCase = "priority_analysis";
          prompt = `Analise o progresso deste projeto:\n\nTítulo: ${project.title}\n\nDescrição: ${project.description}\n\nStatus: ${project.status}\n\nNotas associadas: ${notes.length}\n\nPropriedades: ${JSON.stringify(project.properties)}`;
          break;

        case "next_steps":
          useCase = "task_breakdown";
          prompt = `Com base neste projeto, sugira os próximos passos:\n\nTítulo: ${project.title}\n\nDescrição: ${project.description}\n\nStatus: ${project.status}`;
          break;

        case "general":
        default:
          useCase = "priority_analysis";
          prompt = `Analise este projeto e forneça insights:\n\nTítulo: ${project.title}\n\nDescrição: ${project.description}\n\nStatus: ${project.status}\n\nNotas: ${notes.length} associadas\n\nColaboradores: ${project.collaborators?.length || 0}`;
          break;
      }

      req.body = {
        useCase,
        prompt,
        context: { projectInfo: project, notesCount: notes.length },
      };

      return this.generateContent(req, res);
    } catch (error) {
      console.error("Erro ao analisar projeto:", error);
      res.status(500).json({
        error: "Erro ao analisar projeto",
        message: error.message,
      });
    }
  }

  /**
   * POST /api/ai/research
   * Realiza pesquisa usando Perplexity
   */
  async research(req, res) {
    try {
      const { query, recencyFilter = "month" } = req.body;

      if (!query) {
        return res.status(400).json({ error: "query é obrigatória" });
      }

      req.body = {
        useCase: "research_assistant",
        prompt: query,
        provider: AI_PROVIDERS.PERPLEXITY,
        context: { searchRecencyFilter: recencyFilter },
      };

      return this.generateContent(req, res);
    } catch (error) {
      console.error("Erro na pesquisa:", error);
      res.status(500).json({
        error: "Erro ao realizar pesquisa",
        message: error.message,
      });
    }
  }

  /**
   * GET /api/ai/use-cases
   * Lista casos de uso disponíveis
   */
  async listUseCases(req, res) {
    try {
      const { useCases } = require("@/services/ai-server/ai-config");
      
      res.json({
        success: true,
        useCases: {
          gemini: useCases[AI_PROVIDERS.GEMINI],
          perplexity: useCases[AI_PROVIDERS.PERPLEXITY],
        },
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
    {"type": "heading", "text": "Título da seção"},
    {"type": "paragraph", "text": "Conteúdo do parágrafo"},
    {"type": "list", "text": "Item da lista"}
  ]
}

Tipos de blocos permitidos: heading, paragraph, list, code, quote
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
  }${context.includeNotes ? `,
  "notes": [
    {
      "title": "Título da nota",
      "description": "Descrição da nota",
      "tags": ["tag1", "tag2"]
    }
  ]` : ''}
}`,

      create_blocks: `${originalPrompt}

IMPORTANTE: Retorne APENAS um JSON válido, sem texto adicional, seguindo esta estrutura exata:
{
  "blocks": [
    {"type": "heading", "text": "Título", "properties": {}},
    {"type": "paragraph", "text": "Conteúdo", "properties": {}},
    {"type": "list", "text": "Item", "properties": {}}
  ]
}

Tipos permitidos: heading, paragraph, list, code, quote`,

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

Inclua apenas os campos que devem ser atualizados.`
    };

    return actionPrompts[action] || originalPrompt;
  }

  /**
   * Executa ações de criar/atualizar dados baseado na resposta da IA
   * @private
   */
  async _executeAction(userId, action, aiResponse, context) {
    const blocksRepository = require("@/repositories/blocks-manager");

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

          const note = await notesRepository.createNotesQuerie(
            userId,
            parsedResponse.title,
            parsedResponse.description,
            uniqueTags
          );

          // Cria blocos se fornecidos
          let blocks = [];
          if (
            context.includeBlocks !== false &&
            parsedResponse.blocks &&
            parsedResponse.blocks.length > 0
          ) {
            for (let i = 0; i < parsedResponse.blocks.length; i++) {
              const blockData = parsedResponse.blocks[i];
              const block = await blocksRepository.createBlock({
                noteId: note.id,
                userId: userId,
                type: blockData.type || "paragraph",
                text: blockData.text || "",
                position: i,
                properties: blockData.properties || {},
              });
              blocks.push(block);
            }
          }

          return {
            type: "note",
            note,
            blocks: blocks.length > 0 ? blocks : null,
          };
        }

        case "create_project": {
          // Cria projeto
          const project = await projectsRepository.createProject(
            userId,
            parsedResponse.title,
            parsedResponse.description,
            parsedResponse.status || "ativo",
            parsedResponse.properties || {}
          );

          // Cria notas associadas se fornecidas
          let notes = [];
          if (
            context.includeNotes &&
            parsedResponse.notes &&
            parsedResponse.notes.length > 0
          ) {
            for (const noteData of parsedResponse.notes) {
              const note = await notesRepository.createNotesQuerie(
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
          // Cria blocos em uma nota existente
          if (!context.noteId) {
            throw new Error("noteId é obrigatório para criar blocos");
          }

          const blocks = [];
          if (parsedResponse.blocks && parsedResponse.blocks.length > 0) {
            for (let i = 0; i < parsedResponse.blocks.length; i++) {
              const blockData = parsedResponse.blocks[i];
              const block = await blocksRepository.createBlock({
                noteId: context.noteId,
                userId: userId,
                type: blockData.type || "paragraph",
                text: blockData.text || "",
                position: blockData.position || i,
                properties: blockData.properties || {},
              });
              blocks.push(block);
            }
          }

          return {
            type: "blocks",
            noteId: context.noteId,
            blocks,
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
   * Enriquece o contexto com dados do usuário
   * @private
   */
  async _enrichContext(userId, context) {
    const enriched = { ...context };

    // Adiciona informações de notas recentes se necessário
    if (!context.recentNotes && userId) {
      try {
        const notes = await notesRepository.getAllNotesByUserId(userId);
        enriched.recentNotes = notes.slice(0, 5).map((n) => ({
          id: n.id,
          title: n.title,
          tags: n.tags,
        }));
      } catch (error) {
        console.warn("Não foi possível carregar notas recentes:", error.message);
      }
    }

    return enriched;
  }

  /**
   * Enriquece o contexto especificamente para chat
   * @private
   */
  async _enrichChatContext(userId, context) {
    const enriched = { ...context };

    try {
      // Busca notas recentes do usuário (últimas 10)
      const notes = await notesRepository.getAllNotesByUserId(userId);
      enriched.userNotes = notes.slice(0, 10).map(note => ({
        id: note.id,
        title: note.title,
        description: note.description?.substring(0, 200), // Resumo
        tags: note.tags || [],
        status: note.status,
        updated_at: note.updated_at,
      }));

      // Busca projetos ativos do usuário
      const projects = await projectsRepository.getProjectsByUserId(userId);
      enriched.userProjects = projects
        .filter(p => p.status === "ativo")
        .slice(0, 10)
        .map(project => ({
          id: project.id,
          title: project.title,
          description: project.description?.substring(0, 200),
          status: project.status,
          properties: project.properties,
        }));

      // Estatísticas de uso
      enriched.stats = {
        totalNotes: notes.length,
        totalProjects: projects.length,
        activeProjects: projects.filter(p => p.status === "ativo").length,
      };

      // Tags mais usadas
      const allTags = notes.flatMap(n => n.tags || []);
      const tagCounts = {};
      allTags.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
      enriched.popularTags = Object.entries(tagCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([tag]) => tag);

    } catch (error) {
      console.warn("Erro ao enriquecer contexto do chat:", error.message);
    }

    return enriched;
  }

  /**
   * GET /api/ai/models
   * Lista modelos de IA disponíveis
   */
  async getAvailableModels(req, res) {
    try {
      const { useCases } = require("@/services/ai-server/ai-config");
      const geminiAvailable = !!process.env.GEMINI_API_KEY;
      const perplexityAvailable = !!process.env.PERPLEXITY_API_KEY;

      const models = [
        {
          id: "gemini",
          name: "Gemini Flash 2.0",
          provider: "gemini",
          description: "Modelo rápido e eficiente para criação de conteúdo e análise",
          capabilities: [
            "Geração de texto",
            "Análise de conteúdo",
            "Sugestões criativas",
            "Formatação estruturada"
          ],
          useCases: useCases[AI_PROVIDERS.GEMINI] || [],
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
            "Verificação de fatos"
          ],
          useCases: useCases[AI_PROVIDERS.PERPLEXITY] || [],
          isAvailable: perplexityAvailable,
        },
      ];

      res.json({
        success: true,
        models: models.filter(m => m.isAvailable),
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
  async sendChatMessage(req, res) {
    try {
      const userId = req.user?.userId;
      const { message, model, sessionId, context = {} } = req.body;

      if (!message || !model) {
        return res.status(400).json({
          success: false,
          error: "Mensagem e modelo são obrigatórios",
        });
      }

      const chatRepository = require("@/repositories/chat-manager");

      // Cria ou obtém sessão
      let currentSessionId = sessionId;
      if (!currentSessionId) {
        const session = await chatRepository.createSession(userId);
        currentSessionId = session.id;
      }

      // Enriquece contexto com notas e projetos do usuário
      const enrichedContext = await this._enrichChatContext(userId, context);

      // Salva mensagem do usuário
      await chatRepository.saveMessage({
        sessionId: currentSessionId,
        userId,
        role: "user",
        content: message,
        model,
        metadata: context,
      });

      // Determina provider
      const provider = model === "perplexity" ? AI_PROVIDERS.PERPLEXITY : AI_PROVIDERS.GEMINI;

      // Constrói system message com contexto enriquecido
      const systemMessage = buildSystemMessage("chat", enrichedContext);

      // Chama IA
      const aiResponse = await callAIProvider(provider, message, systemMessage);

      // Salva resposta da IA
      const assistantMessage = await chatRepository.saveMessage({
        sessionId: currentSessionId,
        userId,
        role: "assistant",
        content: typeof aiResponse === "string" ? aiResponse : aiResponse.content,
        model,
        metadata: aiResponse.citations ? { citations: aiResponse.citations } : {},
      });

      // Atualiza título da sessão se for a primeira mensagem
      const messageCount = await chatRepository.getSessionMessageCount(currentSessionId);
      if (messageCount === 2) {
        const title = message.substring(0, 50) + (message.length > 50 ? "..." : "");
        await chatRepository.updateSessionTitle(currentSessionId, title);
      }

      res.json({
        success: true,
        message: assistantMessage,
        sessionId: currentSessionId,
      });
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      res.status(500).json({
        success: false,
        error: "Erro ao processar mensagem",
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

      const chatRepository = require("@/repositories/chat-manager");

      if (sessionId) {
        // Busca mensagens de uma sessão específica
        const messages = await chatRepository.getSessionMessages(sessionId, userId);
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
