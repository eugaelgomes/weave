const { z } = require("zod");

const getSprintsSchema = z.object({
  end_from: z
    .string()
    .optional()
    .describe("Filter sprints ending after this date"),
  end_to: z
    .string()
    .optional()
    .describe("Filter sprints ending before this date"),
  limit: z
    .union([z.string(), z.number()])
    .optional()
    .describe("Maximum number of sprints to return"),
  page: z
    .union([z.string(), z.number()])
    .optional()
    .describe("Page number for pagination"),
  sort: z
    .string()
    .max(64)
    .optional()
    .describe("Sorting criteria such as 'created_at' or '-created_at'"),
  start_from: z
    .string()
    .optional()
    .describe("Filter sprints starting after this date"),
  start_to: z
    .string()
    .optional()
    .describe("Filter sprints starting before this date"),
  status: z
    .string()
    .max(120)
    .optional()
    .describe("Status of the sprint such as 'active' or 'completed'"),
});

const getReasoningsSchema = z.object({
  created_by: z
    .string()
    .uuid()
    .optional()
    .describe("Filter reasonings created by this user ID"),
  from: z
    .string()
    .datetime()
    .optional()
    .describe("Filter reasonings created after this date/time"),
  is_dismissed: z
    .enum(["true", "false"])
    .optional()
    .describe("Filter by dismissed status"),
  is_pinned: z
    .enum(["true", "false"])
    .optional()
    .describe("Filter by pinned status"),
  is_read: z
    .enum(["true", "false"])
    .optional()
    .describe("Filter by read status"),
  limit: z
    .union([z.string(), z.number()])
    .optional()
    .describe("Maximum number of reasonings to return"),
  page: z
    .union([z.string(), z.number()])
    .optional()
    .describe("Page number for pagination"),
  reasoningType: z
    .string()
    .max(64)
    .optional()
    .describe("Type of reasoning such as 'insight' or 'decision'"),
  sort: z.string().max(64).optional().describe("Sorting criteria"),
  sprintId: z
    .string()
    .uuid()
    .optional()
    .describe("Filter reasonings associated with this sprint ID"),
  to: z
    .string()
    .datetime()
    .optional()
    .describe("Filter reasonings created before this date/time"),
});

const engineContextParamSchema = z.object({
  projectId: z
    .string()
    .uuid("projectId must be a valid UUID")
    .optional()
    .describe("ID of the project for context"),
});

const reasoningParamsSchema = z.object({
  projectId: z
    .string()
    .uuid("projectId must be a valid UUID")
    .optional()
    .describe("ID of the project"),
  reasoningId: z
    .string()
    .uuid("reasoningId must be a valid UUID")
    .describe("ID of the specific reasoning"),
});

const createReasoningSchema = z.object({
  content: z
    .object({
      actionItems: z
        .array(
          z.object({
            assignedTo: z
              .string()
              .uuid()
              .optional()
              .describe("User ID assigned to the action item"),
            content: z.string().describe("Content of the action item"),
            priority: z
              .number()
              .optional()
              .describe("Priority of the action item"),
          })
        )
        .optional()
        .describe("Action items generated from the reasoning"),
      inputContext: z
        .any()
        .optional()
        .describe("Context input for the reasoning"),
      inputPrompt: z
        .string()
        .optional()
        .describe("Prompt used for the reasoning"),
      inputSystemMessage: z
        .string()
        .optional()
        .describe("System message used for the reasoning"),
      outputMarkdown: z
        .string()
        .optional()
        .describe("Markdown content of the reasoning"),
      outputMetadata: z.any().optional().describe("Metadata for the output"),
      outputRaw: z.any().optional().describe("Raw output data"),
    })
    .describe("Content of the reasoning"),
  options: z
    .object({
      errorMessage: z
        .string()
        .optional()
        .describe("Error message if reasoning failed"),
      modelUsed: z
        .string()
        .optional()
        .describe("Model used for the reasoning such as 'gpt-4'"),
      processingTimeMs: z
        .number()
        .optional()
        .describe("Processing time in milliseconds"),
      providerUsed: z
        .string()
        .optional()
        .describe("Provider used for the reasoning such as 'openai'"),
      recipientScope: z
        .string()
        .optional()
        .describe("Recipient scope such as 'all_members' or 'owner_only'"),
      safetyBlocked: z
        .boolean()
        .optional()
        .describe("Whether the reasoning is blocked for safety reasons"),
      safetyLabel: z
        .string()
        .optional()
        .describe("Safety label such as 'safe'"),
      safetyReason: z.string().optional().describe("Reason for safety label"),
      status: z.string().optional().describe("Status of the reasoning"),
    })
    .optional()
    .describe("Optional metadata for the reasoning"),
  projectId: z
    .string()
    .uuid("projectId must be a valid UUID")
    .describe("ID of the project"),
  reasoningType: z
    .string()
    .max(64)
    .describe("Type of reasoning such as 'insight' or 'decision'"),
  sprintId: z
    .string()
    .uuid("sprintId must be a valid UUID")
    .optional()
    .describe("ID of the sprint"),
  title: z.string().max(255).optional().describe("Title of the reasoning"),
});

module.exports = {
  createReasoningSchema,
  engineContextParamSchema,
  getReasoningsSchema,
  getSprintsSchema,
  reasoningParamsSchema,
};
