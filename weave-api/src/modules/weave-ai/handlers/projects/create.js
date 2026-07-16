/**
 * @module weave-ai/handlers/create-project.handler
 * @description Tool handler to create a new project from AI chat.
 *
 * Dependencies:
 * - `@/modules/projects/repositories/projects-create.repository`: For saving the new project and its initial stages.
 */
const projectsCreateRepository = require("@/modules/projects/repositories/projects-create.repository");

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
  async execute({ userId, args, organizationId, lang: _lang, t, name }) {
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
      description: args.description || null,
      methodology: "KANBAN",
      organization_id: organizationId || null,
      parent_project_id: null,
      properties: {},
      status: status,
      title: args.title.trim(),
      user_id: userId,
    };

    const stagesData = [
      { color: "#E2E8F0", name: "Backlog", position: 0, properties: {} },
      { color: "#E2E8F0", name: "To Do", position: 1, properties: {} },
      { color: "#E2E8F0", name: "Doing", position: 2, properties: {} },
      {
        color: "#E2E8F0",
        name: "Done",
        position: 3,
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
        { addedBy: userId, role: "PROJECT_MANAGER", userId: userId },
      ]);

      return {
        name,
        result: {
          created: true,
          message: "Project created successfully.",
          projectId: newProject.id,
          publicProjectId: newProject.public_project_id,
        },
        success: true,
      };
    } catch (error) {
      throw new Error("Database error creating project: " + error.message);
    }
  }
}

module.exports = new CreateProjectHandler();
