/**
 * @module weave-ai/handlers/delete-project.handler
 * @description Tool handler to permanently (soft) delete an existing project.
 *
 * Dependencies:
 * - `@/modules/projects/repositories/projects-delete.repository`: For deleting the project.
 * - `@/modules/projects/repositories/projects-read.repository`: For fetching the snapshot before deletion.
 * - `../utils/chat-access.util`: To verify user permissions.
 */
const projectsDeleteRepository = require("@/modules/projects/repositories/projects-delete.repository");
const projectsReadRepository = require("@/modules/projects/repositories/projects-read.repository");
const chatAccessUtil = require("../utils/chat-access.util");

class DeleteProjectHandler {
  /**
   * Executes the tool logic to delete a project.
   *
   * @param {Object} context - The execution context.
   * @param {string} context.userId - UUID of the user.
   * @param {Record<string, unknown>} context.args - Arguments passed by the LLM.
   * @param {string|null} context.organizationId - UUID of the organization.
   * @param {string} context.lang - Language code for errors.
   * @param {object} context.t - Translation dictionary.
   * @param {string} context.name - Name of the tool.
   * @returns {Promise<{name: string, result: object, success: boolean}>} The execution result.
   */
  async execute({ userId, args, organizationId, lang, t, name }) {
    await chatAccessUtil.assertProjectMutationAccess(
      userId,
      String(args.projectId || ""),
      organizationId,
      lang
    );

    const oldProjectRows = await projectsReadRepository
      .getProjectById(args.projectId, userId)
      .catch(() => null);

    const oldProject = Array.isArray(oldProjectRows) && oldProjectRows.length > 0 
      ? oldProjectRows[0] 
      : null;

    let result;
    if (organizationId) {
       result = await projectsDeleteRepository.deleteProjectInOrganization(args.projectId, organizationId);
    } else {
       result = await projectsDeleteRepository.deleteProject(args.projectId, userId);
    }

    return {
      name,
      result: {
        projectId: args.projectId,
        deleted: Array.isArray(result) && result.length > 0,
        snapshot: oldProject
          ? { type: "project_deleted", title: oldProject.title }
          : undefined,
      },
      success: true,
    };
  }
}

module.exports = new DeleteProjectHandler();
