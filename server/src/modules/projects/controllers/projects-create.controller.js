const ProjectsCoreController = require("@/modules/projects/controllers/projects-core.controller");
const {
  ALLOWED_PROJECT_STATUSES,
  normalizeProjectStatus,
} = require("@/utils/patterns/product-patterns");
const PlansService = require("@/modules/plans/services/plans.service");
const PlansRepository = require("@/modules/plans/repositories/plans.repository");
const { PLAN_PATHS, USAGE_PATHS } = require("@/modules/plans/utils/plan-paths.util");
const { sendPlanLimitExceeded } = require("@/modules/plans/utils/plan-limit-http.util");
const {
  respondIfWorkspaceShareDenied,
} = require("@/modules/organizations/utils/workspace-share-guard.util");
const { normalizeNewProject } = require("../normalizer");
const { ASSIGNABLE_PROJECT_ROLES } = require("@/modules/projects/project-role-policy");
const organizationsRepository = require("@/modules/organizations/repositories/organizations.repository");

class ProjectsCreateController extends ProjectsCoreController {
  /**
   * POST /api/projects - Criar um novo projeto
   * Cria um novo projeto para o usuário autenticado
   */
  async createProject(req, res, next) {
    try {
      const { title, description, status, properties, methodology, org_id, parent_project_id } =
        req.body;

      // Validação de autenticação
      const userId = this._requireAuthenticatedUser(req, res);
      if (!userId) return;

      const usageRecord = await PlansService.managePlanUsage(userId);
      const getUserPlan = await PlansRepository.getUserAndPlan(userId);
      const planDetails = await PlansRepository.getPlanById(getUserPlan.plan_id);

      if (!usageRecord || !planDetails) {
        return res.status(404).json({
          error: "Configuração de plano não encontrada para este usuário.",
        });
      }

      if (!planDetails.details) {
        return res.status(500).json({
          error: "Configuração de plano inválida",
          message: "O plano não possui configuração (details) no banco de dados.",
        });
      }

      const getNestedValue = (obj, path) =>
        path.split(".").reduce((acc, part) => acc && acc[part], obj);
      const maxProjects = getNestedValue(planDetails.details, PLAN_PATHS.LIMITS.MAX_PROJECTS);

      if (maxProjects === undefined) {
        return res.status(500).json({
          error: "Configuração de plano inválida",
          message: "O plano não possui limite de projetos configurado.",
        });
      }

      const canCreate = PlansService.checkLimit(
        planDetails.details,
        usageRecord.usage_details,
        USAGE_PATHS.SUMMARY.PROJECTS_TOTAL,
        PLAN_PATHS.LIMITS.MAX_PROJECTS
      );

      if (!canCreate) {
        return sendPlanLimitExceeded(res, {
          error: "Limite de projetos atingido",
          limit_key: PLAN_PATHS.LIMITS.MAX_PROJECTS,
          message: `Seu plano (${planDetails.name}) permite apenas ${maxProjects} projetos.`,
          resource: "projects",
        });
      }

      if (!title) {
        throw new Error("Título é obrigatório");
      }

      const projectStatus = normalizeProjectStatus(status);
      if (!projectStatus || !ALLOWED_PROJECT_STATUSES.includes(projectStatus)) {
        return res.status(400).json({
          error: `Status inválido. Permitidos: ${ALLOWED_PROJECT_STATUSES.join(", ")}`,
        });
      }

      // 🟢 2. Valida as propriedades de UI/Design que o usuário enviou (color, icon, tags)
      const userValidatedProps = properties ? this._validateProperties(properties) : {};

      // 🟢 3. CHAMADA AO NORMALIZER
      // Passamos os dados da requisição + as propriedades validadas pelo usuário
      const allowedMethodologies = ["kanban", "scrum"];
      if (
        methodology !== undefined &&
        methodology !== null &&
        !allowedMethodologies.includes(String(methodology).toLowerCase())
      ) {
        return res.status(422).json({
          error: "Metodologia inválida. Permitidas: kanban, scrum.",
        });
      }

      const payload = {
        description,
        methodology,
        parent_project_id,
        status: projectStatus,
        title,
      };
      const { projectData, stagesData } = normalizeNewProject(
        payload,
        userId,
        org_id ||
          (await organizationsRepository.getActiveOrganizationWithMembership(userId))?.id ||
          null,
        userValidatedProps // Injetamos as props do usuário para mesclar com as props de negócio
      );

      // 🟢 4. Persistência no banco de dados
      // NOTA ARQUITETURAL: Como agora você tem projectData e stagesData,
      // o método no Repository precisa salvar ambos usando uma Transaction SQL.
      const result = await this.projectsRepository.createProjectWithStages(projectData, stagesData);

      if (!result || result.length === 0) {
        throw new Error("Failed to create project");
      }

      // Incrementar o uso de projetos
      await PlansService.consumeProjectCreation(usageRecord.id);

      const newProject = result[0];

      // ═══════════════════════════════════════════════════════════════
      // Auto-add org admins + area managers/contributors as project members
      // ═══════════════════════════════════════════════════════════════
      if (newProject.organization_id) {
        try {
          const autoMembers = await organizationsRepository.getAutoAssignableProjectMembers(
            newProject.organization_id,
            userId
          );

          if (autoMembers.length > 0) {
            const membersToInsert = autoMembers.map((m) => ({
              addedBy: userId,
              role: m.project_role,
              userId: m.user_id,
            }));

            await this.projectsRepository.bulkAddProjectMembers(newProject.id, membersToInsert);
          }
        } catch (autoAddError) {
          // Non-blocking: log and continue
          console.error("[Auto-Add Members] Failed to auto-add members:", autoAddError);
        }
      }

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
   * POST /api/projects/:projectId/collaborators - Adicionar colaborador
   * Adiciona um usuário como colaborador do projeto
   * @deprecated Use manageCollaborators com action: 'add'
   */
  async addCollaborator(req, res, next) {
    try {
      const { projectId } = req.params;
      const { userId: collaboratorId, role = "contributor" } = req.body;

      // Validação de autenticação
      const userId = this._requireAuthenticatedUser(req, res);
      if (!userId) return;

      // Buscar/Criar registro de uso
      const usageRecord = await PlansService.managePlanUsage(userId);
      const getUserPlan = await PlansRepository.getUserAndPlan(userId);

      // Buscar detalhes do plano
      const planDetails = await PlansRepository.getPlanById(getUserPlan.plan_id);

      if (!usageRecord || !planDetails) {
        return res.status(404).json({
          error: "Configuração de plano não encontrada para este usuário.",
        });
      }

      const ctx = await this._getProjectOwnershipContext(projectId, userId);

      // Validar limite de colaboradores por projeto
      const collaborators = ctx.orgWide
        ? await this.projectsRepository.getCollaboratorsWithOrgScope(projectId, ctx.membership.id)
        : await this.projectsRepository.getCollaborators(projectId, userId);
      const currentCollaborators = collaborators[0]?.collaborators || [];
      const maxCollaborators = planDetails.details?.limits?.max_collaborators_per_project;

      if (maxCollaborators && currentCollaborators.length >= maxCollaborators) {
        return sendPlanLimitExceeded(res, {
          error: "Limite de colaboradores atingido",
          limit_key: "limits.max_collaborators_per_project",
          message: `Seu plano (${planDetails.name}) permite apenas ${maxCollaborators} colaboradores por projeto.`,
          resource: "project_collaborators",
        });
      }

      // Validação de dados obrigatórios
      if (!collaboratorId) {
        throw new Error("ID do colaborador é obrigatório");
      }

      // Validar role
      if (!ASSIGNABLE_PROJECT_ROLES.includes(role)) {
        throw new Error(
          "Role inválido. Use 'project_manager', 'contributor', 'commenter' ou 'viewer'"
        );
      }

      // Verificar se o usuário não está tentando adicionar a si mesmo
      if (collaboratorId === userId) {
        throw new Error("Você não pode adicionar a si mesmo como colaborador");
      }

      if (await respondIfWorkspaceShareDenied(res, userId, collaboratorId)) {
        return;
      }

      // Verificar se o colaborador já está ativo
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
        : await this.projectsRepository.addCollaborator(projectId, userId, collaboratorId, role);

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

module.exports = new ProjectsCreateController();
