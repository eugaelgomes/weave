import { apiClient, handleResponse } from "../api-methods";

export interface Artifact {
  id: string;
  title: string;
  content: any[];
  type: string;
  sessionId: string;
  organizationId: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export const artifactsService = {
  getArtifactById: async (id: string): Promise<Artifact> => {
    const response = await apiClient.get(`/artifacts/${id}`);
    return await handleResponse<Artifact>(response);
  },

  updateArtifact: async (id: string, updates: { title?: string; content?: any[] }): Promise<Artifact> => {
    const response = await apiClient.patch(`/artifacts/${id}`, updates);
    return await handleResponse<Artifact>(response);
  },
};
