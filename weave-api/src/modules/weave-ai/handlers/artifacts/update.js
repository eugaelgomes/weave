/**
 * @module weave-ai/handlers/update-artifact.handler
 * @description Handler for the update_artifact tool.
 * Actually updates an artifact in the database.
 */
const ArtifactsRepository = require("@/modules/artifacts/repositories/artifacts.repository");

class UpdateArtifactHandler {
  async execute({ args, name, userId }) {
    try {
      if (!args.artifactId) {
        throw new Error("artifactId is required");
      }

      const artifact = await ArtifactsRepository.updateArtifact(
        args.artifactId,
        userId,
        {
          content: args.blocks,
          title: args.title,
        }
      );

      if (!artifact) {
        return {
          error: "Artifact not found or you don't have permission.",
          name,
          success: false,
        };
      }

      return {
        name,
        result: {
          artifactId: artifact.id,
          message: "Artifact updated successfully.",
        },
        success: true,
      };
    } catch (error) {
      console.error("[UpdateArtifactHandler] Error:", error);
      return {
        error: "Failed to update artifact in the database.",
        name,
        success: false,
      };
    }
  }
}

module.exports = new UpdateArtifactHandler();
