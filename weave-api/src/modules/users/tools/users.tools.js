const { z } = require("zod");
const searchUsersRepository = require("@/modules/users/repositories/search-users.repository");

const manageUsersSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("get_my_profile"),
  }),
  z.object({
    action: z.literal("search_users"),
    limit: z
      .number()
      .optional()
      .describe("Maximum number of results to return"),
    query: z.string().describe("Search term (name or email)"),
  }),
]);

const createUsersTools = (user) => ({
  manage_users: {
    description: "Manage users (get_my_profile, search_users).",
    handler: async (args) => {
      try {
        const { action, query, limit } = args;

        if (action === "get_my_profile") {
          const result = await searchUsersRepository.getUserById(user.userId);
          if (!result)
            return {
              content: [{ text: "User profile not found.", type: "text" }],
              isError: true,
            };
          return {
            content: [{ text: JSON.stringify(result, null, 2), type: "text" }],
          };
        }

        if (action === "search_users") {
          if (!query)
            throw new Error("query is required for search_users action.");
          const result = await searchUsersRepository.searchUsers(
            query,
            user.userId
          );
          let finalResult = result;
          if (limit && Array.isArray(result)) {
            finalResult = result.slice(0, limit);
          }
          return {
            content: [
              { text: JSON.stringify(finalResult, null, 2), type: "text" },
            ],
          };
        }

        throw new Error(`Invalid action: ${action}`);
      } catch (error) {
        return {
          content: [
            { text: `Error managing users: ${error.message}`, type: "text" },
          ],
          isError: true,
        };
      }
    },
    name: "manage_users",
    schema: manageUsersSchema,
  },
});

module.exports = {
  createUsersTools,
};
