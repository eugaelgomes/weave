const artifactsService = require("../../services/artifacts/artifacts.service");
const BaseController = require("../base.controller");

class ArtifactsController extends BaseController {
  async createArtifact(req, res) {
    try {
      const userId = this._validateAuthentication(req);

      const workspaceId = this._extractWorkspaceId(req);

      const artifact = await artifactsService.createArtifact(userId, workspaceId, req.body);

      return res.status(201).json(artifact);
    } catch (error) {
      console.error("[ArtifactsController.createArtifact] Error:", error);
      return res.status(500).json({ message: "Failed to create artifact." });
    }
  }

  async getArtifact(req, res) {
    try {
      const userId = this._validateAuthentication(req);
      const { id } = req.params;

      const artifact = await artifactsService.getArtifact(id, userId);

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
      const userId = this._validateAuthentication(req);
      const { id } = req.params;

      const artifact = await artifactsService.updateArtifact(id, userId, req.body);

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
