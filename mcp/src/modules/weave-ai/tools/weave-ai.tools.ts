import { McpToolDefinition } from "../../../types/mcp";
import { weaveApiClient } from "../../../services/weave-api.client";
import {
  chatSchema,
  getChatHistorySchema,
  deleteChatSessionSchema,
  createAgentSchema,
  updateAgentSchema,
  deleteAgentSchema,
  assignAgentToProjectSchema,
  unassignAgentFromProjectSchema,
  toggleAgentActiveSchema,
  duplicateAgentSchema,
  listAiModelsSchema,
  listAgentsSchema,
  getAgentSchema,
} from "../schemas/weave-ai.schema";
import { z } from "zod";

export const weaveAiTools: Record<string, McpToolDefinition<any>> = {
  list_ai_models: {
    name: "list_ai_models",
    description: "List available AI models",
    schema: listAiModelsSchema,
    handler: async () => {
      try {
        const response = await weaveApiClient.get("/weave-ai/models");
        return { content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }] };
      } catch (error: any) {
        return { isError: true, content: [{ type: "text", text: `Error: ${error.message}` }] };
      }
    },
  },
  chat_with_ai: {
    name: "chat_with_ai",
    description: "Send a message to the Weave AI",
    schema: chatSchema,
    handler: async (args: z.infer<typeof chatSchema>) => {
      try {
        const response = await weaveApiClient.post("/weave-ai/chat", args);
        return { content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }] };
      } catch (error: any) {
        return { isError: true, content: [{ type: "text", text: `Error: ${error.message}` }] };
      }
    },
  },
  get_chat_history: {
    name: "get_chat_history",
    description: "Get user chat history",
    schema: getChatHistorySchema,
    handler: async (args: z.infer<typeof getChatHistorySchema>) => {
      try {
        const response = await weaveApiClient.get("/weave-ai/chat/history", { params: args });
        return { content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }] };
      } catch (error: any) {
        return { isError: true, content: [{ type: "text", text: `Error: ${error.message}` }] };
      }
    },
  },
  delete_chat_session: {
    name: "delete_chat_session",
    description: "Delete a specific chat session",
    schema: deleteChatSessionSchema,
    handler: async (args: z.infer<typeof deleteChatSessionSchema>) => {
      try {
        const response = await weaveApiClient.delete(`/weave-ai/chat/${args.sessionId}`);
        return { content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }] };
      } catch (error: any) {
        return { isError: true, content: [{ type: "text", text: `Error: ${error.message}` }] };
      }
    },
  },
  list_agents: {
    name: "list_agents",
    description: "List available AI agents",
    schema: listAgentsSchema,
    handler: async () => {
      try {
        const response = await weaveApiClient.get("/weave-ai/agents");
        return { content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }] };
      } catch (error: any) {
        return { isError: true, content: [{ type: "text", text: `Error: ${error.message}` }] };
      }
    },
  },
  get_agent: {
    name: "get_agent",
    description: "Get details for a specific AI agent",
    schema: getAgentSchema,
    handler: async (args: z.infer<typeof getAgentSchema>) => {
      try {
        const response = await weaveApiClient.get(`/weave-ai/agents/${args.id}`);
        return { content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }] };
      } catch (error: any) {
        return { isError: true, content: [{ type: "text", text: `Error: ${error.message}` }] };
      }
    },
  },
  create_agent: {
    name: "create_agent",
    description: "Create a new AI agent",
    schema: createAgentSchema,
    handler: async (args: z.infer<typeof createAgentSchema>) => {
      try {
        const response = await weaveApiClient.post("/weave-ai/agents", args);
        return { content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }] };
      } catch (error: any) {
        return { isError: true, content: [{ type: "text", text: `Error: ${error.message}` }] };
      }
    },
  },
  update_agent: {
    name: "update_agent",
    description: "Update an existing AI agent",
    schema: updateAgentSchema,
    handler: async (args: z.infer<typeof updateAgentSchema>) => {
      try {
        const { id, ...payload } = args;
        const response = await weaveApiClient.put(`/weave-ai/agents/${id}`, payload);
        return { content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }] };
      } catch (error: any) {
        return { isError: true, content: [{ type: "text", text: `Error: ${error.message}` }] };
      }
    },
  },
  delete_agent: {
    name: "delete_agent",
    description: "Delete an AI agent",
    schema: deleteAgentSchema,
    handler: async (args: z.infer<typeof deleteAgentSchema>) => {
      try {
        const response = await weaveApiClient.delete(`/weave-ai/agents/${args.id}`);
        return { content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }] };
      } catch (error: any) {
        return { isError: true, content: [{ type: "text", text: `Error: ${error.message}` }] };
      }
    },
  },
  assign_agent_to_project: {
    name: "assign_agent_to_project",
    description: "Assign an agent to a project",
    schema: assignAgentToProjectSchema,
    handler: async (args: z.infer<typeof assignAgentToProjectSchema>) => {
      try {
        const { id, projectId } = args;
        const response = await weaveApiClient.put(`/weave-ai/agents/${id}/project`, { projectId });
        return { content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }] };
      } catch (error: any) {
        return { isError: true, content: [{ type: "text", text: `Error: ${error.message}` }] };
      }
    },
  },
  unassign_agent_from_project: {
    name: "unassign_agent_from_project",
    description: "Remove an agent from a project",
    schema: unassignAgentFromProjectSchema,
    handler: async (args: z.infer<typeof unassignAgentFromProjectSchema>) => {
      try {
        const response = await weaveApiClient.delete(`/weave-ai/agents/${args.id}/project`);
        return { content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }] };
      } catch (error: any) {
        return { isError: true, content: [{ type: "text", text: `Error: ${error.message}` }] };
      }
    },
  },
  toggle_agent_active: {
    name: "toggle_agent_active",
    description: "Activate or deactivate an agent",
    schema: toggleAgentActiveSchema,
    handler: async (args: z.infer<typeof toggleAgentActiveSchema>) => {
      try {
        const { id, isActive } = args;
        const response = await weaveApiClient.patch(`/weave-ai/agents/${id}/active`, { isActive });
        return { content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }] };
      } catch (error: any) {
        return { isError: true, content: [{ type: "text", text: `Error: ${error.message}` }] };
      }
    },
  },
  duplicate_agent: {
    name: "duplicate_agent",
    description: "Duplicate an existing agent",
    schema: duplicateAgentSchema,
    handler: async (args: z.infer<typeof duplicateAgentSchema>) => {
      try {
        const response = await weaveApiClient.post(`/weave-ai/agents/${args.id}/duplicate`);
        return { content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }] };
      } catch (error: any) {
        return { isError: true, content: [{ type: "text", text: `Error: ${error.message}` }] };
      }
    },
  },
};
