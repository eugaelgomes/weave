const { z } = require("zod");
const agentsRepository = require("../repositories/agents.repository");
const chatOrchestratorService = require("../utils/chat-orchestrator.util");
const { randomUUID } = require("crypto");

const manageAgentHouseSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("chat"),
    agent_id: z.string().optional().describe("ID of the agent to chat with"),
    message: z.string().optional().describe("Message payload for chat"),
    messages: z
      .array(z.record(z.any()))
      .optional()
      .describe("Array of chat messages"),
    requestId: z.string().optional().describe("Request ID for chat"),
  }),
  z.object({
    action: z.literal("create_agent"),
    description: z
      .string()
      .optional()
      .describe("Description of the custom agent"),
    instructions: z.string().optional().describe("Agent instructions"),
    language: z.string().optional().describe("Agent language"),
    name: z.string().describe("Name of the custom agent"),
    project_id: z.string().optional().describe("Project ID"),
    role: z.string().optional().describe("Agent role"),
    rules: z
      .union([z.string(), z.array(z.string())])
      .optional()
      .describe("Agent rules"),
    tone: z.string().optional().describe("Agent tone"),
  }),
  z.object({
    action: z.literal("list_agents"),
    project_id: z.string().optional().describe("Project ID"),
  }),
]);

const createAgentHouseTools = (user) => ({
  manage_weave_ai: {
    description: "Manage Weave AI (chat, create_agent, list_agents).",
    handler: async (args) => {
      try {
        const {
          action,
          requestId,
          project_id,
          name,
          description,
          instructions,
          language,
          role,
          tone,
          rules,
        } = args;

        if (action === "chat") {
          const reqId = requestId || randomUUID();
          const organizationId = user.organizationId || user.org_id || null;
          const onChunk = () => {};
          const result = await chatOrchestratorService.orchestrateChat({
            files: [],
            onChunk,
            organizationId,
            payload: args,
            requestId: reqId,
            userId: user.id,
            userLanguage: "en",
          });
          return {
            content: [{ text: JSON.stringify(result, null, 2), type: "text" }],
          };
        }

        if (action === "create_agent") {
          const personality = {
            instructions: instructions || "",
            language: language || "en",
            role: role || "",
            rules: Array.isArray(rules) ? rules : rules ? [rules] : [],
            tone: tone || "",
          };
          const newAgent = await agentsRepository.createAgent(user.id, {
            description,
            isActive: true,
            name,
            personality,
            projectId: project_id,
          });
          return {
            content: [
              { text: JSON.stringify(newAgent, null, 2), type: "text" },
            ],
          };
        }

        if (action === "list_agents") {
          const filters = {};
          if (project_id) filters.projectId = project_id;
          const agents = await agentsRepository.getUserAgents(user.id, filters);
          return {
            content: [{ text: JSON.stringify(agents, null, 2), type: "text" }],
          };
        }

        throw new Error(`Invalid action: ${action}`);
      } catch (error) {
        return {
          content: [
            { text: `Error managing Weave AI: ${error.message}`, type: "text" },
          ],
          isError: true,
        };
      }
    },
    name: "manage_weave_ai",
    schema: manageAgentHouseSchema,
  },
});

module.exports = {
  createAgentHouseTools,
};
