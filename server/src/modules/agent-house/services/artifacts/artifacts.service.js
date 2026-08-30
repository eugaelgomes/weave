const ArtifactsRepository = require("../../repositories/artifacts/artifacts.repository");

class ArtifactsService {
  async createArtifact(userId, workspaceId, data) {
    const { title, type, content, sessionId } = data;
    return await ArtifactsRepository.createArtifact({
      content,
      sessionId,
      title,
      type,
      userId,
      workspaceId,
    });
  }

  async getArtifact(id, userId) {
    return await ArtifactsRepository.getArtifactById(id, userId);
  }

  async updateArtifact(id, userId, data) {
    const { title, content } = data;
    return await ArtifactsRepository.updateArtifact(id, userId, {
      content,
      title,
    });
  }
}

module.exports = new ArtifactsService();
