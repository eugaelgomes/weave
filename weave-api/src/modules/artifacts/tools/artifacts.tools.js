const artifactsRepository = require("@/modules/artifacts/repositories/artifacts.repository");
const {
  getArtifactSchema,
  createArtifactSchema,
  updateArtifactSchema,
  listArtifactsSchema,
  deleteArtifactSchema,
} = require("../schemas/artifacts.schema");

/**
 * Creates the Artifacts tools registry bound to a specific user context.
 *
 * @param {Object} user - The authenticated user object.
 * @returns {Record<string, Object>} The artifacts tools definition map.
 */
const createArtifactsTools = (user) => ({
  create_artifact: {
    description: "Create a new artifact (e.g., document, code).",
    handler: async (args) => {
      try {
        const artifact = await artifactsRepository.createArtifact({
          ...args,
          userId: user.id,
        });
        return {
          content: [{ text: JSON.stringify(artifact, null, 2), type: "text" }],
        };
      } catch (error) {
        return {
          content: [
            { text: `Error creating artifact: ${error.message}`, type: "text" },
          ],
          isError: true,
        };
      }
    },
    name: "create_artifact",
    schema: createArtifactSchema,
  },
  delete_artifact: {
    description: "Delete an artifact.",
    handler: async (args) => {
      try {
        const result = await artifactsRepository.deleteArtifact(
          args.id,
          user.id
        );
        if (!result) {
          return {
            content: [
              { text: "Artifact not found or already deleted.", type: "text" },
            ],
            isError: true,
          };
        }
        return {
          content: [
            {
              text: JSON.stringify({ id: args.id, success: true }, null, 2),
              type: "text",
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            { text: `Error deleting artifact: ${error.message}`, type: "text" },
          ],
          isError: true,
        };
      }
    },
    name: "delete_artifact",
    schema: deleteArtifactSchema,
  },
  get_artifact: {
    description: "Retrieve an artifact by its ID.",
    handler: async (args) => {
      try {
        const artifact = await artifactsRepository.getArtifactById(
          args.id,
          user.id
        );
        if (!artifact) {
          return {
            content: [{ text: "Artifact not found.", type: "text" }],
            isError: true,
          };
        }
        return {
          content: [{ text: JSON.stringify(artifact, null, 2), type: "text" }],
        };
      } catch (error) {
        return {
          content: [
            {
              text: `Error retrieving artifact: ${error.message}`,
              type: "text",
            },
          ],
          isError: true,
        };
      }
    },
    name: "get_artifact",
    schema: getArtifactSchema,
  },
  list_artifacts: {
    description: "Lists artifacts for the authenticated user.",
    handler: async (params) => {
      try {
        const limit = params.limit ? parseInt(params.limit, 10) : 20;
        const offset = params.offset ? parseInt(params.offset, 10) : 0;
        const artifacts = await artifactsRepository.listArtifacts(
          user.id,
          limit,
          offset
        );
        return {
          content: [{ text: JSON.stringify(artifacts, null, 2), type: "text" }],
        };
      } catch (error) {
        return {
          content: [
            { text: `Error listing artifacts: ${error.message}`, type: "text" },
          ],
          isError: true,
        };
      }
    },
    name: "list_artifacts",
    schema: listArtifactsSchema,
  },
  update_artifact: {
    description: "Update an existing artifact.",
    handler: async (args) => {
      try {
        const { id, ...data } = args;
        const artifact = await artifactsRepository.updateArtifact(
          id,
          user.id,
          data
        );
        if (!artifact) {
          return {
            content: [{ text: "Artifact not found.", type: "text" }],
            isError: true,
          };
        }
        return {
          content: [{ text: JSON.stringify(artifact, null, 2), type: "text" }],
        };
      } catch (error) {
        return {
          content: [
            { text: `Error updating artifact: ${error.message}`, type: "text" },
          ],
          isError: true,
        };
      }
    },
    name: "update_artifact",
    schema: updateArtifactSchema,
  },
});

module.exports = {
  createArtifactsTools,
};
