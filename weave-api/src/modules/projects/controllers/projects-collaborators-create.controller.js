const ProjectsCoreController = require("@/modules/projects/controllers/projects-core.controller");
const PlansService = require("@/modules/plans/services/plans.service");
const PlansRepository = require("@/modules/plans/repositories/plans.repository");
const {
  ASSIGNABLE_PROJECT_ROLES,
} = require("@/modules/projects/project-role-policy");
const projectsCollaboratorsRepository = require("@/modules/projects/repositories/projects-collaborators.repository");
const {
  sendPlanLimitExceeded,
} = require("@/modules/plans/utils/plan-limit-http.util");
const {
  respondIfWorkspaceShareDenied,
} = require("@/modules/organizations/utils/workspace-share-guard.util");
const organizationsRepository = require("@/modules/organizations/repositories/organizations.repository");

class ProjectsCollaboratorsCreateController extends ProjectsCoreController {
  constructor() {
    super();
    this.projectsRepository = projectsCollaboratorsRepository;
  }

  /**
   * POST /api/projects/:projectId/collaborators - Add collaborator
   */
  async addCollaborator(req, res, next) {
    try {
      const { projectId } = req.params;
      const { userId: collaboratorId, role = "contributor" } = req.body;

      const userId = this._requireAuthenticatedUser(req, res);
      if (!userId) return;

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

      const membership =
        await organizationsRepository.getActiveOrganizationWithMembership(
          userId
        );
      const orgWide = this._canAccessAllOrganizationProjects(membership);

      // Ensure user has access (permission is enforced by route middleware).
      await this._validateProjectAccess(projectId, userId);

      const collaborators =
        orgWide && membership?.id
          ? await this.projectsRepository.getCollaboratorsWithOrgScope(
              projectId,
              membership.id
            )
          : await this.projectsRepository.getCollaborators(projectId, userId);
      const currentCollaborators = collaborators[0]?.collaborators || [];
      const maxCollaborators =
        planDetails.details?.limits?.max_collaborators_per_project;

      if (maxCollaborators && currentCollaborators.length >= maxCollaborators) {
        return sendPlanLimitExceeded(res, {
          error: "Limite de colaboradores atingido",
          limit_key: "limits.max_collaborators_per_project",
          message: `Seu plano (${planDetails.name}) permite apenas ${maxCollaborators} colaboradores por projeto.`,
          resource: "project_collaborators",
        });
      }

      if (!collaboratorId) {
        throw new Error("ID do colaborador é obrigatório");
      }

      if (!ASSIGNABLE_PROJECT_ROLES.includes(role)) {
        throw new Error(
          "Role inválido. Use 'project_manager', 'contributor', 'commenter' ou 'viewer'"
        );
      }

      if (collaboratorId === userId) {
        throw new Error("Você não pode adicionar a si mesmo como colaborador");
      }

      if (await respondIfWorkspaceShareDenied(res, userId, collaboratorId)) {
        return;
      }

      const isAlreadyCollaborator =
        await this.projectsRepository.isCollaborator(projectId, collaboratorId);

      if (isAlreadyCollaborator) {
        throw new Error("Usuário já é colaborador deste projeto");
      }

      const result =
        orgWide && membership?.id
          ? await this.projectsRepository.addCollaboratorWithOrgManagement(
              projectId,
              membership.id,
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

      if (!result || result.length === 0) {
        throw new Error("Failed to add collaborator");
      }

      res.status(201).json({
        collaborators: result[0].collaborators,
        message: "Colaborador adicionado com sucesso",
      });
    } catch (error) {
      this._handleError(error, res, next);
    }
  }
}

module.exports = new ProjectsCollaboratorsCreateController();
