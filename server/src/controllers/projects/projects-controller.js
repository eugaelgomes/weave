const projectsRepository = require("@/repositories/projetcs");

class ProjectsController {
  constructor() {
    this.projectsRepository = projectsRepository;
  }

  // ========================================
  // MÉTODOS UTILITÁRIOS E VALIDAÇÃO
  // ========================================

  /**
   * Valida e sanitiza properties do projeto
   * @param {Object} properties - Properties a serem validadas
   * @returns {Object} - Properties validadas
   * @throws {Error} - Se houver valores inválidos
   */
  _validateProperties(properties) {
    if (!properties || typeof properties !== "object") {
      return {};
    }

    const allowedProps = ["priority", "tags", "estimated_time", "complexity", "color", "icon"];
    const validPriorities = ["alta", "media", "baixa"];
    const validComplexities = ["alta", "media", "baixa"];

    const validated = {};

    // Validar cada propriedade
    for (const [key, value] of Object.entries(properties)) {
      // Ignorar progress - será calculado automaticamente
      if (key === "progress") {
        continue;
      }

      // Aceitar apenas propriedades permitidas
      if (!allowedProps.includes(key)) {
        throw new Error(`Propriedade '${key}' não é permitida`);
      }

      // Validar priority
      if (key === "priority") {
        if (value !== null && !validPriorities.includes(value)) {
          throw new Error("Priority deve ser: 'alta', 'media' ou 'baixa'");
        }
        validated[key] = value;
      }

      // Validar complexity
      else if (key === "complexity") {
        if (value !== null && !validComplexities.includes(value)) {
          throw new Error("Complexity deve ser: 'alta', 'media' ou 'baixa'");
        }
        validated[key] = value;
      }

      // Validar tags (deve ser array)
      else if (key === "tags") {
        if (value !== null && !Array.isArray(value)) {
          throw new Error("Tags deve ser um array");
        }
        validated[key] = value || [];
      }

      // Validar estimated_time (deve ser ISO string ou null)
      else if (key === "estimated_time") {
        if (value !== null) {
          const date = new Date(value);
          if (isNaN(date.getTime())) {
            throw new Error("estimated_time deve ser uma data válida (ISO 8601)");
          }
        }
        validated[key] = value;
      }

      // Validar color (deve ser hex válido)
      else if (key === "color") {
        if (value !== null) {
          const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
          if (!hexRegex.test(value)) {
            throw new Error("Color deve ser uma cor hexadecimal válida (ex: #ff0000)");
          }
        }
        validated[key] = value;
      }

      // Validar icon (deve ser string de emoji ou null)
      else if (key === "icon") {
        if (value !== null && typeof value !== "string") {
          throw new Error("Icon deve ser uma string (emoji)");
        }
        validated[key] = value;
      }
    }

    return validated;
  }

  /**
   * Valida se o usuário está autenticado
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @returns {Object|null} - Retorna o userId se válido, ou envia erro HTTP
   */
  _validateAuthentication(req, res) {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ error: "Usuário não autenticado" });
      return null;
    }

    return userId;
  }

  /**
   * Valida e verifica propriedade do projeto
   * @param {string} projectId - ID do projeto
   * @param {string} userId - ID do usuário
   * @returns {Object} - Projeto encontrado
   * @throws {Error} - Se projeto não existir ou não pertencer ao usuário
   */
  async _validateProjectOwnership(projectId, userId) {
    if (!projectId) {
      throw new Error("ID do projeto é obrigatório");
    }

    const result = await this.projectsRepository.getProjectById(
      projectId,
      userId
    );

    if (!result || result.length === 0) {
      throw new Error("Projeto não encontrado");
    }

    return result[0];
  }

  /**
   * Valida se o usuário tem acesso ao projeto (como dono ou colaborador)
   * @param {string} projectId - ID do projeto
   * @param {string} userId - ID do usuário
   * @returns {Object} - Projeto encontrado com dados completos
   * @throws {Error} - Se projeto não existir ou usuário não tiver acesso
   */
  async _validateProjectAccess(projectId, userId) {
    if (!projectId) {
      throw new Error("ID do projeto é obrigatório");
    }

    const result = await this.projectsRepository.getProjectByIdWithAccess(
      projectId,
      userId
    );

    if (!result || result.length === 0) {
      throw new Error("Projeto não encontrado ou você não tem acesso");
    }

    return result[0];
  }

  /**
   * Formata a resposta padrão de um projeto
   * @param {Object} project - Dados do projeto do banco
   * @returns {Object} - Projeto formatado
   */
  _formatProjectResponse(project) {
    return {
      id: project.id,
      user_id: project.user_id,
      title: project.title,
      description: project.description,
      properties: project.properties || {},
      status: project.status,
      created_at: project.created_at,
      updated_at: project.updated_at,
      deleted: project.deleted,
    };
  }

  /**
   * Trata erros específicos e retorna resposta HTTP apropriada
   * @param {Error} error - Erro capturado
   * @param {Object} res - Response object
   * @param {Function} next - Next middleware function
   */
  _handleError(error, res, next) {
    const errorMessage = error.message;

    // Erros de validação (400 Bad Request)
    if (errorMessage.includes("obrigatório")) {
      return res.status(400).json({ error: errorMessage });
    }

    // Erros de autorização e não encontrado (404 Not Found)
    if (
      errorMessage.includes("não encontrado") ||
      errorMessage.includes("Acesso negado")
    ) {
      return res.status(404).json({ error: errorMessage });
    }

    // Outros erros passam para o middleware de erro global
    next(error);
  }

  // ========================================
  // ENDPOINTS DA API
  // ========================================

  /**
   * GET /api/projects - Buscar todos os projetos do usuário
   * Lista todos os projetos pertencentes ao usuário autenticado com dados completos
   */
  async getAllProjects(req, res, next) {
    try {
      // Validação de autenticação
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      // Buscar projetos completos
      const projects = await this.projectsRepository.getAllProjects(userId);

      // Formatar projetos com todos os dados
      const formattedProjects = projects.map((project) => ({
        id: project.id,
        user_id: project.user_id,
        title: project.title,
        description: project.description,
        properties: project.properties || {},
        status: project.status,
        created_at: project.created_at,
        updated_at: project.updated_at,
        deleted: project.deleted,
        owner: {
          id: project.user_id,
          username: project.owner_username,
          email: project.owner_email,
          name: project.owner_name,
          avatar_url: project.owner_avatar_url,
        },
        collaborators: (project.collaborators || []).filter(c => !c.removed),
        notes: project.associated_notes || [],
      }));

      res.status(200).json({ projects: formattedProjects });
    } catch (error) {
      this._handleError(error, res, next);
    }
  }

  /**
   * GET /api/projects/:id - Buscar um projeto específico
   * Retorna os detalhes de um projeto específico se o usuário tiver acesso (dono ou colaborador)
   */
  async getProjectById(req, res, next) {
    try {
      const { id } = req.params;

      // Validação de autenticação
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      // Validação de acesso ao projeto (dono ou colaborador)
      const project = await this._validateProjectAccess(id, userId);

      // Formatar e retornar o projeto com dados completos
      const formattedProject = {
        id: project.id,
        user_id: project.user_id,
        title: project.title,
        description: project.description,
        properties: project.properties || {},
        status: project.status,
        created_at: project.created_at,
        updated_at: project.updated_at,
        deleted: project.deleted,
        owner: {
          id: project.user_id,
          username: project.owner_username,
          email: project.owner_email,
          name: project.owner_name,
          avatar_url: project.owner_avatar_url,
        },
        collaborators: (project.collaborators || []).filter(c => !c.removed),
        notes: project.associated_notes || [],
      };

      res.status(200).json(formattedProject);
    } catch (error) {
      this._handleError(error, res, next);
    }
  }

  /**
   * GET /api/projects/with-user - Buscar projetos com informações do usuário
   * Lista todos os projetos com dados completos do proprietário
   */
  async getProjectsWithUserInfo(req, res, next) {
    try {
      // Validação de autenticação
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      // Buscar projetos com informações do usuário
      const projects =
        await this.projectsRepository.getProjectsWithUserInfo(userId);
      
      if (!projects || projects.length === 0) {
        return res.status(200).json({ projects: [] });
      }

      // Formatar projetos com informações do proprietário
      const formattedProjects = projects.map((project) => ({
        id: project.id,
        title: project.title,
        description: project.description,
        properties: project.properties || {},
        status: project.status,
        created_at: project.created_at,
        updated_at: project.updated_at,
        owner: {
          id: project.owner_id,
          username: project.owner_username,
          email: project.owner_email,
        },
      }));

      res.status(200).json({ projects: formattedProjects });
    } catch (error) {
      this._handleError(error, res, next);
    }
  }

  /**
   * POST /api/projects - Criar um novo projeto
   * Cria um novo projeto para o usuário autenticado
   */
  async createProject(req, res, next) {
    try {
      const { title, description, status, properties } = req.body;

      // Validação de autenticação
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      // Validação de dados obrigatórios
      if (!title) {
        throw new Error("Título é obrigatório");
      }

      // Validar properties se fornecidas
      const validatedProps = properties ? this._validateProperties(properties) : {};

      // Criação do projeto
      const result = await this.projectsRepository.createProject(
        userId,
        title,
        description,
        status,
        validatedProps
      );

      if (!result || result.length === 0) {
        throw new Error("Falha ao criar projeto");
      }

      const newProject = result[0];

      // Formatar e retornar o projeto criado
      const formattedProject = this._formatProjectResponse(newProject);
      res.status(201).json(formattedProject);
    } catch (error) {
      this._handleError(error, res, next);
    }
  }

  /**
   * PUT /api/projects/:id - Atualizar um projeto (consolidado)
   * Atualiza campos do projeto incluindo: title, description, status, properties
   * Apenas os campos enviados são atualizados, os demais permanecem intactos
   */
  async updateProject(req, res, next) {
    try {
      const { id } = req.params;
      const { title, description, status, properties, ...rest } = req.body;

      // Validação de autenticação
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      // Validação de propriedade do projeto
      await this._validateProjectOwnership(id, userId);

      // Construir objeto de atualização apenas com campos enviados
      const updates = {};
      if (title !== undefined) updates.title = title;
      if (description !== undefined) updates.description = description;
      if (status !== undefined) updates.status = status;
      
      // Se properties foi enviado, validar e fazer merge com existente
      if (properties !== undefined) {
        const validatedProps = this._validateProperties(properties);
        updates.properties = validatedProps;
      }

      // Verifica se há algo para atualizar
      if (Object.keys(updates).length === 0) {
        return res.status(400).json({
          error: "Nenhum campo válido fornecido para atualização",
        });
      }

      // Atualização do projeto
      const result = await this.projectsRepository.updateProject(
        id,
        userId,
        updates
      );

      if (!result || result.length === 0) {
        return res.status(400).json({
          error: "Nenhuma atualização foi realizada",
        });
      }

      const updatedProject = result[0];

      // Formatar e retornar o projeto atualizado
      const formattedProject = this._formatProjectResponse(updatedProject);
      res.status(200).json({
        message: "Projeto atualizado com sucesso",
        project: formattedProject,
      });
    } catch (error) {
      this._handleError(error, res, next);
    }
  }

  /**
   * DELETE /api/projects/:id - Deletar um projeto
   * Remove um projeto (soft delete)
   */
  async deleteProject(req, res, next) {
    try {
      const { id } = req.params;

      // Validação de autenticação
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      // Validação de propriedade do projeto
      await this._validateProjectOwnership(id, userId);

      // Exclusão do projeto (soft delete)
      const result = await this.projectsRepository.deleteProject(id, userId);

      if (!result || result.length === 0) {
        throw new Error("Falha ao deletar projeto");
      }

      res.status(200).json({
        message: "Projeto deletado com sucesso",
      });
    } catch (error) {
      this._handleError(error, res, next);
    }
  }

  // ========================================
  // ENDPOINTS PARA GERENCIAMENTO DE COLABORADORES
  // ========================================

  /**
   * PUT /api/projects/:projectId/collaborators - Gerenciar colaboradores (consolidado)
   * Adiciona, atualiza permissão ou remove colaboradores
   * Body: { action: 'add' | 'update' | 'remove', userId, permission? }
   */
  async manageCollaborators(req, res, next) {
    try {
      const { projectId } = req.params;
      const { action, userId: collaboratorId, permission = "viewer" } = req.body;

      // Validação de autenticação
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      // Verificar se o projeto existe e pertence ao usuário
      await this._validateProjectOwnership(projectId, userId);

      // Validação de dados obrigatórios
      if (!action || !["add", "update", "remove"].includes(action)) {
        throw new Error("Ação inválida. Use 'add', 'update' ou 'remove'");
      }

      if (!collaboratorId) {
        throw new Error("ID do colaborador é obrigatório");
      }

      let result;
      let message;

      switch (action) {
        case "add":
          // Validar permissão
          const validPermissions = ["admin", "viewer"];
          if (!validPermissions.includes(permission)) {
            throw new Error("Permissão inválida. Use 'admin' ou 'viewer'");
          }

          // Verificar se o usuário não está tentando adicionar a si mesmo
          if (collaboratorId === userId) {
            throw new Error("Você não pode adicionar a si mesmo como colaborador");
          }

          // Verificar se o colaborador já está ativo
          const isAlready = await this.projectsRepository.isCollaborator(
            projectId,
            collaboratorId
          );

          if (isAlready) {
            throw new Error("Usuário já é colaborador deste projeto");
          }

          result = await this.projectsRepository.addCollaborator(
            projectId,
            userId,
            collaboratorId,
            permission
          );
          message = "Colaborador adicionado com sucesso";
          break;

        case "update":
          // Validar permissão
          if (!permission || !["admin", "viewer"].includes(permission)) {
            throw new Error("Permissão inválida. Use 'admin' ou 'viewer'");
          }

          // Verificar se o colaborador existe
          const isCollab = await this.projectsRepository.isCollaborator(
            projectId,
            collaboratorId
          );

          if (!isCollab) {
            throw new Error("Usuário não é colaborador deste projeto");
          }

          result = await this.projectsRepository.updateCollaboratorPermission(
            projectId,
            userId,
            collaboratorId,
            permission
          );
          message = "Permissão atualizada com sucesso";
          break;

        case "remove":
          // Verificar se o colaborador existe
          const exists = await this.projectsRepository.isCollaborator(
            projectId,
            collaboratorId
          );

          if (!exists) {
            throw new Error("Usuário não é colaborador deste projeto");
          }

          result = await this.projectsRepository.removeCollaborator(
            projectId,
            userId,
            collaboratorId
          );
          message = "Colaborador removido com sucesso";
          break;
      }

      if (!result || result.length === 0) {
        throw new Error("Falha ao gerenciar colaborador");
      }

      res.status(200).json({
        message,
        collaborators: action === "remove" ? undefined : result[0].collaborators?.filter(c => !c.removed),
      });
    } catch (error) {
      this._handleError(error, res, next);
    }
  }

  /**
   * POST /api/projects/:projectId/collaborators - Adicionar colaborador
   * Adiciona um usuário como colaborador do projeto
   * @deprecated Use manageCollaborators com action: 'add'
   */
  async addCollaborator(req, res, next) {
    try {
      const { projectId } = req.params;
      const { userId: collaboratorId, permission = "viewer" } = req.body;

      // Validação de autenticação
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      // Verificar se o projeto existe e pertence ao usuário
      await this._validateProjectOwnership(projectId, userId);

      // Validação de dados obrigatórios
      if (!collaboratorId) {
        throw new Error("ID do colaborador é obrigatório");
      }

      // Validar permissão
      const validPermissions = ["admin", "viewer"];
      if (!validPermissions.includes(permission)) {
        throw new Error("Permissão inválida. Use 'admin' ou 'viewer'");
      }

      // Verificar se o usuário não está tentando adicionar a si mesmo
      if (collaboratorId === userId) {
        throw new Error("Você não pode adicionar a si mesmo como colaborador");
      }

      // Verificar se o colaborador já está ativo
      const isAlreadyCollaborator = await this.projectsRepository.isCollaborator(
        projectId,
        collaboratorId
      );

      if (isAlreadyCollaborator) {
        throw new Error("Usuário já é colaborador deste projeto");
      }

      // Adicionar colaborador
      const result = await this.projectsRepository.addCollaborator(
        projectId,
        userId,
        collaboratorId,
        permission
      );

      if (!result || result.length === 0) {
        throw new Error("Falha ao adicionar colaborador");
      }

      res.status(201).json({
        message: "Colaborador adicionado com sucesso",
        collaborators: result[0].collaborators,
      });
    } catch (error) {
      this._handleError(error, res, next);
    }
  }

  /**
   * DELETE /api/projects/:projectId/collaborators/:collaboratorId - Remover colaborador
   * Remove um colaborador do projeto
   */
  async removeCollaborator(req, res, next) {
    try {
      const { projectId, collaboratorId } = req.params;

      // Validação de autenticação
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      // Verificar se o projeto existe e pertence ao usuário
      await this._validateProjectOwnership(projectId, userId);

      // Verificar se o colaborador existe no projeto
      const isCollaborator = await this.projectsRepository.isCollaborator(
        projectId,
        collaboratorId
      );

      if (!isCollaborator) {
        throw new Error("Usuário não é colaborador deste projeto");
      }

      // Remover colaborador
      const result = await this.projectsRepository.removeCollaborator(
        projectId,
        userId,
        collaboratorId
      );

      if (!result || result.length === 0) {
        throw new Error("Falha ao remover colaborador");
      }

      res.status(200).json({
        message: "Colaborador removido com sucesso",
      });
    } catch (error) {
      this._handleError(error, res, next);
    }
  }

  /**
   * GET /api/projects/:projectId/collaborators - Listar colaboradores
   * Lista todos os colaboradores de um projeto (acesso para donos e colaboradores)
   */
  async getCollaborators(req, res, next) {
    try {
      const { projectId } = req.params;

      // Validação de autenticação
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      // Verificar acesso ao projeto (dono ou colaborador)
      const project = await this._validateProjectAccess(projectId, userId);

      const collaborators = project.collaborators || [];

      // Filtrar apenas colaboradores ativos
      const activeCollaborators = collaborators.filter(
        (collab) => !collab.removed
      );

      res.status(200).json({
        collaborators: activeCollaborators,
      });
    } catch (error) {
      this._handleError(error, res, next);
    }
  }

  /**
   * PATCH /api/projects/:projectId/collaborators/:collaboratorId - Atualizar permissão
   * Atualiza a permissão de um colaborador
   */
  async updateCollaboratorPermission(req, res, next) {
    try {
      const { projectId, collaboratorId } = req.params;
      const { permission } = req.body;

      // Validação de autenticação
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      // Verificar se o projeto existe e pertence ao usuário
      await this._validateProjectOwnership(projectId, userId);

      // Validar permissão
      const validPermissions = ["admin", "viewer"];
      if (!permission || !validPermissions.includes(permission)) {
        throw new Error("Permissão inválida. Use 'admin' ou 'viewer'");
      }

      // Verificar se o colaborador existe no projeto
      const isCollaborator = await this.projectsRepository.isCollaborator(
        projectId,
        collaboratorId
      );

      if (!isCollaborator) {
        throw new Error("Usuário não é colaborador deste projeto");
      }

      // Atualizar permissão
      const result = await this.projectsRepository.updateCollaboratorPermission(
        projectId,
        userId,
        collaboratorId,
        permission
      );

      if (!result || result.length === 0) {
        throw new Error("Falha ao atualizar permissão");
      }

      res.status(200).json({
        message: "Permissão atualizada com sucesso",
        collaborators: result[0].collaborators,
      });
    } catch (error) {
      this._handleError(error, res, next);
    }
  }

  // ========================================
  // ENDPOINTS PARA GERENCIAMENTO DE NOTAS ASSOCIADAS
  // ========================================

  /**
   * PUT /api/projects/:projectId/notes - Gerenciar notas associadas (consolidado)
   * Adiciona, sincroniza ou remove notas do projeto
   * Body: { action: 'add' | 'sync' | 'remove', noteId }
   */
  async manageNotes(req, res, next) {
    try {
      const { projectId } = req.params;
      const { action, noteId } = req.body;

      // Validação de autenticação
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      // Validação de dados obrigatórios
      if (!action || !["add", "sync", "remove"].includes(action)) {
        throw new Error("Ação inválida. Use 'add', 'sync' ou 'remove'");
      }

      if (!noteId) {
        throw new Error("ID da nota é obrigatório");
      }

      let result;
      let message;

      switch (action) {
        case "add":
          result = await this.projectsRepository.addNoteToProject(
            projectId,
            noteId,
            userId
          );
          message = "Nota adicionada ao projeto com sucesso";
          break;

        case "sync":
          result = await this.projectsRepository.updateNoteInProject(
            projectId,
            noteId,
            userId
          );
          message = "Nota sincronizada com sucesso";
          break;

        case "remove":
          result = await this.projectsRepository.removeNoteFromProject(
            projectId,
            noteId,
            userId
          );
          message = "Nota removida do projeto com sucesso";
          break;
      }

      if (!result || result.length === 0) {
        throw new Error(
          "Falha ao gerenciar nota. Verifique se você tem permissão"
        );
      }

      res.status(200).json({
        message,
        notes: action === "remove" ? undefined : result[0].associated_notes,
      });
    } catch (error) {
      this._handleError(error, res, next);
    }
  }

  /**
   * POST /api/projects/:projectId/notes - Adicionar nota ao projeto
   * Associa uma nota existente ao projeto
   * @deprecated Use manageNotes com action: 'add'
   */
  async addNoteToProject(req, res, next) {
    try {
      const { projectId } = req.params;
      const { noteId } = req.body;

      // Validação de autenticação
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      // Validação de dados obrigatórios
      if (!noteId) {
        throw new Error("ID da nota é obrigatório");
      }

      // Adicionar nota ao projeto
      const result = await this.projectsRepository.addNoteToProject(
        projectId,
        noteId,
        userId
      );

      if (!result || result.length === 0) {
        throw new Error(
          "Falha ao adicionar nota. Verifique se você tem permissão ou se a nota já está associada"
        );
      }

      res.status(201).json({
        message: "Nota adicionada ao projeto com sucesso",
        associated_notes: result[0].associated_notes,
      });
    } catch (error) {
      this._handleError(error, res, next);
    }
  }

  /**
   * DELETE /api/projects/:projectId/notes/:noteId - Remover nota do projeto
   * Remove a associação de uma nota com o projeto
   */
  async removeNoteFromProject(req, res, next) {
    try {
      const { projectId, noteId } = req.params;

      // Validação de autenticação
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      // Remover nota do projeto
      const result = await this.projectsRepository.removeNoteFromProject(
        projectId,
        noteId,
        userId
      );

      if (!result || result.length === 0) {
        throw new Error(
          "Falha ao remover nota. Verifique se você tem permissão"
        );
      }

      res.status(200).json({
        message: "Nota removida do projeto com sucesso",
      });
    } catch (error) {
      this._handleError(error, res, next);
    }
  }

  /**
   * GET /api/projects/:projectId/notes - Listar notas do projeto
   * Lista todas as notas associadas ao projeto (acesso para donos e colaboradores)
   */
  async getAssociatedNotes(req, res, next) {
    try {
      const { projectId } = req.params;

      // Validação de autenticação
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      // Verificar acesso ao projeto (dono ou colaborador)
      const project = await this._validateProjectAccess(projectId, userId);

      const notes = project.associated_notes || [];

      res.status(200).json({
        notes: notes,
      });
    } catch (error) {
      this._handleError(error, res, next);
    }
  }

  /**
   * PUT /api/projects/:projectId/notes/:noteId - Atualizar nota no projeto
   * Sincroniza os dados de uma nota associada com a tabela notes
   */
  async updateNoteInProject(req, res, next) {
    try {
      const { projectId, noteId } = req.params;

      // Validação de autenticação
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      // Atualizar nota no projeto
      const result = await this.projectsRepository.updateNoteInProject(
        projectId,
        noteId,
        userId
      );

      if (!result || result.length === 0) {
        throw new Error(
          "Falha ao atualizar nota. Verifique se você tem permissão"
        );
      }

      res.status(200).json({
        message: "Nota atualizada no projeto com sucesso",
        associated_notes: result[0].associated_notes,
      });
    } catch (error) {
      this._handleError(error, res, next);
    }
  }
}

module.exports = new ProjectsController();