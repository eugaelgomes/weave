const ProjectsCoreController = require("@/modules/projects/controllers/projects-core.controller");
const {
  ASSIGNABLE_PROJECT_ROLES,
} = require("@/modules/projects/project-role-policy");
const projectsCollaboratorsRepository = require("@/modules/projects/repositories/projects-collaborators.repository");

class ProjectsCollaboratorsUpdateController extends ProjectsCoreController {
  constructor() {
    super();
    this.projectsRepository = projectsCollaboratorsRepository;
  }

  /**
   * PUT/PATCH /api/projects/:projectId/collaborators/:collaboratorId
   * Updates collaborator role.
   */
  async updateCollaboratorPermission(req, res, next) {
    try {
      const { projectId, collaboratorId } = req.params;
      const { role } = req.body;

      const userId = this._requireAuthenticatedUser(req, res);
      if (!userId) return;

      const ctx = await this._getProjectOwnershipContext(projectId, userId);

      if (!ASSIGNABLE_PROJECT_ROLES.includes(role)) {
        throw new Error(
          "Role inválido. Use 'project_manager', 'contributor', 'commenter' ou 'viewer'"
        );
      }

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
}

module.exports = new ProjectsCollaboratorsUpdateController();
