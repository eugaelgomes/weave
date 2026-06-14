/**
 * @module weave-ai/handlers/update-project-title.handler
 * @description Tool handler to rename an existing project.
 *
 * Dependencies:
 * - `@/modules/projects/repositories/projects-update.repository`: For updating the project title.
 * - `../utils/chat-access.util`: To verify user permissions.
 */
const notesRepository = require("@/modules/notes/notes.repository");
const projectsReadRepository = require("@/modules/projects/repositories/projects-read.repository");
const projectsUpdateRepository = require("@/modules/projects/repositories/projects-update.repository");
const workspaceUserScopeRepository = require("@/modules/users/repositories/workspace-user-scope.repository");
const chatAccessUtil = require("../utils/chat-access.util");
const chatFormatterUtil = require("../utils/chat-formatter.util");
const { markdownToBlocks } = require("../utils/markdown-to-blocks.util");
const { NOTE_STATUS } = require("@/utils/patterns/product-patterns");
const { WORKSPACE_SHARE_DENIED } = require("@/utils/workspace-share-guard");
const {
  normalizeBlocksTree,
  newBlockId,
} = require("@/modules/notes/block-normalizer");
const {
  enqueueNoteEmbeddingJob,
} = require("@/services/queue/queue-controller");

class UpdateProjectTitleHandler {
  /**
   * Executes the tool logic to update a project's title.
   *
   * @param {Object} context - The execution context.
   * @param {string} context.userId - UUID of the user.
   * @param {Record<string, unknown>} context.args - Arguments passed by the LLM.
   * @param {string|null} context.organizationId - UUID of the organization.
   * @param {string} context.lang - Language code for errors.
   * @param {object} context.t - Translation dictionary.
   * @param {string} context.name - Name of the tool.
   * @returns {Promise<{name: string, result: object, success: boolean}>} The execution result.
   * @param { userId: string, args: Record<string, unknown>, organizationId: string|null, lang: string, t: object, name: string } context
   */
  async execute({ userId, args, organizationId, lang, t, name }) {
    await chatAccessUtil.assertProjectMutationAccess(
      userId,
      String(args.projectId || ""),
      organizationId,
      lang
    );
    const oldProject = await projectsReadRepository
      .getProjectById(args.projectId, userId)
      .catch(() => null);
    const result = await projectsUpdateRepository.updateProject(
      args.projectId,
      userId,
      {
        title: args.title,
      }
    );
    return {
      name,
      result: {
        projectId: args.projectId,
        updated: Array.isArray(result) && result.length > 0,
        snapshot: oldProject
          ? { type: "project_title", title: oldProject.title }
          : undefined,
      },
      success: true,
    };
  }
}

module.exports = new UpdateProjectTitleHandler();
