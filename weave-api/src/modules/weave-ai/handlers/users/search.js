/**
 * @module weave-ai/handlers/search-users.handler
 * @description Tool handler to search for users inside the workspace.
 *
 * Dependencies:
 * - `@/modules/users/repositories/workspace-user-scope.repository`: For querying workspace members.
 */

class SearchUsersHandler {
  /**
   * Executes the tool logic to search for users.
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
  async execute({ userId, args, _organizationId, _lang, t, name }) {
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
