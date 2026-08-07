/**
 * @module artifacts/controllers/artifacts.controller
 * @description Handles HTTP requests for AI Artifacts.
 */
const ArtifactsRepository = require("../repositories/artifacts.repository");

class ArtifactsController {
  async createArtifact(req, res) {
    try {
      const { title, type, content, sessionId } = req.body;
      const userId = req.user.userId;
      const organizationId = req.headers["x-organization-id"] || null;

      const artifact = await ArtifactsRepository.createArtifact({
        content,
        organizationId,
        sessionId,
        title,
        type,
        userId,
      });

      return res.status(201).json(artifact);
    } catch (error) {
      console.error("[ArtifactsController.createArtifact] Error:", error);
      return res.status(500).json({ message: "Failed to create artifact." });
    }
  }

  async getArtifact(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;

      const artifact = await ArtifactsRepository.getArtifactById(id, userId);

      if (!artifact) {
        return res.status(404).json({ message: "Artifact not found." });
      }

      return res.status(200).json(artifact);
    } catch (error) {
      console.error("[ArtifactsController.getArtifact] Error:", error);
      return res.status(500).json({ message: "Failed to retrieve artifact." });
    }
  }

  async updateArtifact(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;
      const { title, content } = req.body;

      const artifact = await ArtifactsRepository.updateArtifact(id, userId, {
        content,
        title,
      });

      if (!artifact) {
        return res.status(404).json({ message: "Artifact not found." });
      }

      return res.status(200).json(artifact);
    } catch (error) {
      console.error("[ArtifactsController.updateArtifact] Error:", error);
      return res.status(500).json({ message: "Failed to update artifact." });
    }
  }
}

module.exports = new ArtifactsController();
