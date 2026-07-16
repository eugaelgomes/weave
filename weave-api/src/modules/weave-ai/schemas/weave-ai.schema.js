const { z } = require("zod");

const createUserAgentSchema = z.object({
  avatar_url: z.string().url("Invalid avatar URL").optional(),
  description: z.string().optional(),
  instructions: z.string().optional(),
  language: z.string().optional(),
  model_name: z.string().min(1, "Model name is required"),
  model_provider: z.string().min(1, "Model provider is required"),
  name: z.string().min(1, "Agent name is required"),
  project_id: z.string().uuid("Invalid project ID").optional(),
  role: z.string().optional(),
  rules: z.union([z.string(), z.array(z.string())]).optional(),
  tags: z.union([z.string(), z.array(z.string())]).optional(),
  tone: z.string().optional(),
  tools: z.union([z.string(), z.array(z.string())]).optional(),
});

const updateAgentSchema = z.object({
  avatar_url: z.string().url("Invalid avatar URL").optional(),
  description: z.string().optional(),
  instructions: z.string().optional(),
  is_active: z.boolean().optional(),
  language: z.string().optional(),
  model_name: z.string().optional(),
  model_provider: z.string().optional(),
  name: z.string().optional(),
  project_id: z.string().uuid("Invalid project ID").nullable().optional(),
  role: z.string().optional(),
  rules: z.union([z.string(), z.array(z.string())]).optional(),
  tags: z.union([z.string(), z.array(z.string())]).optional(),
  tone: z.string().optional(),
  tools: z.union([z.string(), z.array(z.string())]).optional(),
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
  agentId: z
    .string()
    .nullable()
    .optional()
    .transform((v) => (v === "null" || v === "" ? null : v)),
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
  context: z.preprocess((val) => {
    if (val === "null" || val === "") return null;
    if (typeof val === "string") {
      try {
        return JSON.parse(val);
      } catch {
        return val;
      }
    }
    return val;
  }, z.record(z.any()).nullable().optional()),
  message: z.string().min(1, "Message is required"),
  model: z.preprocess(
    (val) => {
      if (typeof val === "string") {
        try {
          return JSON.parse(val);
        } catch {
          return val;
        }
      }
      return val;
    },
    z.object({
      name: z.string().min(1),
      version: z.string().min(1),
    })
  ),
  noteIds: z.preprocess((val) => {
    if (val === "null" || val === "") return null;
    if (typeof val === "string") {
      try {
        return JSON.parse(val);
      } catch {
        return val;
      }
    }
    return val;
  }, z.array(z.string()).nullable().optional()),
  projectIds: z.preprocess((val) => {
    if (val === "null" || val === "") return null;
    if (typeof val === "string") {
      try {
        return JSON.parse(val);
      } catch {
        return val;
      }
    }
    return val;
  }, z.array(z.string()).nullable().optional()),
  requestId: z
    .string()
    .uuid("Invalid requestId")
    .nullable()
    .optional()
    .transform((v) => (v === "null" || v === "" ? null : v)),
  sessionId: z
    .string()
    .nullable()
    .optional()
    .transform((v) => (v === "null" || v === "" ? null : v)),
  useCase: z
    .string()
    .nullable()
    .optional()
    .transform((v) => (v === "null" || v === "" ? null : v)),
});

const submitFeedbackSchema = z.object({
  comment: z.string().nullable().optional(),
  rating: z.enum(["like", "dislike"]).nullable(),
});

const getChatHistorySchema = z.object({
  limit: z.coerce.number().min(1).max(100).optional().default(50),
  offset: z.coerce.number().min(0).optional().default(0),
  sessionId: z.string().uuid("Invalid session ID").optional(),
});

module.exports = {
  assignToProjectSchema,
  chatPayloadSchema,
  createUserAgentSchema,
  getChatHistorySchema,
  shareAgentSchema,
  submitFeedbackSchema,
  toggleActiveSchema,
  updateAgentSchema,
};
