const projectsRepository = require("@/modules/projects/projects.repository");
const NotificationsRepository = require("@/modules/notifications/notifications.repository");
const {
  ALLOWED_PROJECT_STATUSES,
} = require("@/utils/patterns/product-patterns");

const PlanUsageManager = require("@/modules/plans/plans.controller");
const PlansRepository = require("@/modules/plans/plans.repository");
const { PLAN_PATHS, USAGE_PATHS } = require("@/services/plans/plan-paths");
const {
  inviteProjectMember,
} = require("@/services/email/templates/projects/add-person");

const { normalizeNewProject } = require("./normalizer");
const spacesService = require("@/services/storage");

class ProjectsController {
  constructor() {
    this.projectsRepository = projectsRepository;
  }

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

    const allowedProps = [
      "priority",
      "tags",
      "estimated_time",
      "complexity",
      "color",
      "icon",
    ];
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
            throw new Error(
              "estimated_time deve ser uma data válida (ISO 8601)"
            );
          }
        }
        validated[key] = value;
      }

      // Validar color (deve ser hex válido)
      else if (key === "color") {
        if (value !== null) {
          const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
          if (!hexRegex.test(value)) {
            throw new Error(
              "Color deve ser uma cor hexadecimal válida (ex: #ff0000)"
            );
          }
        }
        validated[key] = value;
      }

      // Validar icon (pode ser string/emoji ou objeto {path, name, type} para imagens)
      else if (key === "icon") {
        if (value !== null) {
          // Aceita string (emoji) ou objeto (imagem do Spaces)
          if (typeof value === "string") {
            validated[key] = value;
          } else if (typeof value === "object" && value.path !== undefined) {
            validated[key] = value;
          } else {
            throw new Error(
              "Icon deve ser uma string (emoji) ou objeto de imagem"
            );
          }
        } else {
          validated[key] = value;
        }
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
      projects_files: project.projects_files || [],
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
        parent_project_id: project.parent_project_id || null,
        title: project.title,
        description: project.description,
        properties: project.properties || {},
        projects_files: project.projects_files || [],
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
        organization: project.organization_id
          ? {
              id: project.organization_id,
              name: project.organization_name,
              unique_name: project.organization_unique_name,
              logo_url: project.organization_logo_url,
            }
          : null,
        collaborators: project.collaborators || [],
        notes: project.associated_notes || [],
        subprojects: project.subprojects || [],
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
        projects_files: project.projects_files || [],
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
        organization: project.organization_id
          ? {
              id: project.organization_id,
              name: project.organization_name,
              unique_name: project.organization_unique_name,
              logo_url: project.organization_logo_url,
            }
          : null,
        collaborators: project.collaborators || [],
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
      const {
        title,
        description,
        status,
        properties,
        methodology,
        default_view,
        org_id,
        parent_project_id,
      } = req.body;

      // Validação de autenticação
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const usageRecord = await PlanUsageManager.managePlanUsage(userId);
      const getUserPlan = await PlansRepository.getUserAndPlan(userId);
      const planDetails = await PlansRepository.getPlanById(
        getUserPlan.plan_id
      );

      if (!usageRecord || !planDetails) {
        return res.status(404).json({
          error: "Configuração de plano não encontrada para este usuário.",
        });
      }

      if (!planDetails.details) {
        return res.status(500).json({
          error: "Configuração de plano inválida",
          message:
            "O plano não possui configuração (details) no banco de dados.",
        });
      }

      const getNestedValue = (obj, path) =>
        path.split(".").reduce((acc, part) => acc && acc[part], obj);
      const maxProjects = getNestedValue(
        planDetails.details,
        PLAN_PATHS.LIMITS.MAX_PROJECTS
      );

      if (maxProjects === undefined) {
        return res.status(500).json({
          error: "Configuração de plano inválida",
          message: "O plano não possui limite de projetos configurado.",
        });
      }

      const canCreate = PlanUsageManager.checkLimit(
        planDetails.details,
        usageRecord.usage_details,
        USAGE_PATHS.SUMMARY.PROJECTS_TOTAL,
        PLAN_PATHS.LIMITS.MAX_PROJECTS
      );

      if (!canCreate) {
        return res.status(403).json({
          error: "Limite de projetos atingido",
          message: `Seu plano (${planDetails.name}) permite apenas ${maxProjects} projetos.`,
        });
      }

      if (!title) {
        throw new Error("Título é obrigatório");
      }

      const projectStatus =
        status === undefined || status === null ? "open" : status;

      if (!ALLOWED_PROJECT_STATUSES.includes(projectStatus)) {
        return res.status(400).json({
          error: `Status inválido. Permitidos: ${ALLOWED_PROJECT_STATUSES.join(", ")}`,
        });
      }

      // 🟢 2. Valida as propriedades de UI/Design que o usuário enviou (color, icon, tags)
      const userValidatedProps = properties
        ? this._validateProperties(properties)
        : {};

      // 🟢 3. CHAMADA AO NORMALIZER
      // Passamos os dados da requisição + as propriedades validadas pelo usuário
      const payload = {
        title,
        description,
        methodology,
        default_view,
        status: projectStatus,
        parent_project_id,
      };
      const { projectData, stagesData } = normalizeNewProject(
        payload,
        userId,
        org_id,
        userValidatedProps // Injetamos as props do usuário para mesclar com as props de negócio
      );

      // 🟢 4. Persistência no banco de dados
      // NOTA ARQUITETURAL: Como agora você tem projectData e stagesData,
      // o método no Repository precisa salvar ambos usando uma Transaction SQL.
      const result = await this.projectsRepository.createProjectWithStages(
        projectData,
        stagesData
      );

      if (!result || result.length === 0) {
        throw new Error("Falha ao criar projeto");
      }

      // Incrementar o uso de projetos
      await PlanUsageManager.consumeProjectCreation(usageRecord.id);

      const newProject = result[0];

      // Formatar e retornar o projeto criado
      const formattedProject = this._formatProjectResponse(newProject);

      // Opcional: Adicionar as stages à resposta para o front-end já renderizar o board
      formattedProject.stages = result[0].stages || stagesData;

      res.status(201).json(formattedProject);
    } catch (error) {
      this._handleError(error, res, next);
    }
  }
  /**
   * GET /api/projects/:id/stages - Buscar as etapas (colunas) de um projeto
   * Retorna os stages de um projeto se o utilizador tiver acesso (dono ou colaborador)
   */
  async getProjectStages(req, res, next) {
    try {
      const { id } = req.params;

      // Validação de autenticação
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      // Validação de segurança: O utilizador tem acesso ao projeto?
      // Se não tiver, este método lança um erro automaticamente e vai para o catch
      await this._validateProjectAccess(id, userId);

      // Busca as etapas na base de dados
      const stages = await this.projectsRepository.getProjectStages(id);

      // Retorna a resposta limpa
      res.status(200).json({
        stages: stages || [],
      });
    } catch (error) {
      this._handleError(error, res, next);
    }
  }

  /**
   * PUT /api/projects/:id - Atualizar um projeto (consolidado)
   * Atualiza campos do projeto incluindo: title, description, status, properties
   * Suporta upload de icon e files via multipart/form-data
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
      const currentProject = await this._validateProjectOwnership(id, userId);

      // Validar status se fornecido
      if (status !== undefined && !ALLOWED_PROJECT_STATUSES.includes(status)) {
        return res.status(400).json({
          error: `Status inválido. Permitidos: ${ALLOWED_PROJECT_STATUSES.join(", ")}`,
        });
      }

      // Construir objeto de atualização apenas com campos enviados
      const updates = {};
      if (title !== undefined) updates.title = title;
      if (description !== undefined) updates.description = description;
      if (status !== undefined) updates.status = status;

      // Inicializar propertiesUpdate para acumular mudanças de properties
      let propertiesUpdate = {};

      // Se properties foi enviado, validar e preparar para merge
      if (properties !== undefined) {
        propertiesUpdate = this._validateProperties(properties);
      }

      // Processar upload de ícone
      if (req.files?.icon?.[0]) {
        const iconFile = req.files.icon[0];
        // Deletar ícone anterior se existir
        if (currentProject?.properties?.icon?.path) {
          const oldKey = currentProject.properties.icon.path;
          if (oldKey) await spacesService.deleteImage(oldKey);
        }
        const result = await spacesService.uploadProjectIcon(
          iconFile.buffer,
          iconFile.mimetype,
          id,
          userId
        );
        propertiesUpdate.icon = {
          path: result.path || result.key || "",
          name: iconFile.originalname,
          type: iconFile.mimetype,
        };
      }

      // Processar upload de arquivos (para coluna projects_files)
      if (req.files?.files?.length > 0) {
        const newFiles = await Promise.all(
          req.files.files.map(async (file) => {
            const result = await spacesService.uploadProjectFile(
              file.buffer,
              file.mimetype,
              id,
              userId,
              file.originalname
            );
            return {
              id: result.fileName,
              path: result.key || result.path || "",
              name: file.originalname,
              type: file.mimetype,
              size: file.size,
              uploaded_at: new Date().toISOString(),
            };
          })
        );
        // Salvar em coluna separada (projects_files), o repository faz append
        updates.projects_files = newFiles;
      }

      // Remover ícone se enviado com path vazio
      if (propertiesUpdate.icon && propertiesUpdate.icon.path === "") {
        if (currentProject?.properties?.icon?.path) {
          const oldKey = currentProject.properties.icon.path;
          if (oldKey) await spacesService.deleteImage(oldKey);
        }
      }

      // Se houver alterações em properties, adicionar ao updates
      if (Object.keys(propertiesUpdate).length > 0) {
        updates.properties = propertiesUpdate;
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

      // Buscar o registro de uso
      const usageRecord = await PlanUsageManager.managePlanUsage(userId);

      // Validação de propriedade do projeto
      await this._validateProjectOwnership(id, userId);

      // Exclusão do projeto (soft delete)
      const result = await this.projectsRepository.deleteProject(id, userId);

      if (!result || result.length === 0) {
        throw new Error("Falha ao deletar projeto");
      }

      // Decrementar o uso de projetos
      if (usageRecord) {
        await PlanUsageManager.incrementUsage(
          usageRecord.id,
          USAGE_PATHS.SUMMARY.PROJECTS_TOTAL,
          -1
        );
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
      const {
        action = null,
        userId: collaboratorId,
        role = "member",
        suspended = null,
      } = req.body;

      // Validação de autenticação
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      // Verificar se o projeto existe e pertence ao usuário
      const project = await this._validateProjectOwnership(projectId, userId);

      // Validação de dados obrigatórios
      // Permitir action null se suspended for fornecido
      if (
        suspended === null &&
        (!action || !["add", "update", "remove", "suspend"].includes(action))
      ) {
        throw new Error(
          "Ação inválida. Use 'add', 'update', 'remove' ou 'suspend'"
        );
      }

      if (!collaboratorId) {
        throw new Error("ID do colaborador é obrigatório");
      }

      // Se a ação for adicionar, validar limites do plano
      if (action === "add") {
        const usageRecord = await PlanUsageManager.managePlanUsage(userId);
        const getUserPlan = await PlansRepository.getUserAndPlan(userId);
        const planDetails = await PlansRepository.getPlanById(
          getUserPlan.plan_id
        );

        if (!usageRecord || !planDetails) {
          return res.status(404).json({
            error: "Configuração de plano não encontrada para este usuário.",
          });
        }

        // Validar limite de colaboradores por projeto
        const collaborators = await this.projectsRepository.getCollaborators(
          projectId,
          userId
        );
        const currentCollaborators = collaborators[0]?.collaborators || [];
        const maxCollaborators =
          planDetails.details?.limits?.max_collaborators_per_project;

        if (
          maxCollaborators &&
          currentCollaborators.length >= maxCollaborators
        ) {
          return res.status(403).json({
            error: "Limite de colaboradores atingido",
            message: `Seu plano (${planDetails.name}) permite apenas ${maxCollaborators} colaboradores por projeto.`,
          });
        }
      }

      let result;
      let message;

      // Se suspended for fornecido e action for null, tratar como ação de suspensão
      const effectiveAction =
        suspended !== null && !action ? "suspend" : action;

      switch (effectiveAction) {
        case "add":
          // Validar role
          const validRoles = ["admin", "viewer", "member"];
          if (!validRoles.includes(role)) {
            throw new Error("Role inválido. Use 'admin', 'viewer' ou 'member'");
          }

          // Verificar se o usuário não está tentando adicionar a si mesmo
          if (collaboratorId === userId) {
            throw new Error(
              "Você não pode adicionar a si mesmo como colaborador"
            );
          }

          // Verificar se o usuário está suspenso
          const isSuspended =
            await this.projectsRepository.isSuspendedCollaborator(
              projectId,
              collaboratorId
            );

          if (isSuspended) {
            throw new Error(
              "Usuário suspenso do projeto, basta remover suspensão e o mesmo voltará como colaborador."
            );
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
            role
          );
          message = "Colaborador adicionado com sucesso";

          // Enviar email de notificação usando dados do repository
          try {
            // Buscar dados completos do projeto com owner
            const projectWithOwner =
              await this.projectsRepository.getProjectByIdWithAccess(
                projectId,
                userId
              );

            // Encontrar o colaborador recém-adicionado no array de collaborators do projeto
            const addedCollaborator =
              projectWithOwner?.[0]?.collaborators?.find(
                (c) => c.user_id === collaboratorId
              );

            console.log(
              "📧 [EMAIL DEBUG] addedCollaborator:",
              addedCollaborator
            );
            console.log(
              "📧 [EMAIL DEBUG] projectWithOwner:",
              projectWithOwner?.[0]
            );

            if (addedCollaborator && projectWithOwner && projectWithOwner[0]) {
              console.log("📧 [EMAIL DEBUG] Enviando email com params:", {
                nome: addedCollaborator.name,
                email: addedCollaborator.email,
                projectName: projectWithOwner[0].title,
                projectId,
                addedByName: projectWithOwner[0].owner_name,
              });

              inviteProjectMember(
                addedCollaborator.name,
                addedCollaborator.email,
                projectWithOwner[0].title,
                projectId,
                projectWithOwner[0].owner_name
              ).catch((err) => {
                console.error(
                  "❌ [EMAIL DEBUG] Erro ao enviar email de convite:",
                  err
                );
              });

              // Adicionar notificação no sistema
              await NotificationsRepository.createNotification({
                userId: collaboratorId,
                actorId: userId,
                type: "project_invite",
                entityType: "project",
                entityId: projectId,
                title: `Você foi adicionado ao projeto ${projectWithOwner[0].title}`,
                content: {
                  action: "collaborator_added",
                  role: role,
                  added_by: userId,
                  project_id: projectId,
                },
              });
            } else {
              console.log(
                "⚠️ [EMAIL DEBUG] Dados insuficientes para enviar email"
              );
            }
          } catch (emailError) {
            console.error("Erro ao preparar email de convite:", emailError);
          }
          break;

        case "update":
          // Validar role
          if (!role || !["admin", "viewer"].includes(role)) {
            throw new Error("Role inválido. Use 'admin' ou 'viewer'");
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
            role
          );
          message = "Role atualizado com sucesso";

          await NotificationsRepository.createNotification({
            userId: collaboratorId,
            actorId: userId,
            type: "project_action",
            entityType: "project",
            entityId: projectId,
            title: `Sua permissão no projeto ${project.title} foi alterada para ${role}`,
            content: {
              action: "collaborator_updated",
              role: role,
              project_id: projectId,
            },
          });
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

        case "suspend":
          // Verificar se o colaborador existe (independente de estar suspenso ou não)
          const existsInProject =
            await this.projectsRepository.isCollaboratorInProject(
              projectId,
              collaboratorId
            );

          if (!existsInProject) {
            throw new Error("Usuário não é colaborador deste projeto");
          }

          result = await this.projectsRepository.updateCollaboratorSuspension(
            projectId,
            userId,
            collaboratorId,
            suspended
          );
          message = suspended
            ? "Colaborador suspenso com sucesso"
            : "Suspensão removida com sucesso";
          break;
      }

      if (!result || result.length === 0) {
        throw new Error("Falha ao gerenciar colaborador");
      }

      res.status(200).json({
        message,
        collaborators:
          action === "remove" ? undefined : result[0].collaborators,
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
      const { userId: collaboratorId, role = "viewer" } = req.body;

      // Validação de autenticação
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      // Buscar/Criar registro de uso
      const usageRecord = await PlanUsageManager.managePlanUsage(userId);
      const getUserPlan = await PlansRepository.getUserAndPlan(userId);

      // Buscar detalhes do plano
      const planDetails = await PlansRepository.getPlanById(
        getUserPlan.plan_id
      );

      if (!usageRecord || !planDetails) {
        return res.status(404).json({
          error: "Configuração de plano não encontrada para este usuário.",
        });
      }

      // Verificar se o projeto existe e pertence ao usuário
      await this._validateProjectOwnership(projectId, userId);

      // Validar limite de colaboradores por projeto
      const collaborators = await this.projectsRepository.getCollaborators(
        projectId,
        userId
      );
      const currentCollaborators = collaborators[0]?.collaborators || [];
      const maxCollaborators =
        planDetails.details?.limits?.max_collaborators_per_project;

      if (maxCollaborators && currentCollaborators.length >= maxCollaborators) {
        return res.status(403).json({
          error: "Limite de colaboradores atingido",
          message: `Seu plano (${planDetails.name}) permite apenas ${maxCollaborators} colaboradores por projeto.`,
        });
      }

      // Validação de dados obrigatórios
      if (!collaboratorId) {
        throw new Error("ID do colaborador é obrigatório");
      }

      // Validar role
      const validRoles = ["admin", "viewer"];
      if (!validRoles.includes(role)) {
        throw new Error("Role inválido. Use 'admin' ou 'viewer'");
      }

      // Verificar se o usuário não está tentando adicionar a si mesmo
      if (collaboratorId === userId) {
        throw new Error("Você não pode adicionar a si mesmo como colaborador");
      }

      // Verificar se o colaborador já está ativo
      const isAlreadyCollaborator =
        await this.projectsRepository.isCollaborator(projectId, collaboratorId);

      if (isAlreadyCollaborator) {
        throw new Error("Usuário já é colaborador deste projeto");
      }

      // Adicionar colaborador
      const result = await this.projectsRepository.addCollaborator(
        projectId,
        userId,
        collaboratorId,
        role
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

      res.status(200).json({
        collaborators: collaborators,
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
      const { role } = req.body;

      // Validação de autenticação
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      // Verificar se o projeto existe e pertence ao usuário
      await this._validateProjectOwnership(projectId, userId);

      // Validar role
      const validRoles = ["admin", "viewer"];
      if (!role || !validRoles.includes(role)) {
        throw new Error("Role inválido. Use 'admin' ou 'viewer'");
      }

      // Verificar se o colaborador existe no projeto
      const isCollaborator = await this.projectsRepository.isCollaborator(
        projectId,
        collaboratorId
      );

      if (!isCollaborator) {
        throw new Error("Usuário não é colaborador deste projeto");
      }

      // Atualizar role
      const result = await this.projectsRepository.updateCollaboratorPermission(
        projectId,
        userId,
        collaboratorId,
        role
      );

      if (!result || result.length === 0) {
        throw new Error("Falha ao atualizar role");
      }

      res.status(200).json({
        message: "Role atualizado com sucesso",
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

      // Buscar notas diretamente da tabela notes via project_id
      const notes = await this.projectsRepository.getAssociatedNotes(
        projectId,
        userId
      );

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

  async getProjectStats(req, res, next) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const VALID_STATUSES = [
        "open",
        "in_progress",
        "paused",
        "completed",
        "archived",
      ];
      const VALID_METHODOLOGIES = ["kanban", "scrum", "waterfall", "custom"];

      const filters = {};

      if (req.query.status && VALID_STATUSES.includes(req.query.status)) {
        filters.status = req.query.status;
      }

      if (
        req.query.methodology &&
        VALID_METHODOLOGIES.includes(req.query.methodology)
      ) {
        filters.methodology = req.query.methodology;
      }

      if (req.query.from) {
        const from = new Date(req.query.from);
        if (!isNaN(from.getTime())) filters.from = from;
      }

      if (req.query.to) {
        const to = new Date(req.query.to);
        if (!isNaN(to.getTime())) filters.to = to;
      }

      filters.parent_only = req.query.parent_only !== "false";

      const result = await this.projectsRepository.getProjectStats(
        userId,
        filters
      );
      const row = result[0];

      const tasks = row.tasks;
      const tasksTotal = parseInt(tasks.total) || 0;
      const tasksDone = parseInt(tasks.done) || 0;

      const overview = row.overview;
      const formattedOverview = {
        total: parseInt(overview.total) || 0,
        owned: parseInt(overview.owned) || 0,
        collaborating: parseInt(overview.collaborating) || 0,
        active: parseInt(overview.active) || 0,
        by_status: {
          open: parseInt(overview.open) || 0,
          in_progress: parseInt(overview.in_progress) || 0,
          paused: parseInt(overview.paused) || 0,
          completed: parseInt(overview.completed) || 0,
          archived: parseInt(overview.archived) || 0,
        },
      };

      const progress = row.progress;
      const formattedProgress = {
        average: parseFloat(progress.average) || 0,
        near_completion: parseInt(progress.near_completion) || 0,
        not_started: parseInt(progress.not_started) || 0,
      };

      const notes = row.notes;
      const formattedNotes = {
        total: parseInt(notes.total) || 0,
        visible: parseInt(notes.visible) || 0,
        archived: parseInt(notes.archived) || 0,
        secure: parseInt(notes.secure) || 0,
      };

      res.status(200).json({
        overview: formattedOverview,
        methodology: {
          kanban: parseInt(row.methodology.kanban) || 0,
          scrum: parseInt(row.methodology.scrum) || 0,
          waterfall: parseInt(row.methodology.waterfall) || 0,
          custom: parseInt(row.methodology.custom) || 0,
        },
        progress: formattedProgress,
        notes: formattedNotes,
        tasks: {
          total: tasksTotal,
          done: tasksDone,
          pending: parseInt(tasks.pending) || 0,
          completion_rate:
            tasksTotal > 0
              ? Math.round((tasksDone / tasksTotal) * 1000) / 10
              : 0,
        },
        filters_applied: {
          status: filters.status || null,
          methodology: filters.methodology || null,
          from: filters.from || null,
          to: filters.to || null,
          parent_only: filters.parent_only,
        },
      });
    } catch (error) {
      this._handleError(error, res, next);
    }
  }

  async updateNoteStage(req, res, next) {
    try {
      const { projectId, noteId } = req.params;
      const { stageId } = req.body;

      // Validação de autenticação
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      if (!stageId) {
        throw new Error("O campo 'stageId' é obrigatório.");
      }

      // Validação de segurança: O usuário tem acesso ao projeto?
      // O método _validateProjectAccess já lança throw se não tiver acesso
      await this._validateProjectAccess(projectId, userId);

      // Atualizar
      const result = await this.projectsRepository.updateNoteStage(
        projectId,
        noteId,
        stageId
      );

      if (!result || result.length === 0) {
        return res.status(404).json({
          error: "Nota não encontrada no projeto ou estágio inválido.",
        });
      }

      res.status(200).json({
        message: "Estágio da nota atualizado com sucesso",
        noteId: result[0].id,
        newStageId: result[0].project_stage_id,
      });
    } catch (error) {
      this._handleError(error, res, next);
    }
  }
}

module.exports = new ProjectsController();
