const ProjectsCoreController = require("@/modules/projects/controllers/projects-core.controller");
const organizationsRepository = require("@/modules/organizations/repositories/organizations.repository");
const NotificationsRepository = require("@/modules/notifications/repositories/notifications.repository");
const {
  ALLOWED_PROJECT_STATUSES,
  normalizeProjectStatus,
} = require("@/utils/patterns/product-patterns");
const PlansService = require("@/modules/plans/services/plans.service");
const PlansRepository = require("@/modules/plans/repositories/plans.repository");
// Removed PLAN_PATHS
const {
  inviteProjectMember,
} = require("@/services/email/templates/project-add-person");
const spacesService = require("@/services/storage");
const notesRepository = require("@/modules/notes/notes.repository");
const taskPrioritiesRepository = require("@/modules/projects/repositories/task-priorities.repository");
const {
  ASSIGNABLE_PROJECT_ROLES,
} = require("@/modules/projects/project-role-policy");

const {
  sendPlanLimitExceeded,
} = require("@/modules/plans/utils/plan-limit-http.util");
const {
  respondIfWorkspaceShareDenied,
} = require("@/modules/organizations/utils/workspace-share-guard.util");
const { resolveNoteTitle } = require("@/modules/notes/utils/derive-note-title");
// Removed redis and queue keys
const {
  resolveNoteIdToUuid,
} = require("@/modules/notes/utils/note-id-lookup.util");

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
      const { title, description, status, properties } = req.body;

      // Validação de autenticação
      const userId = this._requireAuthenticatedUser(req, res);
      if (!userId) return;

      await this._validateProjectAccess(id, userId);
      const canWrite = await this._ensureProjectWriteAccess(id, userId);
      if (!canWrite) {
        throw new Error(
          "Acesso negado. Sua role no projeto não permite alterar conteúdos."
        );
      }

      const currentProject = await this._validateProjectAccess(id, userId);

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
          } catch {
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
          name: iconFile.originalname,
          path: result.path || result.key || "",
          size: String(iconFile.size ?? ""),
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
              name: file.originalname,
              path: result.key || result.path || "",
              size: file.size,
              type: file.mimetype,
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

      const ctx = await this._getProjectOwnershipContext(id, userId);
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
        message: "Project successfully updated",
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
      } = req.body;

      // Validação de autenticação
      const userId = this._requireAuthenticatedUser(req, res);
      if (!userId) return;

      const ctx = await this._getProjectOwnershipContext(projectId, userId);
      const project = ctx.project;

      // Validação de dados obrigatórios
      if (!action || !["add", "update", "remove"].includes(action)) {
        throw new Error("Ação inválida. Use 'add', 'update' ou 'remove'");
      }

      if (!collaboratorId) {
        throw new Error("ID do colaborador é obrigatório");
      }

      // Se a ação for adicionar, validar limites do plano
      if (action === "add") {
        const usageRecord = await PlansService.managePlanUsage(userId);
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
          return sendPlanLimitExceeded(res, {
            error: "Limite de colaboradores atingido",
            limit_key: "limits.max_collaborators_per_project",
            message: `Seu plano (${planDetails.name}) permite apenas ${maxCollaborators} colaboradores por projeto.`,
            resource: "project_collaborators",
          });
        }
      }

      let result;
      let message;

      switch (action) {
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

          if (
            await respondIfWorkspaceShareDenied(res, userId, collaboratorId)
          ) {
            return;
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

            if (addedCollaborator && projectWithOwner && projectWithOwner[0]) {
              inviteProjectMember(
                addedCollaborator.name,
                addedCollaborator.email,
                projectWithOwner[0].title,
                projectId,
                projectWithOwner[0].owner_name,
                projectWithOwner[0].public_id
              ).catch(() => {
                // Ignore email errors
              });

              // Adicionar notificação no sistema
              await NotificationsRepository.createNotification({
                actorId: userId,
                content: {
                  action: "collaborator_added",
                  added_by: userId,
                  project_id: projectId,
                  role: role,
                },
                entityId: projectId,
                entityType: "project",
                title: `Você foi adicionado ao projeto ${projectWithOwner[0].title}`,
                type: "project_invite",
                userId: collaboratorId,
              });
            } else {
              // Missing data to send email
            }
          } catch {
            // Error preparing invitation email
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
          message = "Role successfully updated";

          await NotificationsRepository.createNotification({
            actorId: userId,
            content: {
              action: "collaborator_updated",
              project_id: projectId,
              role: role,
            },
            entityId: projectId,
            entityType: "project",
            title: `Sua permissão no projeto ${project.title} foi alterada para ${role}`,
            type: "project_action",
            userId: collaboratorId,
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
      }

      if (!result || result.length === 0) {
        throw new Error("Failed to manage collaborator");
      }

      res.status(200).json({
        collaborators:
          action === "remove" ? undefined : result[0].collaborators,
        message,
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
        throw new Error("Failed to update role");
      }

      res.status(200).json({
        collaborators: result[0].collaborators,
        message: "Role successfully updated",
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

      const internalNoteId = await resolveNoteIdToUuid(noteId);
      if (!internalNoteId) {
        return res.status(404).json({ error: "Nota não encontrada" });
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
                  internalNoteId,
                  userId,
                  membership.id
                )
              : await this.projectsRepository.addNoteToProject(
                  projectId,
                  internalNoteId,
                  userId
                );
          message = "Nota adicionada ao projeto com sucesso";
          break;

        case "sync":
          result =
            orgWide && membership.id
              ? await this.projectsRepository.updateNoteInProjectWithOrgScope(
                  projectId,
                  internalNoteId,
                  userId,
                  membership.id
                )
              : await this.projectsRepository.updateNoteInProject(
                  projectId,
                  internalNoteId,
                  userId
                );
          message = "Nota sincronizada com sucesso";
          break;

        case "remove":
          result =
            orgWide && membership.id
              ? await this.projectsRepository.removeNoteFromProjectWithOrgScope(
                  projectId,
                  internalNoteId,
                  userId,
                  membership.id
                )
              : await this.projectsRepository.removeNoteFromProject(
                  projectId,
                  internalNoteId,
                  userId
                );
          message = "Nota removida do projeto com sucesso";
          break;
      }

      if (!result || result.length === 0) {
        if (action === "add") {
          const firstStageId =
            await this.projectsRepository.getFirstProjectStageId(projectId);
          if (!firstStageId) {
            return res.status(400).json({
              error:
                "O projeto não possui estágios. Crie pelo menos um estágio antes de associar tarefas.",
            });
          }
        }
        throw new Error("Failed to manage note. Check your permissions.");
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

      const internalNoteId = await resolveNoteIdToUuid(noteId);
      if (!internalNoteId) {
        return res.status(404).json({ error: "Nota não encontrada" });
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
              internalNoteId,
              userId,
              membership.id
            )
          : await this.projectsRepository.addNoteToProject(
              projectId,
              internalNoteId,
              userId
            );

      if (!result || result.length === 0) {
        const firstStageId =
          await this.projectsRepository.getFirstProjectStageId(projectId);
        if (!firstStageId) {
          return res.status(400).json({
            error:
              "O projeto não possui estágios. Crie pelo menos um estágio antes de associar tarefas.",
          });
        }
        throw new Error(
          "Failed to add note. Check your permissions or if the note is already associated."
        );
      }

      res.status(201).json({
        associated_notes: result[0].associated_notes,
        message: "Nota adicionada ao projeto com sucesso",
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
        throw new Error("Failed to update note. Check your permissions.");
      }

      res.status(200).json({
        associated_notes: result[0].associated_notes,
        message: "Nota atualizada no projeto com sucesso",
      });
    } catch (error) {
      this._handleError(error, res, next);
    }
  }

  _parseStringArrayField(value) {
    if (value === undefined || value === null || value === "") return [];
    if (Array.isArray(value))
      return value.map((item) => String(item)).filter(Boolean);
    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          return parsed.map((item) => String(item)).filter(Boolean);
        }
      } catch {
        return value
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean);
      }
    }
    return [];
  }

  _parseNullableField(value) {
    if (value === undefined) return undefined;
    if (value === null || value === "") return null;
    return String(value);
  }

  async _validateTaskPriorityScope(priorityId, projectId, orgId) {
    if (!priorityId) return;
    const tp = await taskPrioritiesRepository.findActiveById(priorityId);
    if (!tp) {
      throw new Error("Prioridade inválida");
    }
    if (tp.project_id && String(tp.project_id) !== String(projectId)) {
      throw new Error("Prioridade não pertence a este projeto");
    }
    if (tp.org_id && orgId && String(tp.org_id) !== String(orgId)) {
      throw new Error("Prioridade não pertence à organização do projeto");
    }
  }

  /**
   * Validates parent_id when creating a task (parent must be a non-deleted note in the same project).
   * @param {string} projectId
   * @param {unknown} parentIdRaw
   * @returns {Promise<string|null>} UUID string or null when absent / cleared
   */
  async _validateParentForNewTask(projectId, parentIdRaw) {
    const parsed = this._parseNullableField(parentIdRaw);
    if (parsed === null || parsed === undefined) return null;
    const parent = await notesRepository.getNoteById(parsed);
    if (
      !parent ||
      parent.deleted ||
      String(parent.project_id) !== String(projectId)
    ) {
      throw new Error("Tarefa pai inválida ou não pertence a este projeto");
    }
    return String(parsed);
  }

  /**
   * Validates parent_id on PATCH (same project; no self or cycle via ancestors of the new parent).
   * @param {string} projectId
   * @param {string} noteId
   * @param {unknown} parentIdRaw
   * @returns {Promise<string|null|undefined>} undefined = leave unchanged, null = clear parent
   */
  async _resolveParentIdForPatchTask(projectId, noteId, parentIdRaw) {
    if (parentIdRaw === undefined) return undefined;
    const parsed = this._parseNullableField(parentIdRaw);
    if (parsed === null) return null;
    if (String(parsed) === String(noteId)) {
      throw new Error("Tarefa não pode ser pai de si mesma");
    }
    const parent = await notesRepository.getNoteById(parsed);
    if (
      !parent ||
      parent.deleted ||
      String(parent.project_id) !== String(projectId)
    ) {
      throw new Error("Tarefa pai inválida ou não pertence a este projeto");
    }
    let walker = parent;
    let depth = 0;
    const maxDepth = 64;
    while (walker && walker.parent_id && depth < maxDepth) {
      if (String(walker.parent_id) === String(noteId)) {
        throw new Error("parent_id inválido: referência circular");
      }
      walker = await notesRepository.getNoteById(walker.parent_id);
      depth += 1;
    }
    return String(parsed);
  }

  async _uploadTaskFiles(noteId, userId, files) {
    if (!Array.isArray(files) || files.length === 0) return [];
    return Promise.all(
      files.map(async (file) => {
        const result = await spacesService.uploadNoteFile(
          file.buffer,
          file.mimetype,
          noteId,
          userId,
          file.originalname
        );
        return {
          id: result.fileName,
          name: file.originalname,
          path: result.key || result.path || "",
          type: file.mimetype,
        };
      })
    );
  }

  async createTaskInStage(req, res, next) {
    try {
      const { projectId, stageId } = req.params;
      const {
        title,
        description = "",
        tags,
        priority_id,
        due_date,
        collaborator_ids,
        properties,
      } = req.body;

      const userId = this._requireAuthenticatedUser(req, res);
      if (!userId) return;

      const descStr =
        description !== null && description !== undefined
          ? String(description)
          : "";
      const effectiveTitle =
        resolveNoteTitle({
          description: descStr,
          title: title !== null && title !== undefined ? String(title) : "",
        }) || "Sem título";

      await this._validateProjectAccess(projectId, userId);
      const canWrite = await this._ensureProjectWriteAccess(projectId, userId);
      if (!canWrite) {
        throw new Error(
          "Acesso negado. Sua role no projeto não permite alterar conteúdos."
        );
      }

      const stageRows =
        await this.projectsRepository.getProjectStages(projectId);
      if (!stageRows.some((stage) => String(stage.id) === String(stageId))) {
        return res
          .status(404)
          .json({ error: "Estágio não encontrado para este projeto" });
      }

      const project = await this.projectsRepository.getProjectByIdWithAccess(
        projectId,
        userId
      );
      const projectOrgId = project?.[0]?.organization_id || null;
      await this._validateTaskPriorityScope(
        this._parseNullableField(priority_id),
        projectId,
        projectOrgId
      );

      const parsedTags = this._parseStringArrayField(tags);
      let parsedProperties = properties || {};
      if (typeof properties === "string") {
        try {
          parsedProperties = JSON.parse(properties || "{}");
        } catch {
          return res
            .status(400)
            .json({ error: "properties deve ser um JSON válido" });
        }
      }
      const parsedDueDate =
        due_date && due_date !== "" ? new Date(due_date).toISOString() : null;
      const parsedPriorityId = this._parseNullableField(priority_id);

      const validatedParentId = await this._validateParentForNewTask(
        projectId,
        req.body.parent_id ?? req.body.parentId
      );

      const createdNote = await notesRepository.createNotesQuery(
        userId,
        effectiveTitle,
        description,
        parsedTags,
        "VISIBLE",
        projectId,
        parsedPriorityId,
        null
      );

      const uploadedFiles = await this._uploadTaskFiles(
        createdNote.id,
        userId,
        req.files?.files || []
      );

      const mergedProperties = {
        ...(createdNote.properties || {}),
        ...(parsedProperties && typeof parsedProperties === "object"
          ? parsedProperties
          : {}),
      };
      if (uploadedFiles.length > 0) {
        mergedProperties.files = [
          ...(Array.isArray(mergedProperties.files)
            ? mergedProperties.files
            : []),
          ...uploadedFiles,
        ];
      }

      await notesRepository.updateNoteById(createdNote.id, {
        due_date: parsedDueDate,
        project_stage_id: stageId,
        properties: mergedProperties,
        ...(validatedParentId ? { parent_id: validatedParentId } : {}),
      });

      const collaboratorIds = this._parseStringArrayField(collaborator_ids);
      await Promise.all(
        collaboratorIds
          .filter((collaboratorId) => collaboratorId !== userId)
          .map((collaboratorId) =>
            notesRepository.addCollaborator(createdNote.id, collaboratorId)
          )
      );

      await this.projectsRepository.updateNoteInProject(
        projectId,
        createdNote.id,
        userId
      );
      const notes = await this.projectsRepository.getAssociatedNotes(
        projectId,
        userId
      );

      res.status(201).json({
        message: "Tarefa criada com sucesso",
        noteId: String(createdNote.id),
        notes,
      });
    } catch (error) {
      this._handleError(error, res, next);
    }
  }

  async patchTaskInProject(req, res, next) {
    try {
      const { projectId, noteId } = req.params;
      const {
        title,
        description,
        priority_id,
        due_date,
        stage_id,
        set_tags,
        add_tags,
        remove_tags,
        set_collaborators,
        add_collaborators,
        remove_collaborators,
        remove_file_ids,
        properties,
        parent_id,
      } = req.body;

      const userId = this._requireAuthenticatedUser(req, res);
      if (!userId) return;

      await this._validateProjectAccess(projectId, userId);
      const canWrite = await this._ensureProjectWriteAccess(projectId, userId);
      if (!canWrite) {
        throw new Error(
          "Acesso negado. Sua role no projeto não permite alterar conteúdos."
        );
      }

      const currentNote = await notesRepository.getNoteById(noteId);
      if (
        !currentNote ||
        String(currentNote.project_id) !== String(projectId)
      ) {
        return res
          .status(404)
          .json({ error: "Tarefa não encontrada neste projeto" });
      }

      const project = await this.projectsRepository.getProjectByIdWithAccess(
        projectId,
        userId
      );
      const projectOrgId = project?.[0]?.organization_id || null;
      const parsedPriorityId = this._parseNullableField(priority_id);
      if (parsedPriorityId !== undefined) {
        await this._validateTaskPriorityScope(
          parsedPriorityId,
          projectId,
          projectOrgId
        );
      }

      const updateData = {};
      if (title !== undefined) updateData.title = String(title).trim();
      if (description !== undefined) updateData.description = description;
      if (parsedPriorityId !== undefined)
        updateData.priority_id = parsedPriorityId;
      if (due_date !== undefined) {
        updateData.due_date =
          due_date === null || due_date === ""
            ? null
            : new Date(due_date).toISOString();
      }

      if (stage_id !== undefined) {
        const parsedStageId = this._parseNullableField(stage_id);
        if (!parsedStageId) {
          return res.status(400).json({
            error:
              "Estágio é obrigatório. Não é permitido remover o estágio da tarefa.",
          });
        }
        const stages =
          await this.projectsRepository.getProjectStages(projectId);
        if (
          !stages.some((stage) => String(stage.id) === String(parsedStageId))
        ) {
          return res.status(404).json({
            error: "Estágio não encontrado para este projeto.",
          });
        }
        updateData.project_stage_id = parsedStageId;
      }

      const resolvedParentId = await this._resolveParentIdForPatchTask(
        projectId,
        noteId,
        parent_id
      );
      if (resolvedParentId !== undefined) {
        updateData.parent_id = resolvedParentId;
      }

      const currentTags = Array.isArray(currentNote.tags)
        ? currentNote.tags.map(String)
        : [];
      let nextTags = currentTags;
      const setTags = this._parseStringArrayField(set_tags);
      if (set_tags !== undefined) {
        nextTags = [...new Set(setTags)];
      } else {
        const addTags = this._parseStringArrayField(add_tags);
        const removeTags = new Set(this._parseStringArrayField(remove_tags));
        nextTags = [...new Set([...currentTags, ...addTags])].filter(
          (tagId) => !removeTags.has(tagId)
        );
      }
      updateData.tags = nextTags;

      let incomingProperties = properties || {};
      if (typeof properties === "string") {
        try {
          incomingProperties = JSON.parse(properties || "{}");
        } catch {
          return res
            .status(400)
            .json({ error: "properties deve ser um JSON válido" });
        }
      }
      const mergedProperties = {
        ...(currentNote.properties || {}),
        ...(incomingProperties && typeof incomingProperties === "object"
          ? incomingProperties
          : {}),
      };

      const uploadedFiles = await this._uploadTaskFiles(
        noteId,
        userId,
        req.files?.files || []
      );

      if (uploadedFiles.length > 0) {
        mergedProperties.files = [
          ...(Array.isArray(mergedProperties.files)
            ? mergedProperties.files
            : []),
          ...uploadedFiles,
        ];
      }

      const removeFileIds = new Set(
        this._parseStringArrayField(remove_file_ids)
      );
      if (removeFileIds.size > 0 && Array.isArray(mergedProperties.files)) {
        const filesToDelete = mergedProperties.files.filter((file) =>
          removeFileIds.has(file.id)
        );
        await Promise.all(
          filesToDelete
            .filter((file) => file.path)
            .map((file) =>
              spacesService.deleteImage(file.path).catch(() => null)
            )
        );
        mergedProperties.files = mergedProperties.files.filter(
          (file) => !removeFileIds.has(file.id)
        );
      }
      updateData.properties = mergedProperties;

      await notesRepository.updateNoteById(noteId, updateData);

      const setCollaborators = this._parseStringArrayField(set_collaborators);
      const addCollaborators = this._parseStringArrayField(add_collaborators);
      const removeCollaborators =
        this._parseStringArrayField(remove_collaborators);

      if (set_collaborators !== undefined) {
        const currentCollaborators =
          await notesRepository.getCollaboratorsByNoteId(noteId);
        const targetIds = new Set(setCollaborators);
        await Promise.all(
          currentCollaborators
            .filter((collaborator) => !collaborator.removed)
            .filter(
              (collaborator) => !targetIds.has(String(collaborator.user_id))
            )
            .map((collaborator) =>
              notesRepository.removeCollaborator(
                noteId,
                String(collaborator.user_id)
              )
            )
        );
        await Promise.all(
          [...targetIds]
            .filter((collaboratorId) => collaboratorId !== userId)
            .map((collaboratorId) =>
              notesRepository.addCollaborator(noteId, collaboratorId)
            )
        );
      } else {
        await Promise.all(
          addCollaborators
            .filter((collaboratorId) => collaboratorId !== userId)
            .map((collaboratorId) =>
              notesRepository.addCollaborator(noteId, collaboratorId)
            )
        );
        await Promise.all(
          removeCollaborators.map((collaboratorId) =>
            notesRepository.removeCollaborator(noteId, collaboratorId)
          )
        );
      }

      await this.projectsRepository.updateNoteInProject(
        projectId,
        noteId,
        userId
      );
      const notes = await this.projectsRepository.getAssociatedNotes(
        projectId,
        userId
      );

      res.status(200).json({
        message: "Tarefa atualizada com sucesso",
        noteId,
        notes,
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

      const parsedStageId =
        stageId === undefined || stageId === null || stageId === ""
          ? null
          : String(stageId);
      if (!parsedStageId) {
        return res.status(400).json({
          error:
            "Estágio é obrigatório. Selecione um estágio válido para esta tarefa.",
        });
      }
      const stages = await this.projectsRepository.getProjectStages(projectId);
      if (!stages.some((stage) => String(stage.id) === parsedStageId)) {
        return res.status(404).json({
          error: "Estágio não encontrado para este projeto.",
        });
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
        parsedStageId
      );

      if (!result || result.length === 0) {
        return res.status(404).json({
          error: "Nota não encontrada no projeto ou estágio inválido.",
        });
      }

      const notes = await this.projectsRepository.getAssociatedNotes(
        projectId,
        userId
      );

      res.status(200).json({
        message: "Note stage successfully updated",
        newStageId: result[0].project_stage_id,
        noteId: result[0].id,
        notes,
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
        message: "Stage successfully updated",
        stage: this._formatProjectStage(result[0]),
      });
    } catch (error) {
      this._handleError(error, res, next);
    }
  }
}

module.exports = new ProjectsUpdateController();
