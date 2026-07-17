const { z } = require("zod");
const tagsRepository = require("@/modules/tags/repositories/tags.repository");

const listTagsSchema = z.object({
  orgId: z.string().uuid().optional().describe("ID of the organization"),
  projectId: z.string().uuid().optional().describe("ID of the project"),
});

const createTagSchema = z.object({
  color: z
    .string()
    .optional()
    .describe("Color of the tag in hexadecimal format"),
  name: z.string().describe("Name of the tag"),
  orgId: z.string().uuid().optional().describe("ID of the organization"),
  projectId: z.string().uuid().optional().describe("ID of the project"),
});

const updateTagSchema = z.object({
  color: z
    .string()
    .optional()
    .describe("New color of the tag in hexadecimal format"),
  name: z.string().optional().describe("New name of the tag"),
  orgId: z.string().uuid().optional().describe("ID of the organization"),
  projectId: z.string().uuid().optional().describe("ID of the project"),
  tagId: z.string().uuid().describe("ID of the tag to update"),
});

const deleteTagSchema = z.object({
  orgId: z.string().uuid().optional().describe("ID of the organization"),
  projectId: z.string().uuid().optional().describe("ID of the project"),
  tagId: z.string().uuid().describe("ID of the tag to delete"),
});

/**
 * Creates the Tags tools registry bound to a specific user context.
 *
 * @param {Object} user - The authenticated user object.
 * @returns {Record<string, Object>} The tags tools definition map.
 */
const createTagsTools = (user) => ({
  create_tag: {
    description: "Creates a new tag for a project or organization",
    handler: async (args) => {
      try {
        const { projectId, orgId, name, color } = args;
        const result = await tagsRepository.createTag({
          color,
          createdBy: user.userId,
          name,
          orgId,
          projectId,
        });
        return {
          content: [{ text: JSON.stringify(result, null, 2), type: "text" }],
        };
      } catch (error) {
        return {
          content: [{ text: `Error: ${error.message}`, type: "text" }],
          isError: true,
        };
      }
    },
    name: "create_tag",
    schema: createTagSchema,
  },
  delete_tag: {
    description: "Deletes a tag from a project or organization",
    handler: async (args) => {
      try {
        const { tagId, projectId, orgId } = args;
        const result = await tagsRepository.deleteTag(tagId, {
          deletedBy: user.userId,
          orgId,
          projectId,
        });
        if (!result) {
          return {
            content: [
              { text: "Tag not found or access denied.", type: "text" },
            ],
            isError: true,
          };
        }
        return {
          content: [
            { text: JSON.stringify({ success: true }, null, 2), type: "text" },
          ],
        };
      } catch (error) {
        return {
          content: [{ text: `Error: ${error.message}`, type: "text" }],
          isError: true,
        };
      }
    },
    name: "delete_tag",
    schema: deleteTagSchema,
  },
  list_tags: {
    description: "Lists all tags for a project or organization",
    handler: async (args) => {
      try {
        const { projectId, orgId } = args;
        const result = await tagsRepository.getTags({ orgId, projectId });
        return {
          content: [{ text: JSON.stringify(result, null, 2), type: "text" }],
        };
      } catch (error) {
        return {
          content: [{ text: `Error: ${error.message}`, type: "text" }],
          isError: true,
        };
      }
    },
    name: "list_tags",
    schema: listTagsSchema,
  },
  update_tag: {
    description: "Updates an existing tag's name or color",
    handler: async (args) => {
      try {
        const { tagId, projectId, orgId, name, color } = args;
        const result = await tagsRepository.updateTag(tagId, {
          orgId,
          projectId,
          updates: { color, name },
        });
        if (!result) {
          return {
            content: [
              { text: "Tag not found or access denied.", type: "text" },
            ],
            isError: true,
          };
        }
        return {
          content: [{ text: JSON.stringify(result, null, 2), type: "text" }],
        };
      } catch (error) {
        return {
          content: [{ text: `Error: ${error.message}`, type: "text" }],
          isError: true,
        };
      }
    },
    name: "update_tag",
    schema: updateTagSchema,
  },
});

module.exports = {
  createTagsTools,
};
