/* eslint-disable sort-keys */
const axios = require("axios");
const agentRepository = require("@/modules/weave-ai/repositories/agents.repository");
const {
  normalizeAgentData,
  formatAgentResponse,
  mergeAgentUpdates,
  ensureArrayField,
} = require("@/modules/weave-ai/normalize");
const spacesService = require("@/services/storage");

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

/**
 * Controller para gerenciamento User Agents no Weave AI.
 *
 * Criar, atualizar, deletar, compartilhar e buscar agentes.
 * Lida com upload de arquivos de conhecimento e integração com o serviço de armazenamento.
 *
 * Endpoints:
 * - POST /agents: Criar um novo agente
 * - PUT /agents/:id: Atualizar um agente existente
 * - DELETE /agents/:id: Deletar um agente
 * - POST /agents/:id/share: Compartilhar um agente com outros usuários
 * - GET /agents: Listar agentes do usuário
 * - GET /agents/:id: Obter detalhes de um agente específico
 */
class agentsController {
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
   * Cria um novo agente para o usuário autenticado.
   */
  async createUserAgent(req, res) {
    try {
      const userId = this._validateAuthentication(req);
      const {
        name,
        description,
        instructions,
        role,
        tone,
        language,
        avatar_url,
        tags,
        model_provider,
        model_name,
        tools,
      } = req.body;

      if (
        !name ||
        !description ||
        !instructions ||
        !model_provider ||
        !model_name
      ) {
        return res.status(400).json({
          success: false,
          error:
            "name, description, instructions, model_provider e model_name são obrigatórios",
        });
      }

      const agentData = normalizeAgentData({
        name,
        description,
        instructions,
        role,
        tone,
        language,
        avatar_url,
        tags: tags ? (typeof tags === "string" ? JSON.parse(tags) : tags) : [],
        model_provider,
        model_name,
        tools: tools
          ? typeof tools === "string"
            ? JSON.parse(tools)
            : tools
          : [], // Handle tools if sent as JSON string or array
      });

      // Processar upload de arquivos de conhecimento se houver
      if (req.files && req.files.length > 0) {
        const knowledgeFiles = [];

        for (const file of req.files) {
          const extension = file.originalname.split(".").pop();
          const uniqueName = spacesService.generateUniqueFileName(extension);

          // Caminho: agents/files/<agent_id_placeholder>/<filename>
          // Como ainda não temos o ID do agente, usaremos uma pasta temporária ou estruturar diferente.
          // Melhor abordagem: usar o userId como prefixo ou gerar uuid aqui.
          // Mas o spacesService espera um caminho relativo à pasta raiz configurada.

          // Vamos fazer upload para agents/files/temp_<timestamp>_<uuid> e depois moveremos ou idealmente
          // o createAgent retornaria o ID e faríamos o upload depois, mas para simplificar:
          // agents/files/<user_id>/<unique_name>

          const path = `agents/files/${userId}/${uniqueName}`;

          const fileUrl = await spacesService.uploadFile(
            file.buffer,
            path,
            file.mimetype
          );

          knowledgeFiles.push({
            original_name: file.originalname,
            storage_path: path,
            url: fileUrl,
            mime_type: file.mimetype,
            size: file.size,
            uploaded_at: new Date().toISOString(),
          });
        }

        // Adiciona à base de conhecimento do agente
        agentData.capabilities.knowledge_base.enabled = true;
        agentData.capabilities.knowledge_base.sources = knowledgeFiles;
      }

      const newAgent = await agentRepository.createAgent(userId, agentData);

      res.json({
        success: true,
        agent: formatAgentResponse(newAgent),
      });
    } catch (error) {
      if (error.statusCode === 401) {
        return res.status(401).json({ success: false, error: error.message });
      }
      console.error("Erro ao criar agente:", error);
      res.status(500).json({
        success: false,
        error: "Erro ao criar agente",
      });
    }
  }

  /**
   * Atualiza um agente existente do usuário.
   */
  async updateAgent(req, res) {
    try {
      const userId = this._validateAuthentication(req);
      const { id } = req.params;
      const updates = req.body || {};

      const agent = await agentRepository.getAgentById(id, userId);

      if (!agent) {
        return res
          .status(404)
          .json({ success: false, error: "Agente não encontrado" });
      }

      const parsedUpdates = {};
      const scalarFields = [
        "name",
        "description",
        "instructions",
        "role",
        "tone",
        "language",
        "avatar_url",
        "model_provider",
        "model_name",
      ];

      scalarFields.forEach((field) => {
        if (updates[field] !== undefined) {
          parsedUpdates[field] = updates[field];
        }
      });

      if (updates.tags !== undefined) {
        parsedUpdates.tags = ensureArrayField(updates.tags);
      }

      if (updates.tools !== undefined) {
        parsedUpdates.tools = ensureArrayField(updates.tools);
      }

      let knowledgeFiles = agent.knowledge_files;
      if (typeof knowledgeFiles === "string") {
        try {
          knowledgeFiles = JSON.parse(knowledgeFiles);
        } catch (error) {
          knowledgeFiles = [];
        }
      }

      if (!Array.isArray(knowledgeFiles)) {
        knowledgeFiles =
          agent.personality?.capabilities?.knowledge_base?.sources || [];
      }

      if (!Array.isArray(knowledgeFiles)) {
        knowledgeFiles = [];
      }

      if (req.files && req.files.length > 0) {
        for (const file of req.files) {
          const extension = file.originalname.split(".").pop();
          const uniqueName = spacesService.generateUniqueFileName(extension);
          const path = `agents/files/${userId}/${uniqueName}`;

          const fileUrl = await spacesService.uploadFile(
            file.buffer,
            path,
            file.mimetype
          );

          knowledgeFiles.push({
            original_name: file.originalname,
            storage_path: path,
            url: fileUrl,
            mime_type: file.mimetype,
            size: file.size,
            uploaded_at: new Date().toISOString(),
          });
        }
      }

      const mergedPersonality = mergeAgentUpdates(
        agent.personality,
        parsedUpdates
      );

      if (Array.isArray(knowledgeFiles)) {
        mergedPersonality.capabilities = mergedPersonality.capabilities || {};
        mergedPersonality.capabilities.knowledge_base = mergedPersonality
          .capabilities.knowledge_base || {
          enabled: false,
          sources: [],
          strategy: "similarity",
          rag_threshold: 0.7,
        };

        mergedPersonality.capabilities.knowledge_base.sources = knowledgeFiles;
        mergedPersonality.capabilities.knowledge_base.enabled =
          knowledgeFiles.length > 0;
      }

      const updatePayload = {
        personality: mergedPersonality,
      };

      if (Array.isArray(knowledgeFiles)) {
        updatePayload.knowledge_files = JSON.stringify(knowledgeFiles);
      }

      const updatedAgent = await agentRepository.updateAgent(
        id,
        userId,
        updatePayload
      );

      res.json({ success: true, agent: formatAgentResponse(updatedAgent) });
    } catch (error) {
      if (error.statusCode === 401) {
        return res.status(401).json({ success: false, error: error.message });
      }
      console.error("Erro ao atualizar agente:", error);
      res
        .status(500)
        .json({ success: false, error: "Erro ao atualizar agente" });
    }
  }

  /**
   * Remove um agente do usuário.
   */
  async deleteAgent(req, res) {
    try {
      const userId = this._validateAuthentication(req);
      const { id } = req.params;

      await agentRepository.deleteAgent(id, userId);
      res.json({ success: true, message: "Agente removido com sucesso" });
    } catch (error) {
      if (error.statusCode === 401) {
        return res.status(401).json({ success: false, error: error.message });
      }
      console.error("Erro ao deletar agente:", error);
      res.status(500).json({ success: false, error: "Erro ao deletar agente" });
    }
  }

  /**
   * Compartilha um agente com outros usuários.
   */
  async shareAgent(req, res) {
    try {
      const userId = this._validateAuthentication(req);
      const { id } = req.params;
      const { sharedWith } = req.body; // Array de { userId, permission }

      if (!Array.isArray(sharedWith)) {
        return res
          .status(400)
          .json({ success: false, error: "sharedWith deve ser um array" });
      }

      const updatedAgent = await agentRepository.shareAgent(
        id,
        userId,
        sharedWith
      );

      if (!updatedAgent) {
        return res.status(404).json({
          success: false,
          error: "Agente não encontrado ou sem permissão",
        });
      }

      res.json({ success: true, agent: formatAgentResponse(updatedAgent) });
    } catch (error) {
      if (error.statusCode === 401) {
        return res.status(401).json({ success: false, error: error.message });
      }
      console.error("Erro ao compartilhar agente:", error);
      res
        .status(500)
        .json({ success: false, error: "Erro ao compartilhar agente" });
    }
  }

  /**
   * Lista os agentes do usuário autenticado.
   */
  async getUserAgents(req, res) {
    try {
      const userId = this._validateAuthentication(req);
      const rawAgents = await agentRepository.getUserAgents(userId);

      const agents = rawAgents.map((agent) => formatAgentResponse(agent));

      res.json({
        success: true,
        agents,
      });
    } catch (error) {
      if (error.statusCode === 401) {
        return res.status(401).json({ success: false, error: error.message });
      }
      console.error("Erro ao buscar agentes:", error);
      res.status(500).json({
        success: false,
        error: "Erro ao buscar agentes",
      });
    }
  }

  /**
   * Obtém um agente específico do usuário.
   */
  async getAgentById(req, res) {
    try {
      const userId = this._validateAuthentication(req);
      const { id } = req.params;
      const agent = await agentRepository.getAgentById(id, userId);

      if (!agent) {
        return res
          .status(404)
          .json({ success: false, error: "Agente não encontrado" });
      }

      res.json({ success: true, agent: formatAgentResponse(agent) });
    } catch (error) {
      if (error.statusCode === 401) {
        return res.status(401).json({ success: false, error: error.message });
      }
      console.error("Erro ao buscar agente:", error);
      res.status(500).json({
        success: false,
        error: "Erro ao buscar agente",
      });
    }
  }

  async getProvidersAndModels(req, res) {
    this._validateAuthentication(req);

    try {
      const providers = Object.values(LLM_PROVIDERS).map((provider) => ({
        name: provider,
        models: LLM_MODELS[provider] || [],
      }));

      res.json({ status: "OK", providers });
    } catch (error) {
      console.error("Erro ao obter provedores e modelos:", error);
      res.status(500).json({
        success: false,
        error: "Erro ao obter provedores e modelos",
      });
    }
  }
}

module.exports = new agentsController();
