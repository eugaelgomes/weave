const notesRepository = require("@/modules/notes/notes.repository");
/**
 * @module weave-ai/handlers/search-projects.handler
 * @description Tool handler to search for projects by title or description.
 *
 * Dependencies:
 * - `@/modules/projects/repositories/projects-read.repository`: For querying projects.
 */
const projectsReadRepository = require("@/modules/projects/repositories/projects-read.repository");
const projectsUpdateRepository = require("@/modules/projects/repositories/projects-update.repository");
const workspaceUserScopeRepository = require("@/modules/users/repositories/workspace-user-scope.repository");
const chatAccessUtil = require("../../utils/chat-access.util");
const chatFormatterUtil = require("../../utils/chat-formatter.util");
const { markdownToBlocks } = require("../../utils/markdown-to-blocks.util");
const { NOTE_STATUS } = require("@/utils/patterns/product-patterns");
const { WORKSPACE_SHARE_DENIED } = require("@/utils/workspace-share-guard");
const {
  normalizeBlocksTree,
  newBlockId,
} = require("@/modules/notes/block-normalizer");
const {
  enqueueNoteEmbeddingJob,
} = require("@/services/queue/queue-controller");

class SearchProjectsHandler {
  /**
   * Executes the tool logic to search for projects.
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
    const searchTerm = String(args.searchTerm || "").trim();
    if (!searchTerm) {
      throw new Error(t.searchProjectsTermRequired);
    }

    const scope = organizationId
      ? { mode: "organization", organizationId }
      : { mode: "user", userId };

    const { rows } = await projectsReadRepository.getAllProjectsFiltered(
      scope,
      { search: searchTerm },
      { limit: 10, offset: 0 },
      { field: "created_at", order: "desc" },
      { collaborators: false, notes: false, subprojects: false },
      userId
    );

    return {
      name,
      result: {
        projects: rows.map((p) => ({
          id: p.id,
          public_id: p.public_project_id,
          title: p.title,
          status: p.status,
        })),
      },
      success: true,
    };
  }
}

module.exports = new SearchProjectsHandler();
