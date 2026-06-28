/**
 * @module weave-ai/handlers/update-artifact.handler
 * @description Handler for the update_artifact tool.
 * Actually updates an artifact in the database.
 */
const ArtifactsRepository = require("../../artifacts/repositories/artifacts.repository");

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
          title: args.title,
          content: args.blocks,
        }
      );

      if (!artifact) {
        return {
          name,
          success: false,
          error: "Artifact not found or you don't have permission.",
        };
      }

      return {
        name,
        success: true,
        result: {
          message: "Artifact updated successfully.",
          artifactId: artifact.id,
        },
      };
    } catch (error) {
      console.error("[UpdateArtifactHandler] Error:", error);
      return {
        name,
        success: false,
        error: "Failed to update artifact in the database.",
      };
    }
  }
}

module.exports = new UpdateArtifactHandler();
