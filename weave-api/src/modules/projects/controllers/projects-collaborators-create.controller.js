const ProjectsCoreController = require("@/modules/projects/controllers/projects-core.controller");
const PlanUsageManager = require("@/modules/plans/plans.controller");
const PlansRepository = require("@/modules/plans/plans.repository");
const {
  ASSIGNABLE_PROJECT_ROLES,
} = require("@/modules/projects/project-role-policy");
const projectsCollaboratorsRepository = require("@/modules/projects/repositories/projects-collaborators.repository");
const { sendPlanLimitExceeded } = require("@/utils/plan-limit-http");
const {
  respondIfWorkspaceShareDenied,
} = require("@/utils/workspace-share-guard");

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

      const usageRecord = await PlanUsageManager.managePlanUsage(userId);
      const getUserPlan = await PlansRepository.getUserAndPlan(userId);
      const planDetails = await PlansRepository.getPlanById(getUserPlan.plan_id);

      if (!usageRecord || !planDetails) {
        return res.status(404).json({
          error: "Configuração de plano não encontrada para este usuário.",
        });
      }

      const ctx = await this._getProjectOwnershipContext(projectId, userId);

      const collaborators = ctx.orgWide
        ? await this.projectsRepository.getCollaboratorsWithOrgScope(
            projectId,
            ctx.membership.id
          )
        : await this.projectsRepository.getCollaborators(projectId, userId);
      const currentCollaborators = collaborators[0]?.collaborators || [];
      const maxCollaborators =
        planDetails.details?.limits?.max_collaborators_per_project;

      if (maxCollaborators && currentCollaborators.length >= maxCollaborators) {
        return sendPlanLimitExceeded(res, {
          resource: "project_collaborators",
          limit_key: "limits.max_collaborators_per_project",
          error: "Limite de colaboradores atingido",
          message: `Seu plano (${planDetails.name}) permite apenas ${maxCollaborators} colaboradores por projeto.`,
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

      if (
        await respondIfWorkspaceShareDenied(res, userId, collaboratorId)
      ) {
        return;
      }

      const isSuspended = await this.projectsRepository.isSuspendedCollaborator(
        projectId,
        collaboratorId
      );
      if (isSuspended) {
        throw new Error(
          "Usuário suspenso do projeto, basta remover suspensão e o mesmo voltará como colaborador."
        );
      }

      const isAlreadyCollaborator = await this.projectsRepository.isCollaborator(
        projectId,
        collaboratorId
      );

      if (isAlreadyCollaborator) {
        throw new Error("Usuário já é colaborador deste projeto");
      }

      const result = ctx.orgWide
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
}

module.exports = new ProjectsCollaboratorsCreateController();
