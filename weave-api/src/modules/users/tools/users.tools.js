const { z } = require("zod");
const searchUsersRepository = require("@/modules/users/repositories/search-users.repository");

// Input schemas for the LLM
const getMyProfileSchema = z.object({});

const searchUsersSchema = z.object({
  limit: z.number().optional().describe("Maximum number of results to return"),
  query: z.string().min(1).describe("Search term (name or email)"),
});

/**
 * Creates the Users tools registry bound to a specific user context.
 *
 * @param {Object} user - The authenticated user object.
 * @returns {Record<string, Object>} The users tools definition map.
 */
const createUsersTools = (user) => ({
  get_my_profile: {
    description: "Get authenticated user profile.",
    handler: async () => {
      try {
        const result = await searchUsersRepository.getUserById(user.userId);
        if (!result) {
          return {
            content: [{ text: "User profile not found.", type: "text" }],
            isError: true,
          };
        }
        return {
          content: [{ text: JSON.stringify(result, null, 2), type: "text" }],
        };
      } catch (error) {
        return {
          content: [
            { text: `Error getting profile: ${error.message}`, type: "text" },
          ],
          isError: true,
        };
      }
    },
    name: "get_my_profile",
    schema: getMyProfileSchema,
  },
  search_users: {
    description: "Search team members by name or email.",
    handler: async (args) => {
      try {
        // searchUsers repository method signature: searchUsers(searchTerm, searcherUserId)
        const result = await searchUsersRepository.searchUsers(
          args.query,
          user.userId
        );

        // Optional slicing if limit is provided (since repository doesn't have a limit param)
        let finalResult = result;
        if (args.limit && Array.isArray(result)) {
          finalResult = result.slice(0, args.limit);
        }

        return {
          content: [
            { text: JSON.stringify(finalResult, null, 2), type: "text" },
          ],
        };
      } catch (error) {
        return {
          content: [
            { text: `Error searching users: ${error.message}`, type: "text" },
          ],
          isError: true,
        };
      }
    },
    name: "search_users",
    schema: searchUsersSchema,
  },
});

module.exports = {
  createUsersTools,
};
