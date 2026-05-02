const ProjectsCoreController = require("@/modules/projects/controllers/projects-core.controller");
const organizationsRepository = require("@/modules/organizations/repositories/organizations.repository");
const NotificationsRepository = require("@/modules/notifications/repositories/notifications.repository");
const {
  ALLOWED_PROJECT_STATUSES,
  normalizeProjectStatus,
} = require("@/utils/patterns/product-patterns");
const PlanUsageManager = require("@/modules/plans/plans.controller");
const PlansRepository = require("@/modules/plans/plans.repository");
const { PLAN_PATHS } = require("@/services/plans/plan-paths");
const {
  inviteProjectMember,
} = require("@/services/email/templates/project-add-person");
const spacesService = require("@/services/storage");
const {
  ASSIGNABLE_PROJECT_ROLES,
} = require("@/modules/projects/project-role-policy");
const reportConfigRepository = require("@/modules/projects/repositories/report-config.repository");
const sprintsRepository = require("@/modules/projects/repositories/sprints.repository");

class ProjectsUpdateController extends ProjectsCoreController {
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
      const userId = this._requireAuthenticatedUser(req, res);
      if (!userId) return;

      const ctx = await this._getProjectOwnershipContext(id, userId);
      const currentProject = ctx.project;

      if (status !== undefined) {
        const normalized = normalizeProjectStatus(status);
        if (!normalized || !ALLOWED_PROJECT_STATUSES.includes(normalized)) {
          return res.status(400).json({
            error: `Status inválido. Permitidos: ${ALLOWED_PROJECT_STATUSES.join(", ")}`,
          });
        }
      }

      // Construir objeto de atualização apenas com campos enviados
      const updates = {};
      if (title !== undefined) updates.title = title;
      if (description !== undefined) updates.description = description;
      if (status !== undefined) updates.status = normalizeProjectStatus(status);

      // Inicializar propertiesUpdate para acumular mudanças de properties
      let propertiesUpdate = {};

      // Se properties foi enviado, validar e preparar para merge
      if (properties !== undefined) {
        let parsedProperties = properties;
        if (typeof properties === "string") {
          try {
            parsedProperties = JSON.parse(properties);
          } catch (e) {
            // Ignorar erro de parse e usar o original (que vai falhar no typeof object)
          }
        }
        propertiesUpdate = this._validateProperties(parsedProperties);
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

      const result = ctx.orgWide
        ? await this.projectsRepository.updateProjectInOrganization(
            id,
            ctx.membership.id,
            updates
          )
        : await this.projectsRepository.updateProject(id, userId, updates);

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
        role = "contributor",
        suspended = null,
      } = req.body;

      // Validação de autenticação
      const userId = this._requireAuthenticatedUser(req, res);
      if (!userId) return;

      const ctx = await this._getProjectOwnershipContext(projectId, userId);
      const project = ctx.project;

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
        const collaborators = ctx.orgWide
          ? await this.projectsRepository.getCollaboratorsWithOrgScope(
              projectId,
              ctx.membership.id
            )
          : await this.projectsRepository.getCollaborators(projectId, userId);
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
        case "add": {
          // Validar role
          if (!ASSIGNABLE_PROJECT_ROLES.includes(role)) {
            throw new Error(
              "Role inválido. Use 'project_manager', 'contributor', 'commenter' ou 'viewer'"
            );
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

          result = ctx.orgWide
            ? await this.projectsRepository.addCollaboratorWithOrgManagement(
                projectId,
                ctx.membership.id,
                userId,
                collaboratorId,
                role
              )
            : await this.projectsRepository.addCollaborator(
                projectId,
                userId,
                collaboratorId,
                role
              );
          message = "Colaborador adicionado com sucesso";

          // Enviar email de notificação usando dados do repository
          try {
            // Buscar dados completos do projeto com owner
            const projectWithOwner = ctx.orgWide
              ? await this.projectsRepository.getProjectByIdWithOrgScope(
                  projectId,
                  ctx.membership.id
                )
              : await this.projectsRepository.getProjectByIdWithAccess(
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
        }

        case "update": {
          // Validar role
          if (!ASSIGNABLE_PROJECT_ROLES.includes(role)) {
            throw new Error(
              "Role inválido. Use 'project_manager', 'contributor', 'commenter' ou 'viewer'"
            );
          }

          // Verificar se o colaborador existe
          const isCollab = await this.projectsRepository.isCollaborator(
            projectId,
            collaboratorId
          );

          if (!isCollab) {
            throw new Error("Usuário não é colaborador deste projeto");
          }

          result = ctx.orgWide
            ? await this.projectsRepository.updateCollaboratorPermissionWithOrgManagement(
                projectId,
                ctx.membership.id,
                collaboratorId,
                role
              )
            : await this.projectsRepository.updateCollaboratorPermission(
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
        }

        case "remove": {
          // Verificar se o colaborador existe
          const exists = await this.projectsRepository.isCollaborator(
            projectId,
            collaboratorId
          );

          if (!exists) {
            throw new Error("Usuário não é colaborador deste projeto");
          }

          result = ctx.orgWide
            ? await this.projectsRepository.removeCollaboratorWithOrgManagement(
                projectId,
                ctx.membership.id,
                collaboratorId
              )
            : await this.projectsRepository.removeCollaborator(
                projectId,
                userId,
                collaboratorId
              );
          message = "Colaborador removido com sucesso";
          break;
        }

        case "suspend": {
          // Verificar se o colaborador existe (independente de estar suspenso ou não)
          const existsInProject =
            await this.projectsRepository.isCollaboratorInProject(
              projectId,
              collaboratorId
            );

          if (!existsInProject) {
            throw new Error("Usuário não é colaborador deste projeto");
          }

          result = ctx.orgWide
            ? await this.projectsRepository.updateCollaboratorSuspensionWithOrgManagement(
                projectId,
                ctx.membership.id,
                collaboratorId,
                suspended
              )
            : await this.projectsRepository.updateCollaboratorSuspension(
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
   * PATCH /api/projects/:projectId/collaborators/:collaboratorId - Atualizar permissão
   * Atualiza a permissão de um colaborador
   */
  async updateCollaboratorPermission(req, res, next) {
    try {
      const { projectId, collaboratorId } = req.params;
      const { role } = req.body;

      // Validação de autenticação
      const userId = this._requireAuthenticatedUser(req, res);
      if (!userId) return;

      const ctx = await this._getProjectOwnershipContext(projectId, userId);

      // Validar role
      if (!ASSIGNABLE_PROJECT_ROLES.includes(role)) {
        throw new Error(
          "Role inválido. Use 'project_manager', 'contributor', 'commenter' ou 'viewer'"
        );
      }

      // Verificar se o colaborador existe no projeto
      const isCollaborator = await this.projectsRepository.isCollaborator(
        projectId,
        collaboratorId
      );

      if (!isCollaborator) {
        throw new Error("Usuário não é colaborador deste projeto");
      }

      const result = ctx.orgWide
        ? await this.projectsRepository.updateCollaboratorPermissionWithOrgManagement(
            projectId,
            ctx.membership.id,
            collaboratorId,
            role
          )
        : await this.projectsRepository.updateCollaboratorPermission(
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
      const userId = this._requireAuthenticatedUser(req, res);
      if (!userId) return;

      // Validação de dados obrigatórios
      if (!action || !["add", "sync", "remove"].includes(action)) {
        throw new Error("Ação inválida. Use 'add', 'sync' ou 'remove'");
      }

      if (!noteId) {
        throw new Error("ID da nota é obrigatório");
      }

      const membership =
        await organizationsRepository.getActiveOrganizationWithMembership(
          userId
        );
      const orgWide = this._canAccessAllOrganizationProjects(membership);

      await this._validateProjectAccess(projectId, userId);
      const canWrite = await this._ensureProjectWriteAccess(projectId, userId);
      if (!canWrite) {
        throw new Error(
          "Acesso negado. Sua role no projeto não permite alterar conteúdos."
        );
      }

      let result;
      let message;

      switch (action) {
        case "add":
          result =
            orgWide && membership.id
              ? await this.projectsRepository.addNoteToProjectWithOrgScope(
                  projectId,
                  noteId,
                  userId,
                  membership.id
                )
              : await this.projectsRepository.addNoteToProject(
                  projectId,
                  noteId,
                  userId
                );
          message = "Nota adicionada ao projeto com sucesso";
          break;

        case "sync":
          result =
            orgWide && membership.id
              ? await this.projectsRepository.updateNoteInProjectWithOrgScope(
                  projectId,
                  noteId,
                  userId,
                  membership.id
                )
              : await this.projectsRepository.updateNoteInProject(
                  projectId,
                  noteId,
                  userId
                );
          message = "Nota sincronizada com sucesso";
          break;

        case "remove":
          result =
            orgWide && membership.id
              ? await this.projectsRepository.removeNoteFromProjectWithOrgScope(
                  projectId,
                  noteId,
                  userId,
                  membership.id
                )
              : await this.projectsRepository.removeNoteFromProject(
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
      const userId = this._requireAuthenticatedUser(req, res);
      if (!userId) return;

      // Validação de dados obrigatórios
      if (!noteId) {
        throw new Error("ID da nota é obrigatório");
      }

      const membership =
        await organizationsRepository.getActiveOrganizationWithMembership(
          userId
        );
      const orgWide = this._canAccessAllOrganizationProjects(membership);

      await this._validateProjectAccess(projectId, userId);
      const canWrite = await this._ensureProjectWriteAccess(projectId, userId);
      if (!canWrite) {
        throw new Error(
          "Acesso negado. Sua role no projeto não permite alterar conteúdos."
        );
      }

      const result =
        orgWide && membership.id
          ? await this.projectsRepository.addNoteToProjectWithOrgScope(
              projectId,
              noteId,
              userId,
              membership.id
            )
          : await this.projectsRepository.addNoteToProject(
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
   * PUT /api/projects/:projectId/notes/:noteId - Atualizar nota no projeto
   * Sincroniza os dados de uma nota associada com a tabela notes
   */
  async updateNoteInProject(req, res, next) {
    try {
      const { projectId, noteId } = req.params;

      // Validação de autenticação
      const userId = this._requireAuthenticatedUser(req, res);
      if (!userId) return;

      const membership =
        await organizationsRepository.getActiveOrganizationWithMembership(
          userId
        );
      const orgWide = this._canAccessAllOrganizationProjects(membership);

      await this._validateProjectAccess(projectId, userId);
      const canWrite = await this._ensureProjectWriteAccess(projectId, userId);
      if (!canWrite) {
        throw new Error(
          "Acesso negado. Sua role no projeto não permite alterar conteúdos."
        );
      }

      const result =
        orgWide && membership.id
          ? await this.projectsRepository.updateNoteInProjectWithOrgScope(
              projectId,
              noteId,
              userId,
              membership.id
            )
          : await this.projectsRepository.updateNoteInProject(
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
  async updateNoteStage(req, res, next) {
    try {
      const { projectId, noteId } = req.params;
      const { stageId } = req.body;

      // Validação de autenticação
      const userId = this._requireAuthenticatedUser(req, res);
      if (!userId) return;

      if (!stageId) {
        throw new Error("O campo 'stageId' é obrigatório.");
      }

      // Validação de segurança: O usuário tem acesso ao projeto?
      // O método _validateProjectAccess já lança throw se não tiver acesso
      await this._validateProjectAccess(projectId, userId);
      const canWrite = await this._ensureProjectWriteAccess(projectId, userId);
      if (!canWrite) {
        throw new Error(
          "Acesso negado. Sua role no projeto não permite alterar conteúdos."
        );
      }

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

  /**
   * PATCH /api/projects/:id/stages/:stageId
   * Atualiza nome, posição, cor ou properties (merge em jsonb) do estágio.
   */
  async updateProjectStage(req, res, next) {
    try {
      const { id, stageId } = req.params;
      const { name, position, color, properties } = req.body;

      const userId = this._requireAuthenticatedUser(req, res);
      if (!userId) return;

      const ctx = await this._getProjectOwnershipContext(id, userId);

      const updates = {};
      if (name !== undefined) updates.name = name;
      if (position !== undefined) {
        const pos = Number(position);
        if (!Number.isInteger(pos)) {
          return res.status(400).json({
            error: "O campo 'position' deve ser um número inteiro",
          });
        }
        updates.position = pos;
      }
      if (color !== undefined) {
        if (color !== null && typeof color === "string") {
          const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
          if (!hexRegex.test(color)) {
            return res.status(400).json({
              error: "Color deve ser uma cor hexadecimal válida (ex: #E2E8F0)",
            });
          }
        }
        updates.color = color;
      }
      if (properties !== undefined) {
        let parsed = properties;
        if (typeof properties === "string") {
          try {
            parsed = JSON.parse(properties);
          } catch {
            return res.status(400).json({
              error: "O campo 'properties' deve ser um objeto JSON válido",
            });
          }
        }
        if (parsed !== null && typeof parsed !== "object") {
          return res.status(400).json({
            error: "O campo 'properties' deve ser um objeto",
          });
        }
        updates.properties = parsed ?? {};
      }

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({
          error: "Nenhum campo válido fornecido para atualização",
        });
      }

      const result = ctx.orgWide
        ? await this.projectsRepository.updateProjectStageInOrganization(
            id,
            ctx.membership.id,
            stageId,
            updates
          )
        : await this.projectsRepository.updateProjectStage(
            id,
            userId,
            stageId,
            updates
          );

      if (!result || result.length === 0) {
        return res.status(404).json({
          error: "Estágio não encontrado ou você não tem permissão",
        });
      }

      res.status(200).json({
        message: "Estágio atualizado com sucesso",
        stage: this._formatProjectStage(result[0]),
      });
    } catch (error) {
      this._handleError(error, res, next);
    }
  }

  // ══════════════════════════════════════════════════════════════════════
  // AI Report Config & Sprints
  // ══════════════════════════════════════════════════════════════════════

  /**
   * PUT /api/projects/:id/ai-report-config
   * Creates or updates the AI report configuration for a project.
   */
  async updateAiReportConfig(req, res, next) {
    try {
      const { id: projectId } = req.params;

      const userId = this._requireAuthenticatedUser(req, res);
      if (!userId) return;

      await this._validateProjectAccess(projectId, userId);

      const {
        enabled,
        default_sprint_duration_days,
        default_workable_days,
        auto_create_next_sprint,
        enable_sprint_kickoff,
        enable_daily_standup,
        enable_sprint_review,
        report_time_utc,
        channels,
        recipient_scope,
        custom_recipients,
      } = req.body;

      // Validate report_time_utc format
      if (report_time_utc && !/^\d{2}:\d{2}$/.test(report_time_utc)) {
        return res.status(400).json({
          error: "report_time_utc deve estar no formato HH:mm",
        });
      }

      // Validate channels
      const validChannels = ["in_app", "email"];
      if (channels && !channels.every((c) => validChannels.includes(c))) {
        return res.status(400).json({
          error: `channels deve conter apenas: ${validChannels.join(", ")}`,
        });
      }

      // Validate recipient_scope
      const validScopes = ["owner_only", "all_members", "custom"];
      if (recipient_scope && !validScopes.includes(recipient_scope)) {
        return res.status(400).json({
          error: `recipient_scope deve ser: ${validScopes.join(", ")}`,
        });
      }

      // Validate workable_days
      if (default_workable_days) {
        const allValid = default_workable_days.every(
          (d) => Number.isInteger(d) && d >= 0 && d <= 6
        );
        if (!allValid) {
          return res.status(400).json({
            error: "default_workable_days deve conter valores entre 0 (Dom) e 6 (Sáb)",
          });
        }
      }

      const config = await reportConfigRepository.upsert(projectId, userId, {
        enabled,
        default_sprint_duration_days,
        default_workable_days,
        auto_create_next_sprint,
        enable_sprint_kickoff,
        enable_daily_standup,
        enable_sprint_review,
        report_time_utc,
        channels,
        recipient_scope,
        custom_recipients,
      });

      // If enabled and no current sprint, calculate next_report_at based on active sprint
      if (config.enabled && config.current_sprint_id) {
        const nextAt = this._calculateNextReportAt(config);
        if (nextAt) {
          await reportConfigRepository.updateSchedulerState(config.id, {
            next_report_at: nextAt,
          });
          config.next_report_at = nextAt;
        }
      }

      res.status(200).json({
        message: "Configuração de relatório atualizada com sucesso",
        config,
      });
    } catch (error) {
      this._handleError(error, res, next);
    }
  }

  /**
   * POST /api/projects/:id/sprints
   * Creates a new sprint for a project.
   */
  async createSprint(req, res, next) {
    try {
      const { id: projectId } = req.params;

      const userId = this._requireAuthenticatedUser(req, res);
      if (!userId) return;

      await this._validateProjectAccess(projectId, userId);

      const { title, goal, start_date, end_date, workable_days, activate } =
        req.body;

      if (!start_date || !end_date) {
        return res.status(400).json({
          error: "start_date e end_date são obrigatórios",
        });
      }

      const startDate = new Date(start_date);
      const endDate = new Date(end_date);
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return res.status(400).json({
          error: "Datas inválidas. Use formato ISO (YYYY-MM-DD)",
        });
      }
      if (endDate < startDate) {
        return res.status(400).json({
          error: "end_date deve ser posterior a start_date",
        });
      }

      const sprintNumber =
        await sprintsRepository.getNextSprintNumber(projectId);

      const sprint = await sprintsRepository.create({
        projectId,
        sprintNumber,
        title: title || `Sprint ${sprintNumber}`,
        goal: goal || null,
        status: activate ? "active" : "planned",
        startDate: start_date,
        endDate: end_date,
        workableDays: workable_days || [1, 2, 3, 4, 5],
      });

      // If activating, update the report config to point to this sprint
      if (activate) {
        const config = await reportConfigRepository.getByProjectId(projectId);
        if (config) {
          const nextAt = this._calculateNextReportAt({
            ...config,
            current_sprint_start: start_date,
            current_sprint_end: end_date,
            sprint_workable_days: workable_days || [1, 2, 3, 4, 5],
          });
          await reportConfigRepository.updateSchedulerState(config.id, {
            current_sprint_id: sprint.id,
            next_report_at: nextAt,
          });
        }
      }

      res.status(201).json({
        message: "Sprint criada com sucesso",
        sprint,
      });
    } catch (error) {
      this._handleError(error, res, next);
    }
  }

  /**
   * PATCH /api/projects/:id/sprints/:sprintId/complete
   * Marks a sprint as completed.
   */
  async completeSprint(req, res, next) {
    try {
      const { id: projectId, sprintId } = req.params;

      const userId = this._requireAuthenticatedUser(req, res);
      if (!userId) return;

      await this._validateProjectAccess(projectId, userId);

      const { summary, metrics } = req.body;

      const sprint = await sprintsRepository.getById(sprintId);
      if (!sprint || sprint.project_id !== projectId) {
        return res.status(404).json({
          error: "Sprint não encontrada",
        });
      }
      if (sprint.status === "completed") {
        return res.status(400).json({
          error: "Sprint já está concluída",
        });
      }

      const completedSprint = await sprintsRepository.complete(sprintId, {
        summary,
        metrics,
      });

      // Check if auto_create_next_sprint is enabled
      const config = await reportConfigRepository.getByProjectId(projectId);
      let nextSprint = null;

      if (config && config.auto_create_next_sprint) {
        // Calculate next sprint dates
        const prevEnd = new Date(completedSprint.end_date);
        const nextStart = new Date(prevEnd);
        nextStart.setDate(nextStart.getDate() + 1);
        const nextEnd = new Date(nextStart);
        nextEnd.setDate(
          nextEnd.getDate() + (config.default_sprint_duration_days || 14) - 1
        );

        const nextNumber =
          await sprintsRepository.getNextSprintNumber(projectId);

        nextSprint = await sprintsRepository.create({
          projectId,
          sprintNumber: nextNumber,
          title: `Sprint ${nextNumber}`,
          status: "active",
          startDate: nextStart.toISOString().split("T")[0],
          endDate: nextEnd.toISOString().split("T")[0],
          workableDays: config.default_workable_days || [1, 2, 3, 4, 5],
        });

        // Update config to point to new sprint
        const nextAt = this._calculateNextReportAt({
          ...config,
          current_sprint_start: nextSprint.start_date,
          current_sprint_end: nextSprint.end_date,
          sprint_workable_days: nextSprint.workable_days,
        });

        await reportConfigRepository.updateSchedulerState(config.id, {
          current_sprint_id: nextSprint.id,
          next_report_at: nextAt,
        });
      }

      res.status(200).json({
        message: "Sprint concluída com sucesso",
        completed_sprint: completedSprint,
        next_sprint: nextSprint,
      });
    } catch (error) {
      this._handleError(error, res, next);
    }
  }

  /**
   * Calculates the next report timestamp based on sprint config.
   *
   * @param {object} config - Report config with sprint dates joined
   * @returns {string|null} ISO timestamp or null
   */
  _calculateNextReportAt(config) {
    const sprintStart = config.current_sprint_start || config.sprint_start;
    const sprintEnd = config.current_sprint_end || config.sprint_end;
    const workableDays = config.sprint_workable_days ||
      config.default_workable_days || [1, 2, 3, 4, 5];

    if (!sprintStart || !sprintEnd) return null;

    const [hours, minutes] = (config.report_time_utc || "14:00").split(":");
    const now = new Date();
    const today = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
    );

    const start = new Date(sprintStart + "T00:00:00Z");
    const end = new Date(sprintEnd + "T00:00:00Z");

    // Iterate from today forward through the sprint to find the next report day
    let candidate = new Date(Math.max(today.getTime(), start.getTime()));

    while (candidate <= end) {
      const dayOfWeek = candidate.getUTCDay();
      const isStartDay =
        candidate.getTime() === start.getTime();
      const isEndDay =
        candidate.getTime() === end.getTime();
      const isWorkableDay = workableDays.includes(dayOfWeek);

      let hasReport = false;

      if (isStartDay && config.enable_sprint_kickoff) {
        hasReport = true;
      } else if (isEndDay && config.enable_sprint_review) {
        hasReport = true;
      } else if (
        !isStartDay &&
        !isEndDay &&
        isWorkableDay &&
        config.enable_daily_standup
      ) {
        hasReport = true;
      }

      if (hasReport) {
        const reportTime = new Date(candidate);
        reportTime.setUTCHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
        if (reportTime > now) {
          return reportTime.toISOString();
        }
      }

      candidate.setUTCDate(candidate.getUTCDate() + 1);
    }

    return null;
  }
}

module.exports = new ProjectsUpdateController();
