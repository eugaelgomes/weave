const { z } = require("zod");

const listUserAgentsSchema = z
  .object({
    project_id: z
      .string()
      .uuid("Invalid project ID")
      .optional()
      .describe(
        "The unique identifier of the project to filter the AI agents. This must be a valid UUID. If omitted, the list will include agents across all projects."
      ),
  })
  .describe(
    "Schema configuration for listing AI agents available to the user."
  );

const createUserAgentSchema = z
  .object({
    avatar_url: z
      .string()
      .url("Invalid avatar URL")
      .optional()
      .describe(
        "The URL of the avatar image representing the AI agent. Must be a valid absolute URL format."
      ),
    description: z
      .string()
      .optional()
      .describe(
        "A detailed description of the AI agent's purpose, capabilities, and role within the application."
      ),
    instructions: z
      .string()
      .optional()
      .describe(
        "Specific, detailed instructions defining how the agent should behave, respond to queries, and handle tasks."
      ),
    language: z
      .string()
      .optional()
      .describe(
        "The default language the AI agent will use to communicate, such as English, Portuguese, or Spanish."
      ),
    model_name: z
      .string()
      .min(1, "Model name is required")
      .describe(
        "The name of the underlying AI model, such as gpt-4o, claude-3-5-sonnet, or gemini-1.5-pro, that powers this agent."
      ),
    model_provider: z
      .string()
      .min(1, "Model provider is required")
      .describe(
        "The provider of the AI model, such as OpenAI, Anthropic, or Google."
      ),
    name: z
      .string()
      .min(1, "Agent name is required")
      .describe("The human-readable name of the custom AI agent."),
    project_id: z
      .string()
      .uuid("Invalid project ID")
      .optional()
      .describe(
        "The unique identifier of the project to which this agent is assigned. Must be a valid UUID."
      ),
    role: z
      .string()
      .optional()
      .describe(
        "The defined role or persona of the AI agent, such as code reviewer, content writer, or project manager."
      ),
    rules: z
      .union([z.string(), z.array(z.string())])
      .optional()
      .describe(
        "Specific guidelines or constraints that the agent must strictly follow during interactions. Can be a single string or an array of strings."
      ),
    tags: z
      .union([z.string(), z.array(z.string())])
      .optional()
      .describe(
        "Metadata tags used to organize, filter, and search for the AI agent. Can be a single string or an array of strings."
      ),
    tone: z
      .string()
      .optional()
      .describe(
        "The tone of voice the AI agent should use in its responses, such as professional, friendly, empathetic, or concise."
      ),
    tools: z
      .union([z.string(), z.array(z.string())])
      .optional()
      .describe(
        "A list of tools or function names that this AI agent is allowed to invoke. Can be a single string or an array of strings."
      ),
  })
  .describe("Schema configuration for creating a new custom AI agent.");

const updateAgentSchema = z
  .object({
    avatar_url: z
      .string()
      .url("Invalid avatar URL")
      .optional()
      .describe(
        "The updated URL of the avatar image representing the AI agent. Must be a valid URL format."
      ),
    description: z
      .string()
      .optional()
      .describe(
        "The updated detailed description of the AI agent's purpose, capabilities, and role."
      ),
    instructions: z
      .string()
      .optional()
      .describe(
        "The updated instructions defining how the agent should behave and handle tasks."
      ),
    is_active: z
      .boolean()
      .optional()
      .describe(
        "A boolean flag indicating whether the agent is active and available for use or disabled."
      ),
    language: z
      .string()
      .optional()
      .describe(
        "The updated default language the AI agent will use to communicate."
      ),
    model_name: z
      .string()
      .optional()
      .describe("The updated name of the AI model that powers this agent."),
    model_provider: z
      .string()
      .optional()
      .describe("The updated provider of the AI model."),
    name: z
      .string()
      .optional()
      .describe("The updated human-readable name of the custom AI agent."),
    project_id: z
      .string()
      .uuid("Invalid project ID")
      .nullable()
      .optional()
      .describe(
        "The updated unique identifier of the project to which this agent is assigned. Can be set to null to unassign the agent from any project."
      ),
    role: z
      .string()
      .optional()
      .describe("The updated defined role or persona of the AI agent."),
    rules: z
      .union([z.string(), z.array(z.string())])
      .optional()
      .describe(
        "The updated guidelines or constraints that the agent must strictly follow. Can be a single string or an array of strings."
      ),
    tags: z
      .union([z.string(), z.array(z.string())])
      .optional()
      .describe(
        "The updated metadata tags for the AI agent. Can be a single string or an array of strings."
      ),
    tone: z
      .string()
      .optional()
      .describe(
        "The updated tone of voice the AI agent should use in its responses."
      ),
    tools: z
      .union([z.string(), z.array(z.string())])
      .optional()
      .describe(
        "The updated list of tools that this agent is allowed to invoke. Can be a single string or an array of strings."
      ),
  })
  .describe("Schema configuration for updating an existing custom AI agent.");

const shareAgentSchema = z
  .object({
    sharedWith: z
      .array(z.string().uuid("Invalid user ID"))
      .min(1, "sharedWith must be an array of user IDs")
      .describe(
        "An array of unique user identifiers (UUIDs) representing the users with whom this AI agent will be shared."
      ),
  })
  .describe(
    "Schema configuration for sharing an AI agent with other users in the platform."
  );

const assignToProjectSchema = z
  .object({
    projectId: z
      .string()
      .uuid("Invalid project ID")
      .describe(
        "The unique identifier of the project to which the agent is being assigned. Must be a valid UUID."
      ),
  })
  .describe(
    "Schema configuration for assigning an AI agent to a specific project."
  );

const toggleActiveSchema = z
  .object({
    isActive: z
      .boolean({ required_error: "isActive must be a boolean" })
      .describe(
        "A boolean flag indicating whether the AI agent should be activated (true) or deactivated (false)."
      ),
  })
  .describe(
    "Schema configuration for toggling the active status of an AI agent."
  );

const chatPayloadSchema = z
  .object({
    agentId: z
      .string()
      .nullable()
      .optional()
      .transform((v) => (v === "null" || v === "" ? null : v))
      .describe(
        "The unique identifier of the AI agent to chat with. Can be null or empty to use a generic chat assistant."
      ),
    allowEdit: z
      .preprocess((val) => {
        if (val === "true") return true;
        if (val === "false") return false;
        if (val === undefined || val === null) return true;
        return val;
      }, z.boolean())
      .describe(
        "A boolean flag indicating whether the agent is allowed to edit or modify files in the workspace."
      ),
    allowWebSearch: z
      .preprocess((val) => {
        if (val === "true") return true;
        if (val === "false") return false;
        if (val === undefined || val === null) return false;
        return val;
      }, z.boolean())
      .describe(
        "A boolean flag indicating whether the agent is allowed to perform web searches to retrieve external information."
      ),
    context: z
      .preprocess((val) => {
        if (val === "null" || val === "") return null;
        if (typeof val === "string") {
          try {
            return JSON.parse(val);
          } catch {
            return val;
          }
        }
        return val;
      }, z.record(z.any()).nullable().optional())
      .describe(
        "An optional key-value map representing the contextual data or variables to pass to the chat execution engine."
      ),
    message: z
      .string()
      .min(1, "Message is required")
      .describe("The user message or query text to send to the AI agent."),
    model: z
      .preprocess(
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
          name: z
            .string()
            .min(1)
            .describe(
              "The name of the model to use for this chat request, such as gpt-4o."
            ),
          reasoningLevel: z
            .enum(["none", "low", "medium", "high"])
            .optional()
            .default("none")
            .describe(
              "The reasoning level to apply for the model (if supported by the model)."
            ),
          version: z
            .string()
            .min(1)
            .describe(
              "The specific version identifier of the model to use for this chat request."
            ),
        })
      )
      .describe(
        "An object containing the configuration details of the model to be used, including its name and version."
      ),
    noteIds: z
      .preprocess((val) => {
        if (val === "null" || val === "") return null;
        if (typeof val === "string") {
          try {
            return JSON.parse(val);
          } catch {
            return val;
          }
        }
        return val;
      }, z.array(z.string()).nullable().optional())
      .describe(
        "An optional array of unique note identifiers to supply as relevant context for the AI agent during the chat session."
      ),
    projectIds: z
      .preprocess((val) => {
        if (val === "null" || val === "") return null;
        if (typeof val === "string") {
          try {
            return JSON.parse(val);
          } catch {
            return val;
          }
        }
        return val;
      }, z.array(z.string()).nullable().optional())
      .describe(
        "An optional array of unique project identifiers to supply as relevant context for the AI agent during the chat session."
      ),
    requestId: z
      .string()
      .uuid("Invalid requestId")
      .nullable()
      .optional()
      .transform((v) => (v === "null" || v === "" ? null : v))
      .describe(
        "A unique identifier (UUID) for this specific chat request to track execution and correlation across systems."
      ),
    sessionId: z
      .string()
      .nullable()
      .optional()
      .transform((v) => (v === "null" || v === "" ? null : v))
      .describe(
        "The unique identifier of the chat session. If omitted or null, a new chat session will be generated."
      ),
    useCase: z
      .string()
      .nullable()
      .optional()
      .transform((v) => (v === "null" || v === "" ? null : v))
      .describe(
        "An optional string indicating the specific use case or intent of this chat request."
      ),
  })
  .describe(
    "Schema configuration for sending a message to an AI agent (chat)."
  );

const submitFeedbackSchema = z
  .object({
    comment: z
      .string()
      .nullable()
      .optional()
      .describe(
        "An optional text comment or explanation describing the user feedback in detail."
      ),
    rating: z
      .enum(["like", "dislike"])
      .nullable()
      .describe(
        "The rating value for the chat response, which must be either like or dislike."
      ),
  })
  .describe(
    "Schema configuration for submitting user feedback on an AI agent response."
  );

const getChatHistorySchema = z
  .object({
    limit: z.coerce
      .number()
      .min(1)
      .max(100)
      .optional()
      .default(50)
      .describe(
        "The maximum number of history records to retrieve in a single response. Must be between 1 and 100, defaulting to 50."
      ),
    offset: z.coerce
      .number()
      .min(0)
      .optional()
      .default(0)
      .describe(
        "The number of initial history records to skip for pagination, defaulting to 0."
      ),
    sessionId: z
      .string()
      .uuid("Invalid session ID")
      .optional()
      .describe(
        "The unique identifier of the chat session to retrieve the history for. Must be a valid UUID."
      ),
  })
  .describe(
    "Schema configuration for retrieving the chat history for a session."
  );

module.exports = {
  assignToProjectSchema,
  chatPayloadSchema,
  createUserAgentSchema,
  getChatHistorySchema,
  listUserAgentsSchema,
  shareAgentSchema,
  submitFeedbackSchema,
  toggleActiveSchema,
  updateAgentSchema,
};
