const { z } = require("zod");
const listApiTokensRepository = require("@/modules/api-tokens/repositories/list-api-tokens.repository");

const listApiTokensSchema = z.object({});

/**
 * Creates the ApiTokens tools registry bound to a specific user context.
 *
 * @param {Object} user - The authenticated user object.
 * @returns {Record<string, Object>} The api-tokens tools definition map.
 */
const createApiTokensTools = (user) => ({
  list_api_tokens: {
    description: "List all API tokens for the authenticated user.",
    handler: async () => {
      try {
        const tokens = await listApiTokensRepository.getTokensByUserId(user.id);
        return {
          content: [{ text: JSON.stringify(tokens, null, 2), type: "text" }],
        };
      } catch (error) {
        return {
          content: [
            {
              text: `Error listing API tokens: ${error.message}`,
              type: "text",
            },
          ],
          isError: true,
        };
      }
    },
    name: "list_api_tokens",
    schema: listApiTokensSchema,
  },
});

module.exports = {
  createApiTokensTools,
};
