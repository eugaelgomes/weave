const { z } = require("zod");

const createUserAgentSchema = z.object({
  name: z.string().min(1, "Agent name is required"),
  model_provider: z.string().min(1, "Model provider is required"),
  model_name: z.string().min(1, "Model name is required"),
  description: z.string().optional(),
  instructions: z.string().optional(),
  role: z.string().optional(),
  tone: z.string().optional(),
  language: z.string().optional(),
  avatar_url: z.string().url("Invalid avatar URL").optional(),
  tags: z.union([z.string(), z.array(z.string())]).optional(),
  tools: z.union([z.string(), z.array(z.string())]).optional(),
  rules: z.union([z.string(), z.array(z.string())]).optional(),
  project_id: z.string().uuid("Invalid project ID").optional(),
});

const updateAgentSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  instructions: z.string().optional(),
  role: z.string().optional(),
  tone: z.string().optional(),
  language: z.string().optional(),
  avatar_url: z.string().url("Invalid avatar URL").optional(),
  tags: z.union([z.string(), z.array(z.string())]).optional(),
  model_provider: z.string().optional(),
  model_name: z.string().optional(),
  tools: z.union([z.string(), z.array(z.string())]).optional(),
  rules: z.union([z.string(), z.array(z.string())]).optional(),
  project_id: z.string().uuid("Invalid project ID").nullable().optional(),
  is_active: z.boolean().optional(),
});

const shareAgentSchema = z.object({
  sharedWith: z
    .array(z.string().uuid("Invalid user ID"))
    .min(1, "sharedWith must be an array of user IDs"),
});

const assignToProjectSchema = z.object({
  projectId: z.string().uuid("Invalid project ID"),
});

const toggleActiveSchema = z.object({
  isActive: z.boolean({ required_error: "isActive must be a boolean" }),
});

const chatPayloadSchema = z.object({
  message: z.string().min(1, "Message is required"),
  model: z.preprocess((val) => {
    if (typeof val === "string") {
      try { return JSON.parse(val); } catch { return val; }
    }
    return val;
  }, z.object({
    name: z.string().min(1),
    version: z.string().min(1)
  })),
  allowEdit: z.preprocess((val) => {
    if (val === "true") return true;
    if (val === "false") return false;
    if (val === undefined || val === null) return true;
    return val;
  }, z.boolean()),
  allowWebSearch: z.preprocess((val) => {
    if (val === "true") return true;
    if (val === "false") return false;
    if (val === undefined || val === null) return false;
    return val;
  }, z.boolean()),
  noteIds: z.preprocess((val) => {
    if (val === "null" || val === "") return null;
    if (typeof val === "string") {
      try { return JSON.parse(val); } catch { return val; }
    }
    return val;
  }, z.array(z.string()).nullable().optional()),
  projectIds: z.preprocess((val) => {
    if (val === "null" || val === "") return null;
    if (typeof val === "string") {
      try { return JSON.parse(val); } catch { return val; }
    }
    return val;
  }, z.array(z.string()).nullable().optional()),
  agentId: z.string().nullable().optional().transform(v => v === "null" || v === "" ? null : v),
  sessionId: z.string().nullable().optional().transform(v => v === "null" || v === "" ? null : v),
  requestId: z.string().uuid("Invalid requestId").nullable().optional().transform(v => v === "null" || v === "" ? null : v),
  useCase: z.string().nullable().optional().transform(v => v === "null" || v === "" ? null : v),
  context: z.preprocess((val) => {
    if (val === "null" || val === "") return null;
    if (typeof val === "string") {
      try { return JSON.parse(val); } catch { return val; }
    }
    return val;
  }, z.record(z.any()).nullable().optional()),
});

const submitFeedbackSchema = z.object({
  rating: z.enum(["like", "dislike"]).nullable(),
  comment: z.string().nullable().optional(),
});

const getChatHistorySchema = z.object({
  limit: z.coerce.number().min(1).max(100).optional().default(50),
  offset: z.coerce.number().min(0).optional().default(0),
  sessionId: z.string().uuid("Invalid session ID").optional(),
});

module.exports = {
  createUserAgentSchema,
  updateAgentSchema,
  shareAgentSchema,
  assignToProjectSchema,
  toggleActiveSchema,
  chatPayloadSchema,
  submitFeedbackSchema,
  getChatHistorySchema,
};
