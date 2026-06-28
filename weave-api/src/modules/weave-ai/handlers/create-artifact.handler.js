/**
 * @module weave-ai/handlers/create-artifact.handler
 * @description Handler for the create_artifact tool. 
 * Actually creates an artifact in the database.
 */
const ArtifactsRepository = require("../../artifacts/repositories/artifacts.repository");

class CreateArtifactHandler {
  async execute({ args, name, userId, organizationId }) {
    try {
      const artifact = await ArtifactsRepository.createArtifact({
        userId,
        organizationId,
        title: args.title || "Untitled Document",
        type: args.type || "document",
        content: args.blocks || [],
      });

      return {
        name,
        success: true,
        result: {
          message: "Artifact created successfully.",
          artifactId: artifact.id,
          title: artifact.title,
        },
      };
    } catch (error) {
      console.error("[CreateArtifactHandler] Error:", error);
      return {
        name,
        success: false,
        error: "Failed to create artifact in the database.",
      };
    }
  }
}

module.exports = new CreateArtifactHandler();
