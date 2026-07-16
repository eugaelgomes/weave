/**
 * @module weave-ai/handlers/create-artifact.handler
 * @description Handler for the create_artifact tool.
 * Actually creates an artifact in the database.
 */
const ArtifactsRepository = require("@/modules/artifacts/repositories/artifacts.repository");

class CreateArtifactHandler {
  async execute({ args, name, userId, organizationId }) {
    try {
      const artifact = await ArtifactsRepository.createArtifact({
        content: args.blocks || [],
        organizationId,
        title: args.title || "Untitled Document",
        type: args.type || "document",
        userId,
      });

      return {
        name,
        result: {
          artifactId: artifact.id,
          message: "Artifact created successfully.",
          title: artifact.title,
        },
        success: true,
      };
    } catch (error) {
      console.error("[CreateArtifactHandler] Error:", error);
      return {
        error: "Failed to create artifact in the database.",
        name,
        success: false,
      };
    }
  }
}

module.exports = new CreateArtifactHandler();
