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

class SearchUsersHandler {
  /**
   * @param { userId: string, args: Record<string, unknown>, organizationId: string|null, lang: string, t: object, name: string } context
   */
  async execute({ userId, args, organizationId, lang, t, name }) {
    const searchTerm = String(args.searchTerm || "").trim();
    if (!searchTerm) {
      throw new Error(t.searchUsersTermRequired);
    }
    const searchUsersRepository = require("@/modules/users/repositories/search-users.repository");
    const users = await searchUsersRepository.searchUsers(searchTerm, userId);
    const endpoint = (process.env.DO_SPACE_ENDPOINT || "").replace(/\/$/, "");
    const bucket = process.env.DO_SPACES_BUCKET_NAME || "wn-storage";
    const region = process.env.DO_SPACES_REGION || "sfo3";

    return {
      name,
      result: {
        users: users.map((u) => {
          let avatarUrl = null;
          if (u.avatar_url) {
            if (
              u.avatar_url.startsWith("http://") ||
              u.avatar_url.startsWith("https://")
            ) {
              avatarUrl = u.avatar_url;
            } else {
              avatarUrl = `${endpoint}/${bucket}/${u.avatar_url}`.replace(
                "digitaloceanspaces.com",
                `${region}.digitaloceanspaces.com`
              );
            }
          }
          return {
            avatar_url: avatarUrl,
            email: u.email,
            id: u.user_id,
            name: u.name,
            username: u.username,
          };
        }),
      },
      success: true,
    };
  }
}

module.exports = new SearchUsersHandler();
