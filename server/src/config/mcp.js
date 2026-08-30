const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} = require("@modelcontextprotocol/sdk/types.js");

// Import all active module tool factories
const { createPlansTools } = require("@/modules/plans/tools/plans.tools");
const { createTaskPriorityTools } = require("@/modules/projects/tools/task-priorities.tools");
const { createWebhooksTools } = require("@/modules/webhooks/tools/webhooks.tools");

const { createApiTokensTools } = require("@/modules/api-tokens/tools/api-tokens.tools");
const { createProjectsTools } = require("@/modules/projects/tools/projects.tools");
const { createNotificationsTools } = require("@/modules/notifications/tools/notifications.tools");
const { createArtifactsTools } = require("@/modules/agent-house/tools/artifacts.tools");
const { createBackupTools } = require("@/modules/backup/tools/backup.tools");
const { createCalendarTools } = require("@/modules/calendar/tools/calendar.tools");
const { createTagsTools } = require("@/modules/projects/tools/tags.tools");
const { createNotesTools } = require("@/modules/notes/tools/notes.tools");
const { createNoteBlocksTools } = require("@/modules/notes/tools/blocks.tools");
const { createNoteCollaboratorsTools } = require("@/modules/notes/tools/collaborators.tools");
const { createCommentsTools } = require("@/modules/notes/tools/comments.tools");

const { createUsersTools } = require("@/modules/users/tools/users.tools");
const { createSlackTools } = require("@/modules/slack/tools/slack.tools");

const { createAgentHouseTools } = require("@/modules/agent-house/tools/agent-house.tools");
const { createOrganizationsTools } = require("@/modules/workspaces/tools/workspaces.tools");

/**
 * Builds the MCP registry for the given user.
 * This is where tools, resources, and prompts are loaded and bound to the user's context.
 *
 * @param {Object} user - The authenticated user object from verifyToken.
 * @returns {Object} The registry object containing tools, resources, and prompts.
 */
function buildRegistry(user) {
  const allTools = {
    ...createPlansTools(user),
    ...createTaskPriorityTools(user),
    ...createWebhooksTools(user),

    ...createApiTokensTools(user),
    ...createProjectsTools(user),
    ...createNotificationsTools(user),
    ...createArtifactsTools(user),
    ...createBackupTools(user),
    ...createCalendarTools(user),
    ...createTagsTools(user),
    ...createNotesTools(user),
    ...createNoteBlocksTools(user),
    ...createNoteCollaboratorsTools(user),
    ...createCommentsTools(user),

    ...createUsersTools(user),
    ...createSlackTools(user),

    ...createAgentHouseTools(user),
    ...createOrganizationsTools(user),
  };

  let filteredTools = allTools;

  // Filter tools based on API token scopes natively defined by each tool
  if (user?.isApiCall && user?.apiToken?.scopes) {
    const userScopes = user.apiToken.scopes;
    filteredTools = {};

    for (const [toolKey, tool] of Object.entries(allTools)) {
      if (tool.scopes && Array.isArray(tool.scopes)) {
        // Only include the tool if the user token has at least one matching scope
        if (tool.scopes.some((scope) => userScopes.includes(scope))) {
          filteredTools[toolKey] = tool;
        }
      } else {
        // If the tool does not require explicit scope mapping, include it
        filteredTools[toolKey] = tool;
      }
    }
  }

  return {
    prompts: {},
    resources: { readHandlers: [], templates: [] },
    tools: filteredTools,
  };
}

/**
 * Configures MCP request handlers (tools, resources) on a given Server instance
 * using the provided registry.
 *
 * @param {Server} server - The MCP Server instance to attach handlers to.
 * @param {Object} registry - The fully assembled module registry.
 */
function registerHandlers(server, registry) {
  // Tools capability: list available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: Object.entries(registry.tools).map(([toolKey, tool]) => {
      const toolName = tool.name || toolKey;

      const rawJsonSchema =
        typeof tool.schema?.toJSONSchema === "function" ? tool.schema.toJSONSchema() : {};
      delete rawJsonSchema.$schema;

      // Normalize root-level unions to a flat object schema.
      // Zod's discriminatedUnion emits anyOf/oneOf at the root, which is rejected
      // by OpenAI's function calling API. We flatten union branches into a single
      // object with merged properties, promoting literal 'const' values to 'enum'.
      const unionBranches = rawJsonSchema.anyOf || rawJsonSchema.oneOf || rawJsonSchema.allOf;
      if (Array.isArray(unionBranches)) {
        const mergedProperties = {};
        for (const branch of unionBranches) {
          if (!branch?.properties) continue;
          for (const [propName, propSchema] of Object.entries(branch.properties)) {
            if (!mergedProperties[propName]) {
              mergedProperties[propName] = { ...propSchema };
            } else {
              const existing = mergedProperties[propName];
              const enumValues = new Set();
              if (Array.isArray(existing.enum)) existing.enum.forEach((v) => enumValues.add(v));
              if (existing.const !== undefined) enumValues.add(String(existing.const));
              if (Array.isArray(propSchema.enum)) propSchema.enum.forEach((v) => enumValues.add(v));
              if (propSchema.const !== undefined) enumValues.add(String(propSchema.const));
              if (enumValues.size > 0) {
                delete existing.const;
                existing.type = "string";
                existing.enum = Array.from(enumValues);
              }
            }
          }
        }
        delete rawJsonSchema.anyOf;
        delete rawJsonSchema.oneOf;
        delete rawJsonSchema.allOf;
        rawJsonSchema.type = "object";
        rawJsonSchema.properties = mergedProperties;
      }

      return {
        description: tool.description || "",
        inputSchema: {
          properties: {},
          type: "object",
          ...rawJsonSchema,
        },
        name: toolName,
      };
    }),
  }));

  // Tools capability: execute a tool by name
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
      const tool = registry.tools[request.params.name];
      if (!tool) {
        return {
          content: [
            {
              text: `Error: Tool not found '${request.params.name}'`,
              type: "text",
            },
          ],
          isError: true,
        };
      }

      const parsedArgs = tool.schema.parse(request.params.arguments);
      return await tool.handler(parsedArgs);
    } catch (error) {
      console.error(`[Error executing tool ${request.params.name}]:`, error);

      // Retorna o erro graciosamente para a IA ler e corrigir, sem quebrar o json-rpc
      return {
        content: [
          {
            text: `Failed to execute tool '${request.params.name}'. Reason: ${error.message}`,
            type: "text",
          },
        ],
        isError: true,
      };
    }
  });

  // Resources capability: list available resource templates
  server.setRequestHandler(ListResourcesRequestSchema, async () => ({
    resources: registry.resources.templates,
  }));

  // Resources capability: read a specific resource by URI
  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    for (const handler of registry.resources.readHandlers) {
      const result = await handler(request.params.uri);
      if (result) return result;
    }
    throw new Error(`Resource not found: ${request.params.uri}`);
  });

  // Prompts capability: list available prompt templates
  server.setRequestHandler(ListPromptsRequestSchema, async () => ({
    prompts: Object.values(registry.prompts).map(({ name, description, arguments: args }) => ({
      arguments: args,
      description,
      name,
    })),
  }));

  // Prompts capability: execute a prompt template by name
  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const prompt = registry.prompts[request.params.name];
    if (!prompt) {
      throw new Error(`Prompt not found: ${request.params.name}`);
    }
    return await prompt.handler(request.params.arguments || {});
  });
}

/**
 * Creates a new MCP Server instance with the standard capability set.
 *
 * @returns {Server} A fresh MCP Server instance.
 */
const FRONTEND_URL = process.env.FRONTEND_URL || "https://app.theweave.dev";
const API_URL = process.env.API_URL || "https://api.theweave.dev";

function createMcpServer() {
  return new Server(
    {
      description: "Weave AI MCP Server for notes, tasks, and workspaces",
      icon: `${API_URL.replace(/\/+$/, "")}/public/logo.png`,
      name: "weave-api-mcp",
      version: "1.0.0",
      websiteUrl: FRONTEND_URL,
    },
    {
      capabilities: {
        prompts: {},
        resources: {},
        tools: {},
      },
    }
  );
}

/**
 * Factory function to create and configure an MCP Server for a specific user session.
 *
 * @param {Object} user - The authenticated user object.
 * @returns {Server} The configured MCP server instance.
 */
function configureServerForUser(user) {
  const server = createMcpServer();
  const registry = buildRegistry(user);
  registerHandlers(server, registry);
  return server;
}

module.exports = {
  buildRegistry,
  configureServerForUser,
};
