import { z } from "zod";

export const LlmModelSchema = z.object({
  id: z.string(),
  name: z.string(),
  version: z.string(),
  description: z.string().optional(),
  contextWindow: z.number().nullable().optional(),
  maxOutputTokens: z.number().nullable().optional(),
  features: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  deprecated: z.boolean().optional(),
  supportedForAgents: z.boolean().optional(),
});

export const RawModelsResponseSchema = z
  .object({
    providers: z
      .array(
        z.object({
          id: z.string().optional(),
          name: z.string(),
          logoUrl: z.string().nullable().optional(),
          isDefault: z.boolean().optional(),
          models: z.array(LlmModelSchema).optional(),
        })
      )
      .optional(),
  })
  .passthrough();

const assistantPayloadSchema = z
  .object({
    role: z.literal("assistant"),
    content: z.string().nullable().optional(),
    citations: z.array(z.unknown()).optional(),
    functions: z
      .array(
        z.object({
          name: z.string(),
          arguments: z.record(z.string(), z.unknown()).optional(),
        })
      )
      .optional(),
    functionExecution: z
      .array(
        z.object({
          name: z.string(),
          success: z.boolean(),
          result: z.unknown().optional(),
        })
      )
      .optional(),
    model: z
      .object({
        name: z.string(),
        version: z.string().nullable().optional(),
      })
      .nullable()
      .optional(),
    provider: z.string().nullable().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();

export const ChatPostResultSchema = z.object({
  sessionId: z.string(),
  response: assistantPayloadSchema,
});

export const RawChatMessageSchema = z.object({
  id: z.union([z.string(), z.number()]),
  role: z.enum(["user", "assistant", "tool", "system"]),
  content: z.string().nullable().optional(),
  created_at: z.string().optional(),
  model: z.string().optional(),
  session_id: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const RawChatSessionSchema = z.object({
  id: z.string(),
  title: z.string(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
  message_count: z.union([z.string(), z.number()]).optional(),
});

export const ChatHistoryMessagesSchema = z.object({
  messages: z.array(RawChatMessageSchema),
});

export const ChatHistorySessionsSchema = z.object({
  sessions: z.array(RawChatSessionSchema),
});

export const KnowledgeFileSchema = z.object({
  original_name: z.string(),
  url: z.string(),
  mime_type: z.string(),
  size: z.number(),
  uploaded_at: z.string(),
});

export const AgentSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    instructions: z.string(),
    role: z.string().optional(),
    tone: z.string().optional(),
    language: z.string().optional(),
    avatar_url: z.string().optional(),
    tags: z.array(z.string()).optional(),
    tools: z.array(z.string()).optional(),
    model_provider: z.string(),
    model_name: z.string(),
    knowledge_files: z.array(KnowledgeFileSchema).optional(),
    is_public: z.boolean(),
    user_id: z.string().optional(),
    project_id: z.string().nullable().optional(),
    is_active: z.boolean().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
  })
  .passthrough();

export const AgentEnvelopeSchema = z.object({
  agent: AgentSchema,
});

export const AgentsListSchema = z.object({
  agents: z.array(AgentSchema),
});

export const AgentProviderSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  isDefault: z.boolean().optional(),
  logoUrl: z.string().nullable().optional(),
  models: z.array(LlmModelSchema),
});

export const AgentProvidersResponseSchema = z.object({
  providers: z.array(AgentProviderSchema),
});
