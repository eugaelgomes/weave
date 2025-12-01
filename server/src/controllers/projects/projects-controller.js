const projectsRepository = require("@/repositories/projetcs");

class ProjectsController {
  constructor() {
    this.projectsRepository = projectsRepository;
  }

  // ========================================
  // MÉTODOS UTILITÁRIOS E VALIDAÇÃO
  // ========================================

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
   * Retorna os detalhes de um projeto específico se pertencer ao usuário
   */
  async getProjectById(req, res, next) {
    try {
      const { id } = req.params;

      // Validação de autenticação
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      // Validação de propriedade do projeto
      const project = await this._validateProjectOwnership(id, userId);

      // Formatar e retornar o projeto
      const formattedProject = this._formatProjectResponse(project);
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

      // Criação do projeto
      const result = await this.projectsRepository.createProject(
        userId,
        title,
        description,
        status,
        properties
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
   * PUT /api/projects/:id - Atualizar um projeto
   * Atualiza os campos fornecidos de um projeto (atualização parcial)
   */
  async updateProject(req, res, next) {
    try {
      const { id } = req.params;
      const updates = req.body;

      // Validação de autenticação
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      // Validação de propriedade do projeto
      await this._validateProjectOwnership(id, userId);

      // Verifica se há algo para atualizar
      if (Object.keys(updates).length === 0) {
        return res.status(400).json({
          error: "Nenhum campo fornecido para atualização",
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
      res.status(200).json(formattedProject);
    } catch (error) {
      this._handleError(error, res, next);
    }
  }

  /**
   * PATCH /api/projects/:id/properties - Atualizar propriedades parciais do projeto
   * Mescla propriedades existentes com as novas fornecidas
   */
  async updateProjectProperties(req, res, next) {
    try {
      const { id } = req.params;
      const partialProps = req.body;

      // Validação de autenticação
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      // Validação de propriedade do projeto
      await this._validateProjectOwnership(id, userId);

      // Verifica se há propriedades para atualizar
      if (Object.keys(partialProps).length === 0) {
        return res.status(400).json({
          error: "Nenhuma propriedade fornecida para atualização",
        });
      }

      // Atualização parcial das propriedades
      const result = await this.projectsRepository.updateProjectProperties(
        id,
        userId,
        partialProps
      );

      if (!result || result.length === 0) {
        return res.status(400).json({
          error: "Nenhuma atualização foi realizada",
        });
      }

      const updatedProject = result[0];

      // Formatar e retornar o projeto atualizado
      const formattedProject = this._formatProjectResponse(updatedProject);
      res.status(200).json(formattedProject);
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
   * POST /api/projects/:projectId/collaborators - Adicionar colaborador
   * Adiciona um usuário como colaborador do projeto
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
   * Lista todos os colaboradores de um projeto
   */
  async getCollaborators(req, res, next) {
    try {
      const { projectId } = req.params;

      // Validação de autenticação
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      // Buscar colaboradores
      const result = await this.projectsRepository.getCollaborators(
        projectId,
        userId
      );

      if (!result || result.length === 0) {
        return res.status(404).json({
          error: "Projeto não encontrado ou você não tem acesso",
        });
      }

      const collaborators = result[0].collaborators || [];

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
   * POST /api/projects/:projectId/notes - Adicionar nota ao projeto
   * Associa uma nota existente ao projeto
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
   * Lista todas as notas associadas ao projeto
   */
  async getAssociatedNotes(req, res, next) {
    try {
      const { projectId } = req.params;

      // Validação de autenticação
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      // Buscar notas associadas
      const result = await this.projectsRepository.getAssociatedNotes(
        projectId,
        userId
      );

      if (!result || result.length === 0) {
        return res.status(404).json({
          error: "Projeto não encontrado ou você não tem acesso",
        });
      }

      const notes = result[0].associated_notes || [];

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