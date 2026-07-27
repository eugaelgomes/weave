const { z } = require("zod");
const tagsRepository = require("@/modules/tags/repositories/tags.repository");

const manageTagsSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create"),
    color: z
      .string()
      .optional()
      .describe("Color of the tag in hexadecimal format"),
    name: z.string().describe("Name of the tag"),
    orgId: z.string().uuid().optional().describe("ID of the organization"),
    projectId: z.string().uuid().optional().describe("ID of the project"),
  }),
  z.object({
    action: z.literal("update"),
    color: z.string().optional().describe("New color of the tag"),
    name: z.string().optional().describe("New name of the tag"),
    orgId: z.string().uuid().optional().describe("ID of the organization"),
    projectId: z.string().uuid().optional().describe("ID of the project"),
    tagId: z.string().uuid().describe("ID of the tag"),
  }),
  z.object({
    action: z.literal("delete"),
    orgId: z.string().uuid().optional().describe("ID of the organization"),
    projectId: z.string().uuid().optional().describe("ID of the project"),
    tagId: z.string().uuid().describe("ID of the tag"),
  }),
  z.object({
    action: z.literal("list"),
    orgId: z.string().uuid().optional().describe("ID of the organization"),
    projectId: z.string().uuid().optional().describe("ID of the project"),
  }),
]);

const createTagsTools = (user) => ({
  manage_tags: {
    description:
      "Manage tags for a project or organization (create, update, delete, list).",
    handler: async (args) => {
      try {
        const { action, orgId, projectId, tagId, name, color } = args;

        if (action === "create") {
          if (!name) throw new Error("name is required for create action.");
          const result = await tagsRepository.createTag({
            color,
            createdBy: user.userId,
            name,
            orgId: orgId || (projectId ? undefined : user.organizationId),
            projectId,
          });
          return {
            content: [{ text: JSON.stringify(result, null, 2), type: "text" }],
          };
        }

        if (action === "list") {
          const result = await tagsRepository.getTags({ orgId, projectId });
          return {
            content: [{ text: JSON.stringify(result, null, 2), type: "text" }],
          };
        }

        if (action === "update") {
          if (!tagId) throw new Error("tagId is required for update action.");
          const result = await tagsRepository.updateTag(tagId, {
            orgId,
            projectId,
            updates: { color, name },
          });
          if (!result) throw new Error("Tag not found or access denied.");
          return {
            content: [{ text: JSON.stringify(result, null, 2), type: "text" }],
          };
        }

        if (action === "delete") {
          if (!tagId) throw new Error("tagId is required for delete action.");
          const result = await tagsRepository.deleteTag(tagId, {
            deletedBy: user.userId,
            orgId,
            projectId,
          });
          if (!result) throw new Error("Tag not found or access denied.");
          return {
            content: [
              {
                text: JSON.stringify({ success: true }, null, 2),
                type: "text",
              },
            ],
          };
        }

        throw new Error(`Invalid action: ${action}`);
      } catch (error) {
        return {
          content: [
            { text: `Error managing tags: ${error.message}`, type: "text" },
          ],
          isError: true,
        };
      }
    },
    name: "manage_tags",
    schema: manageTagsSchema,
  },
});

module.exports = {
  createTagsTools,
};
