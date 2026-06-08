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

class SearchProjectsHandler {
  /**
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
