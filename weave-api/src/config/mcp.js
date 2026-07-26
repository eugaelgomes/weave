const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} = require("@modelcontextprotocol/sdk/types.js");
const { zodToJsonSchema } = require("zod-to-json-schema");

// Import all active module tool factories
const { createPlansTools } = require("@/modules/plans/tools/plans.tools");
const {
  createTaskPriorityTools,
} = require("@/modules/task-priorities/tools/task-priorities.tools");
const {
  createWebhooksTools,
} = require("@/modules/webhooks/tools/webhooks.tools");
const {
  createPasswordTools,
} = require("@/modules/password/tools/password.tools");
const {
  createApiTokensTools,
} = require("@/modules/api-tokens/tools/api-tokens.tools");
const {
  createProjectsTools,
} = require("@/modules/projects/tools/projects.tools");
const {
  createNotificationsTools,
} = require("@/modules/notifications/tools/notifications.tools");
const {
  createArtifactsTools,
} = require("@/modules/artifacts/tools/artifacts.tools");
const { createBackupTools } = require("@/modules/backup/tools/backup.tools");
const {
  createCalendarEventsTools,
} = require("@/modules/calendar-events/tools/calendar-events.tools");
const { createTagsTools } = require("@/modules/tags/tools/tags.tools");
const { createNotesTools } = require("@/modules/notes/tools/notes.tools");
const { createNoteBlocksTools } = require("@/modules/notes/tools/blocks.tools");
const {
  createNoteCollaboratorsTools,
} = require("@/modules/notes/tools/collaborators.tools");
const { createCommentsTools } = require("@/modules/notes/tools/comments.tools");
const {
  createAuthenticationTools,
} = require("@/modules/authentication/tools/authentication.tools");
const { createEngineTools } = require("@/modules/engine/tools/engine.tools");
const { createUsersTools } = require("@/modules/users/tools/users.tools");
const { createSlackTools } = require("@/modules/slack/tools/slack.tools");
const { createMcpTools } = require("@/modules/mcp/tools/mcp.tools");
const {
  createWeaveAiTools,
} = require("@/modules/weave-ai/tools/weave-ai.tools");
const {
  createOrganizationsTools,
} = require("@/modules/organizations/tools/organizations.tools");

/**
 * Builds the MCP registry for the given user.
 * This is where tools, resources, and prompts are loaded and bound to the user's context.
 *
 * @param {Object} user - The authenticated user object from verifyToken.
 * @returns {Object} The registry object containing tools, resources, and prompts.
 */
function buildRegistry(user) {
  return {
    prompts: {},
    resources: { readHandlers: [], templates: [] },
    tools: {
      ...createPlansTools(user),
      ...createTaskPriorityTools(user),
      ...createWebhooksTools(user),
      ...createPasswordTools(user),
      ...createApiTokensTools(user),
      ...createProjectsTools(user),
      ...createNotificationsTools(user),
      ...createArtifactsTools(user),
      ...createBackupTools(user),
      ...createCalendarEventsTools(user),
      ...createTagsTools(user),
      ...createNotesTools(user),
      ...createNoteBlocksTools(user),
      ...createNoteCollaboratorsTools(user),
      ...createCommentsTools(user),
      ...createAuthenticationTools(user),
      ...createEngineTools(user),
      ...createUsersTools(user),
      ...createSlackTools(user),
      ...createMcpTools(user),
      ...createWeaveAiTools(user),
      ...createOrganizationsTools(user),
    },
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
      const rawJsonSchema = zodToJsonSchema(tool.schema);
      delete rawJsonSchema.$schema;
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
    prompts: Object.values(registry.prompts).map(
      ({ name, description, arguments: args }) => ({
        arguments: args,
        description,
        name,
      })
    ),
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
function createMcpServer() {
  return new Server(
    {
      name: "weave-api-mcp",
      version: "1.0.0",
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
