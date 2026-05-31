/* eslint-disable sort-keys */
const agentRepository = require("@/modules/weave-ai/repositories/agents.repository");
const {
  normalizeAgentPersonality,
  formatAgentResponse,
  mergePersonalityUpdates,
  ensureArrayField,
} = require("@/modules/weave-ai/normalize");
const { getProvidersWithModels } = require("@/modules/weave-ai/llm-catalog");
const spacesService = require("@/services/storage");
const { AppError } = require("@/errors");

/**
 * Controller for User Agent management in Weave AI.
 *
 * Endpoints:
 * - POST   /agents              → createUserAgent
 * - GET    /agents              → getUserAgents
 * - GET    /agents/:id          → getAgentById
 * - PUT    /agents/:id          → updateAgent
 * - DELETE /agents/:id          → deleteAgent
 * - POST   /agents/:id/share    → shareAgent
 * - PUT    /agents/:id/project  → assignToProject
 * - DELETE /agents/:id/project  → unassignFromProject
 * - PATCH  /agents/:id/active   → toggleActive
 * - POST   /agents/:id/duplicate → duplicateAgent
 */
class AgentsController {
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
   * Creates a new agent for the authenticated user.
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
        rules,
        project_id,
      } = req.body;

      if (!name || !model_provider || !model_name) {
        return res.status(400).json({
          success: false,
          error: "name, model_provider e model_name são obrigatórios",
        });
      }

      const personality = normalizeAgentPersonality({
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
          : [],
        rules: rules
          ? typeof rules === "string"
            ? JSON.parse(rules)
            : rules
          : [],
      });

      // Process knowledge file uploads if present
      if (req.files && req.files.length > 0) {
        const knowledgeFiles = await this._processKnowledgeFileUploads(
          req.files,
          userId
        );
        personality.capabilities.knowledge_base.enabled = true;
        personality.capabilities.knowledge_base.sources = knowledgeFiles;
      }

      const newAgent = await agentRepository.createAgent(userId, {
        name,
        description: description || null,
        projectId: project_id || null,
        isActive: true,
        personality,
      });

      res.json({
        success: true,
        agent: formatAgentResponse(newAgent),
      });
    } catch (error) {
      if (error.statusCode === 401) {
        return res.status(401).json({
          success: false,
          error: AppError.unauthorized().message,
        });
      }
      console.error("Erro ao criar agente:", error);
      res.status(500).json({
        success: false,
        error: "Erro ao criar agente",
      });
    }
  }

  /**
   * Updates an existing agent.
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

      // Build the column-level updates
      const columnUpdates = {};

      if (updates.name !== undefined) {
        columnUpdates.name = updates.name;
      }
      if (updates.description !== undefined) {
        columnUpdates.description = updates.description;
      }
      if (updates.project_id !== undefined) {
        columnUpdates.project_id = updates.project_id || null;
      }
      if (updates.is_active !== undefined) {
        columnUpdates.is_active = updates.is_active;
      }

      // Build the personality-level updates
      const personalityFields = [
        "instructions",
        "rules",
        "role",
        "tone",
        "language",
        "avatar_url",
        "model_provider",
        "model_name",
        "tags",
        "tools",
      ];

      const personalityUpdates = {};
      personalityFields.forEach((field) => {
        if (updates[field] !== undefined) {
          personalityUpdates[field] = updates[field];
        }
      });

      // Merge personality if any personality-level updates exist
      if (Object.keys(personalityUpdates).length > 0) {
        columnUpdates.personality = mergePersonalityUpdates(
          agent.personality,
          personalityUpdates
        );
      }

      // Process knowledge file uploads if present
      let knowledgeFiles = this._parseKnowledgeFiles(agent);

      if (req.files && req.files.length > 0) {
        const newFiles = await this._processKnowledgeFileUploads(
          req.files,
          userId
        );
        knowledgeFiles = [...knowledgeFiles, ...newFiles];
      }

      if (knowledgeFiles.length > 0) {
        const personality =
          columnUpdates.personality || agent.personality || {};
        personality.capabilities = personality.capabilities || {};
        personality.capabilities.knowledge_base = personality.capabilities
          .knowledge_base || {
          enabled: false,
          sources: [],
          strategy: "similarity",
          rag_threshold: 0.7,
        };
        personality.capabilities.knowledge_base.sources = knowledgeFiles;
        personality.capabilities.knowledge_base.enabled = true;
        columnUpdates.personality = personality;
        columnUpdates.knowledge_files = JSON.stringify(knowledgeFiles);
      }

      if (Object.keys(columnUpdates).length === 0) {
        return res.json({ success: true, agent: formatAgentResponse(agent) });
      }

      const updatedAgent = await agentRepository.updateAgent(
        id,
        userId,
        columnUpdates
      );

      res.json({ success: true, agent: formatAgentResponse(updatedAgent) });
    } catch (error) {
      if (error.statusCode === 401) {
        return res.status(401).json({
          success: false,
          error: AppError.unauthorized().message,
        });
      }
      console.error("Erro ao atualizar agente:", error);
      res
        .status(500)
        .json({ success: false, error: "Erro ao atualizar agente" });
    }
  }

  /**
   * Deletes an agent.
   */
  async deleteAgent(req, res) {
    try {
      const userId = this._validateAuthentication(req);
      const { id } = req.params;

      await agentRepository.deleteAgent(id, userId);
      res.json({ success: true, message: "Agente removido com sucesso" });
    } catch (error) {
      if (error.statusCode === 401) {
        return res.status(401).json({
          success: false,
          error: AppError.unauthorized().message,
        });
      }
      console.error("Erro ao deletar agente:", error);
      res.status(500).json({ success: false, error: "Erro ao deletar agente" });
    }
  }

  /**
   * Shares an agent with other users.
   */
  async shareAgent(req, res) {
    try {
      const userId = this._validateAuthentication(req);
      const { id } = req.params;
      const { sharedWith } = req.body;

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
        return res.status(401).json({
          success: false,
          error: AppError.unauthorized().message,
        });
      }
      console.error("Erro ao compartilhar agente:", error);
      res
        .status(500)
        .json({ success: false, error: "Erro ao compartilhar agente" });
    }
  }

  /**
   * Lists agents for the authenticated user with optional filters.
   * Query params: ?projectId=, ?isActive=, ?search=
   */
  async getUserAgents(req, res) {
    try {
      const userId = this._validateAuthentication(req);

      const filters = {};
      if (req.query.projectId) {
        filters.projectId = req.query.projectId;
      }
      if (req.query.isActive !== undefined) {
        filters.isActive = req.query.isActive === "true";
      }
      if (req.query.search) {
        filters.search = req.query.search;
      }

      const rawAgents = await agentRepository.getUserAgents(userId, filters);
      const agents = rawAgents.map((agent) => formatAgentResponse(agent));

      res.json({
        success: true,
        agents,
      });
    } catch (error) {
      if (error.statusCode === 401) {
        return res.status(401).json({
          success: false,
          error: AppError.unauthorized().message,
        });
      }
      console.error("Erro ao buscar agentes:", error);
      res.status(500).json({
        success: false,
        error: "Erro ao buscar agentes",
      });
    }
  }

  /**
   * Gets a single agent by ID.
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
        return res.status(401).json({
          success: false,
          error: AppError.unauthorized().message,
        });
      }
      console.error("Erro ao buscar agente:", error);
      res.status(500).json({
        success: false,
        error: "Erro ao buscar agente",
      });
    }
  }

  /**
   * Assigns an agent to a project.
   * PUT /agents/:id/project
   * Body: { projectId: "uuid" }
   */
  async assignToProject(req, res) {
    try {
      const userId = this._validateAuthentication(req);
      const { id } = req.params;
      const { projectId } = req.body;

      if (!projectId) {
        return res
          .status(400)
          .json({ success: false, error: "projectId é obrigatório" });
      }

      const updatedAgent = await agentRepository.assignToProject(
        id,
        userId,
        projectId
      );

      if (!updatedAgent) {
        return res
          .status(404)
          .json({ success: false, error: "Agente não encontrado" });
      }

      res.json({ success: true, agent: formatAgentResponse(updatedAgent) });
    } catch (error) {
      if (error.statusCode === 401) {
        return res.status(401).json({
          success: false,
          error: AppError.unauthorized().message,
        });
      }
      console.error("Erro ao vincular agente ao projeto:", error);
      res
        .status(500)
        .json({ success: false, error: "Erro ao vincular agente ao projeto" });
    }
  }

  /**
   * Removes an agent from its project.
   * DELETE /agents/:id/project
   */
  async unassignFromProject(req, res) {
    try {
      const userId = this._validateAuthentication(req);
      const { id } = req.params;

      const updatedAgent = await agentRepository.unassignFromProject(
        id,
        userId
      );

      if (!updatedAgent) {
        return res
          .status(404)
          .json({ success: false, error: "Agente não encontrado" });
      }

      res.json({ success: true, agent: formatAgentResponse(updatedAgent) });
    } catch (error) {
      if (error.statusCode === 401) {
        return res.status(401).json({
          success: false,
          error: AppError.unauthorized().message,
        });
      }
      console.error("Erro ao desvincular agente do projeto:", error);
      res.status(500).json({
        success: false,
        error: "Erro ao desvincular agente do projeto",
      });
    }
  }

  /**
   * Toggles the active state of an agent.
   * PATCH /agents/:id/active
   * Body: { isActive: boolean }
   */
  async toggleActive(req, res) {
    try {
      const userId = this._validateAuthentication(req);
      const { id } = req.params;
      const { isActive } = req.body;

      if (typeof isActive !== "boolean") {
        return res
          .status(400)
          .json({ success: false, error: "isActive deve ser boolean" });
      }

      const updatedAgent = await agentRepository.toggleActive(
        id,
        userId,
        isActive
      );

      if (!updatedAgent) {
        return res
          .status(404)
          .json({ success: false, error: "Agente não encontrado" });
      }

      res.json({ success: true, agent: formatAgentResponse(updatedAgent) });
    } catch (error) {
      if (error.statusCode === 401) {
        return res.status(401).json({
          success: false,
          error: AppError.unauthorized().message,
        });
      }
      console.error("Erro ao alternar estado do agente:", error);
      res
        .status(500)
        .json({ success: false, error: "Erro ao alternar estado do agente" });
    }
  }

  /**
   * Duplicates an existing agent.
   * POST /agents/:id/duplicate
   */
  async duplicateAgent(req, res) {
    try {
      const userId = this._validateAuthentication(req);
      const { id } = req.params;

      const duplicated = await agentRepository.duplicateAgent(id, userId);

      if (!duplicated) {
        return res
          .status(404)
          .json({ success: false, error: "Agente não encontrado" });
      }

      res.json({ success: true, agent: formatAgentResponse(duplicated) });
    } catch (error) {
      if (error.statusCode === 401) {
        return res.status(401).json({
          success: false,
          error: AppError.unauthorized().message,
        });
      }
      console.error("Erro ao duplicar agente:", error);
      res
        .status(500)
        .json({ success: false, error: "Erro ao duplicar agente" });
    }
  }

  /**
   * Returns available LLM providers and models.
   */
  async getProvidersAndModels(req, res) {
    this._validateAuthentication(req);

    try {
      const providers = getProvidersWithModels();
      res.json({ status: "OK", providers });
    } catch (error) {
      console.error("Erro ao obter provedores e modelos:", error);
      res.status(500).json({
        success: false,
        error: "Erro ao obter provedores e modelos",
      });
    }
  }

  // ── Private helpers ────────────────────────────────────────────────

  /**
   * Processes knowledge file uploads and returns metadata array.
   *
   * @param {Array} files - Multer files array
   * @param {string} userId
   * @returns {Promise<Array>}
   */
  async _processKnowledgeFileUploads(files, userId) {
    const knowledgeFiles = [];

    for (const file of files) {
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

    return knowledgeFiles;
  }

  /**
   * Parses knowledge_files from an agent row.
   *
   * @param {object} agent
   * @returns {Array}
   */
  _parseKnowledgeFiles(agent) {
    let knowledgeFiles = agent.knowledge_files;

    if (typeof knowledgeFiles === "string") {
      try {
        knowledgeFiles = JSON.parse(knowledgeFiles);
      } catch {
        knowledgeFiles = [];
      }
    }

    if (!Array.isArray(knowledgeFiles)) {
      knowledgeFiles =
        agent.personality?.capabilities?.knowledge_base?.sources || [];
    }

    return Array.isArray(knowledgeFiles) ? knowledgeFiles : [];
  }
}

module.exports = new AgentsController();
