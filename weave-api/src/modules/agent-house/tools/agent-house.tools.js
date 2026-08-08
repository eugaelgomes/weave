const { z } = require("zod");
const agentsRepository = require("../repositories/agents.repository");
const manageAgentHouseSchema = z.discriminatedUnion("action", [
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
          project_id,
          name,
          description,
          instructions,
          language,
          role,
          tone,
          rules,
        } = args;



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
