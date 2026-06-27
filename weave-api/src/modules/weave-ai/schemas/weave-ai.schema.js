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

module.exports = {
  createUserAgentSchema,
  updateAgentSchema,
  shareAgentSchema,
  assignToProjectSchema,
  toggleActiveSchema,
};
