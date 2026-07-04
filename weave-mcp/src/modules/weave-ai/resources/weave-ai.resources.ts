import { McpResourceDefinition } from "../../../types/mcp";
import { weaveApiClient } from "../../../services/weave-api.client";

export const weaveAiResources: McpResourceDefinition = {
  templates: [
    {
      uriTemplate: "weave://ai/agents",
      name: "Active AI Agents",
      description: "List of active AI agents",
      mimeType: "application/json",
    },
    {
      uriTemplate: "weave://ai/models",
      name: "Available LLM Models",
      description: "List of available LLM providers",
      mimeType: "application/json",
    },
  ],
  readHandler: async (uri: string) => {
    if (uri === "weave://ai/agents") {
      const response = await weaveApiClient.get("/weave-ai/agents");
      return {
        contents: [{ uri, mimeType: "application/json", text: JSON.stringify(response.data, null, 2) }],
      };
    }
    if (uri === "weave://ai/models") {
      const response = await weaveApiClient.get("/weave-ai/models");
      return {
        contents: [{ uri, mimeType: "application/json", text: JSON.stringify(response.data, null, 2) }],
      };
    }
    return null;
  }
};
