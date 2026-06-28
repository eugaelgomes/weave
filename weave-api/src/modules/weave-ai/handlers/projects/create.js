/**
 * @module weave-ai/handlers/create-project.handler
 * @description Tool handler to create a new project from AI chat.
 *
 * Dependencies:
 * - `@/modules/projects/repositories/projects-create.repository`: For saving the new project and its initial stages.
 */
const projectsCreateRepository = require("@/modules/projects/repositories/projects-create.repository");
const { PROJECT_STATUS } = require("@/utils/patterns/product-patterns");

class CreateProjectHandler {
  /**
   * Executes the tool logic to create a new project.
   *
   * @param {Object} context - The execution context provided by the chat orchestrator.
   * @param {string} context.userId - UUID of the user.
   * @param {Record<string, unknown>} context.args - Arguments passed by the LLM.
   * @param {string|null} context.organizationId - UUID of the organization.
   * @param {string} context.lang - Language code for errors.
   * @param {object} context.t - Translation dictionary.
   * @param {string} context.name - Name of the tool being executed.
   * @returns {Promise<{name: string, result: object, success: boolean}>} The execution result payload.
   */
  async execute({ userId, args, organizationId, lang, t, name }) {
    if (!args.title || !args.title.trim()) {
      throw new Error(t.invalidTitle || "Project title is required.");
    }

    const validStatuses = [
      "OPEN",
      "IN_PROGRESS",
      "PAUSED",
      "COMPLETED",
      "ARCHIVED",
    ];
    let status = args.status ? String(args.status).toUpperCase() : "OPEN";
    if (!validStatuses.includes(status)) {
      status = "OPEN";
    }

    const projectData = {
      user_id: userId,
      organization_id: organizationId || null,
      title: args.title.trim(),
      description: args.description || null,
      methodology: "KANBAN",
      status: status,
      properties: {},
      parent_project_id: null,
    };

    const stagesData = [
      { name: "Backlog", position: 0, color: "#E2E8F0", properties: {} },
      { name: "To Do", position: 1, color: "#E2E8F0", properties: {} },
      { name: "Doing", position: 2, color: "#E2E8F0", properties: {} },
      {
        name: "Done",
        position: 3,
        color: "#E2E8F0",
        properties: { is_done: true },
      },
    ];

    try {
      const result = await projectsCreateRepository.createProjectWithStages(
        projectData,
        stagesData
      );

      if (!result || result.length === 0) {
        throw new Error(t.projectCreateFailed || "Failed to create project.");
      }

      const newProject = result[0];

      // Auto-add creator as project owner
      await projectsCreateRepository.bulkAddProjectMembers(newProject.id, [
        { userId: userId, role: "PROJECT_MANAGER", addedBy: userId },
      ]);

      return {
        name,
        result: {
          projectId: newProject.id,
          publicProjectId: newProject.public_project_id,
          created: true,
          message: "Project created successfully.",
        },
        success: true,
      };
    } catch (error) {
      throw new Error("Database error creating project: " + error.message);
    }
  }
}

module.exports = new CreateProjectHandler();
