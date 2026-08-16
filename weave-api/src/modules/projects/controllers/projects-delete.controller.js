const ProjectsCoreController = require("@/modules/projects/controllers/projects-core.controller");
const organizationsRepository = require("@/modules/organizations/repositories/organizations.repository");
const PlansService = require("@/modules/plans/services/plans.service");

class ProjectsDeleteController extends ProjectsCoreController {
  async deleteProject(req, res, next) {
    try {
      const { id } = req.params;

      // Validação de autenticação
      const userId = this._requireAuthenticatedUser(req, res);
      if (!userId) return;

      const membership = await organizationsRepository.getActiveOrganizationWithMembership(userId);
      const orgWide = this._canAccessAllOrganizationProjects(membership);

      // Ensure project exists and user has access (middleware should already enforce permission).
      const project = await this._validateProjectAccess(id, userId);

      const usageRecord = await PlansService.managePlanUsage(project.user_id);

      const result =
        orgWide && membership?.id
          ? await this.projectsRepository.deleteProjectInOrganization(id, membership.id)
          : await this.projectsRepository.deleteProject(id, userId);

      if (!result || result.length === 0) {
        throw new Error("Failed to delete project");
      }

      // Decrementar o uso de projetos
      if (usageRecord) {
        await PlansService.decrementProjectUsage(usageRecord.id);
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
  /**
   * DELETE /api/projects/:projectId/collaborators/:collaboratorId - Remover colaborador
   * Remove um colaborador do projeto
   */
  async removeCollaborator(req, res, next) {
    try {
      const { projectId, collaboratorId } = req.params;

      // Validação de autenticação
      const userId = this._requireAuthenticatedUser(req, res);
      if (!userId) return;

      const ctx = await this._getProjectOwnershipContext(projectId, userId);

      // Verificar se o colaborador existe no projeto
      const isCollaborator = await this.projectsRepository.isCollaborator(
        projectId,
        collaboratorId
      );

      if (!isCollaborator) {
        throw new Error("Usuário não é colaborador deste projeto");
      }

      const result = ctx.orgWide
        ? await this.projectsRepository.removeCollaboratorWithOrgManagement(
            projectId,
            ctx.membership.id,
            collaboratorId
          )
        : await this.projectsRepository.removeCollaborator(projectId, userId, collaboratorId);

      if (!result || result.length === 0) {
        throw new Error("Failed to remove collaborator");
      }

      res.status(200).json({
        message: "Colaborador removido com sucesso",
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
      const userId = this._requireAuthenticatedUser(req, res);
      if (!userId) return;

      const membership = await organizationsRepository.getActiveOrganizationWithMembership(userId);
      const orgWide = this._canAccessAllOrganizationProjects(membership);

      await this._validateProjectAccess(projectId, userId);
      const canWrite = await this._ensureProjectWriteAccess(projectId, userId);
      if (!canWrite) {
        throw new Error("Acesso negado. Sua role no projeto não permite alterar conteúdos.");
      }

      const result =
        orgWide && membership.id
          ? await this.projectsRepository.removeNoteFromProjectWithOrgScope(
              projectId,
              noteId,
              userId,
              membership.id
            )
          : await this.projectsRepository.removeNoteFromProject(projectId, noteId, userId);

      if (!result || result.length === 0) {
        throw new Error("Failed to remove note. Check your permissions.");
      }

      res.status(200).json({
        message: "Nota removida do projeto com sucesso",
      });
    } catch (error) {
      this._handleError(error, res, next);
    }
  }

  /**
   * DELETE /api/projects/:id/stages/:stageId
   * Remove o estágio; notas associadas migram para o primeiro estágio restante.
   */
  async deleteProjectStage(req, res, next) {
    try {
      const { id, stageId } = req.params;

      const userId = this._requireAuthenticatedUser(req, res);
      if (!userId) return;

      const ctx = await this._getProjectOwnershipContext(id, userId);

      const stages = await this.projectsRepository.getProjectStages(id);
      if (!stages || stages.length <= 1) {
        return res.status(400).json({
          error:
            "Não é possível remover o último estágio do projeto. Crie outro estágio antes de excluir este.",
        });
      }

      const result = ctx.orgWide
        ? await this.projectsRepository.deleteProjectStageInOrganization(
            id,
            ctx.membership.id,
            stageId
          )
        : await this.projectsRepository.deleteProjectStage(id, userId, stageId);

      if (!result || result.length === 0) {
        return res.status(404).json({
          error: "Estágio não encontrado ou você não tem permissão",
        });
      }

      res.status(200).json({
        message: "Estágio removido com sucesso",
        stage: this._formatProjectStage(result[0]),
      });
    } catch (error) {
      this._handleError(error, res, next);
    }
  }
}

module.exports = new ProjectsDeleteController();
