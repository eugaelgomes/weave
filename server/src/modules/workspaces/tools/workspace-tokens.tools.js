const { z } = require("zod");
const workspaceTokensRepository = require("@/modules/workspaces/repositories/tokens.repository");

const listWorkspaceTokensSchema = z.object({});

/**
 * Creates the WorkspaceTokens tools registry bound to a specific user context.
 *
 * @param {Object} user - The authenticated user object.
 * @returns {Record<string, Object>} The workspace-tokens tools definition map.
 */
const createWorkspaceTokensTools = (user) => ({
  list_workspace_tokens: {
    description: "List all Workspace tokens for the authenticated user.",
    handler: async () => {
      try {
        const tokens = await workspaceTokensRepository.getTokensByUserId(user.id);
        return {
          content: [{ text: JSON.stringify(tokens, null, 2), type: "text" }],
        };
      } catch (error) {
        return {
          content: [
            {
              text: `Error listing Workspace tokens: ${error.message}`,
              type: "text",
            },
          ],
          isError: true,
        };
      }
    },
    name: "list_workspace_tokens",
    schema: listWorkspaceTokensSchema,
  },
});

module.exports = {
  createWorkspaceTokensTools,
};
