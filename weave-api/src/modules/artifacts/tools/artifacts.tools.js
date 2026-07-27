const { z } = require("zod");
const artifactsRepository = require("@/modules/artifacts/repositories/artifacts.repository");

const manageArtifactsSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create"),
    content: z.string().describe("Content of the artifact"),
    title: z.string().describe("Title of the artifact"),
    type: z.string().describe("Type of artifact"),
  }),
  z.object({
    action: z.literal("get"),
    id: z.string().uuid().describe("ID of the artifact"),
  }),
  z.object({
    action: z.literal("update"),
    content: z.string().optional().describe("Content of the artifact"),
    id: z.string().uuid().describe("ID of the artifact"),
    title: z.string().optional().describe("Title of the artifact"),
    type: z.string().optional().describe("Type of artifact"),
  }),
  z.object({
    action: z.literal("delete"),
    id: z.string().uuid().describe("ID of the artifact"),
  }),
  z.object({
    action: z.literal("list"),
    limit: z.number().optional().describe("Limit for listing artifacts"),
    offset: z.number().optional().describe("Offset for listing artifacts"),
  }),
]);

const createArtifactsTools = (user) => ({
  manage_artifacts: {
    description: "Manage artifacts (create, get, update, delete, list).",
    handler: async (args) => {
      try {
        const { action, id, title, content, type, limit, offset } = args;

        if (action === "create") {
          const artifact = await artifactsRepository.createArtifact({
            content,
            title,
            type,
            userId: user.id,
          });
          return {
            content: [
              { text: JSON.stringify(artifact, null, 2), type: "text" },
            ],
          };
        }

        if (action === "get") {
          if (!id) throw new Error("id is required for get action.");
          const artifact = await artifactsRepository.getArtifactById(
            id,
            user.id
          );
          if (!artifact) throw new Error("Artifact not found.");
          return {
            content: [
              { text: JSON.stringify(artifact, null, 2), type: "text" },
            ],
          };
        }

        if (action === "update") {
          if (!id) throw new Error("id is required for update action.");
          const artifact = await artifactsRepository.updateArtifact(
            id,
            user.id,
            { content, title, type }
          );
          if (!artifact) throw new Error("Artifact not found.");
          return {
            content: [
              { text: JSON.stringify(artifact, null, 2), type: "text" },
            ],
          };
        }

        if (action === "delete") {
          if (!id) throw new Error("id is required for delete action.");
          const result = await artifactsRepository.deleteArtifact(id, user.id);
          if (!result)
            throw new Error("Artifact not found or already deleted.");
          return {
            content: [
              {
                text: JSON.stringify({ id, success: true }, null, 2),
                type: "text",
              },
            ],
          };
        }

        if (action === "list") {
          const parsedLimit = limit || 20;
          const parsedOffset = offset || 0;
          const artifacts = await artifactsRepository.listArtifacts(
            user.id,
            parsedLimit,
            parsedOffset
          );
          return {
            content: [
              { text: JSON.stringify(artifacts, null, 2), type: "text" },
            ],
          };
        }

        throw new Error(`Invalid action: ${action}`);
      } catch (error) {
        return {
          content: [
            {
              text: `Error managing artifacts: ${error.message}`,
              type: "text",
            },
          ],
          isError: true,
        };
      }
    },
    name: "manage_artifacts",
    schema: manageArtifactsSchema,
  },
});

module.exports = {
  createArtifactsTools,
};
