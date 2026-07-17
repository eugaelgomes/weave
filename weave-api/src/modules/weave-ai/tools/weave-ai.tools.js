const agentsRepository = require("../repositories/agents.repository");
const chatOrchestratorService = require("../services/chat-orchestrator.service");
const {
  listUserAgentsSchema,
  createUserAgentSchema,
  chatPayloadSchema,
} = require("../schemas/weave-ai.schema");
const { randomUUID } = require("crypto");

/**
 * Creates the WeaveAi tools registry bound to a specific user context.
 *
 * @param {Object} user - The authenticated user object.
 * @returns {Record<string, Object>} The weave-ai tools definition map.
 */
const createWeaveAiTools = (user) => ({
  chat_weave_ai: {
    description: "Send a message to a Weave AI agent and get a response.",
    handler: async (args) => {
      try {
        const requestId = args.requestId || randomUUID();
        const organizationId = user.organizationId || user.org_id || null;

        // Collect chunks if we wanted streaming text, though the orchestrator returns the final result anyway.
        const onChunk = () => {};

        const result = await chatOrchestratorService.orchestrateChat({
          files: [],
          // default
          onChunk,

          organizationId,

          payload: args,

          requestId,

          userId: user.id,
          userLanguage: "en",
        });

        return {
          content: [
            {
              text: JSON.stringify(result, null, 2),
              type: "text",
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            { text: `Error during chat: ${error.message}`, type: "text" },
          ],
          isError: true,
        };
      }
    },
    schema: chatPayloadSchema,
  },
  create_ai_agent: {
    description: "Create a new custom AI agent.",
    handler: async (args) => {
      try {
        // Prepare personality object
        const personality = {
          instructions: args.instructions || "",
          language: args.language || "en",
          role: args.role || "",
          rules: Array.isArray(args.rules)
            ? args.rules
            : args.rules
              ? [args.rules]
              : [],
          tone: args.tone || "",
        };

        const newAgent = await agentsRepository.createAgent(user.id, {
          description: args.description,
          isActive: true,
          name: args.name,
          personality,
          projectId: args.project_id,
        });

        // If tools are specified or tags, we would need to map those, but createAgent takes what's provided
        // We'd update the agent if needed, or leave it to standard implementation.

        return {
          content: [
            {
              text: JSON.stringify(newAgent, null, 2),
              type: "text",
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            { text: `Error creating agent: ${error.message}`, type: "text" },
          ],
          isError: true,
        };
      }
    },
    schema: createUserAgentSchema,
  },
  list_ai_agents: {
    description: "List custom AI agents available to the user.",
    handler: async (args) => {
      try {
        const filters = {};
        if (args.project_id) {
          filters.projectId = args.project_id;
        }

        const agents = await agentsRepository.getUserAgents(user.id, filters);

        return {
          content: [
            {
              text: JSON.stringify(agents, null, 2),
              type: "text",
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            { text: `Error listing agents: ${error.message}`, type: "text" },
          ],
          isError: true,
        };
      }
    },
    schema: listUserAgentsSchema,
  },
});

module.exports = {
  createWeaveAiTools,
};
