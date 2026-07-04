import { z } from "zod";

export const chatSchema = z.object({
  message: z.string(),
  sessionId: z.string().optional(),
  agentId: z.string().optional(),
  model: z.string().optional(),
});

export const getChatHistorySchema = z.object({
  page: z.number().optional(),
  limit: z.number().optional(),
});

export const deleteChatSessionSchema = z.object({
  sessionId: z.string(),
});

export const createAgentSchema = z.object({
  name: z.string(),
  systemPrompt: z.string(),
  model: z.string().optional(),
  projectId: z.string().uuid().optional(),
});

export const updateAgentSchema = z.object({
  id: z.string().uuid(),
  name: z.string().optional(),
  systemPrompt: z.string().optional(),
  model: z.string().optional(),
});

export const deleteAgentSchema = z.object({
  id: z.string().uuid(),
});

export const assignAgentToProjectSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
});

export const unassignAgentFromProjectSchema = z.object({
  id: z.string().uuid(),
});

export const toggleAgentActiveSchema = z.object({
  id: z.string().uuid(),
  isActive: z.boolean(),
});

export const duplicateAgentSchema = z.object({
  id: z.string().uuid(),
});

export const listAiModelsSchema = z.object({});
export const listAgentsSchema = z.object({});
export const getAgentSchema = z.object({
  id: z.string().uuid(),
});
