const ProjectsCoreController = require("@/modules/projects/controllers/projects-core.controller");
const organizationsRepository = require("@/modules/organizations/repositories/organizations.repository");
const PlanUsageManager = require("@/modules/plans/plans.controller");
const { USAGE_PATHS } = require("@/services/plans/plan-paths");

class ProjectsDeleteController extends ProjectsCoreController {
  async deleteProject(req, res, next) {
    try {
      const { id } = req.params;

      // Validação de autenticação
      const userId = this._requireAuthenticatedUser(req, res);
      if (!userId) return;

      const ctx = await this._getProjectOwnershipContext(id, userId);
      const usageRecord = await PlanUsageManager.managePlanUsage(
        ctx.project.user_id
      );

      const result = ctx.orgWide
        ? await this.projectsRepository.deleteProjectInOrganization(
            id,
            ctx.membership.id
          )
        : await this.projectsRepository.deleteProject(id, userId);

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
        : await this.projectsRepository.removeCollaborator(
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
   * DELETE /api/projects/:projectId/notes/:noteId - Remover nota do projeto
   * Remove a associação de uma nota com o projeto
   */
  async removeNoteFromProject(req, res, next) {
    try {
      const { projectId, noteId } = req.params;

      // Validação de autenticação
      const userId = this._requireAuthenticatedUser(req, res);
      if (!userId) return;

      const membership =
        await organizationsRepository.getActiveOrganizationWithMembership(userId);
      const orgWide = this._canAccessAllOrganizationProjects(membership);

      await this._validateProjectAccess(projectId, userId);

      const result =
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
}

module.exports = new ProjectsDeleteController();
