const { z } = require("zod");
const SprintsRepository = require("../repositories/sprints.repository");
const ReasoningsReadRepository = require("../repositories/reasonings.read.repository");
const ReasoningsCreateRepository = require("../repositories/reasonings.create.repository");

const manageEngineSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create_reasoning"),
    actionItems: z
      .array(z.record(z.any()))
      .optional()
      .describe("Action items for reasoning"),
    content: z
      .record(z.any())
      .optional()
      .describe("Content payload for reasoning"),
    summary: z.string().optional().describe("Summary of the reasoning"),
    title: z.string().optional().describe("Title of the reasoning"),
  }),
  z.object({
    action: z.literal("get_reasoning"),
    reasoningId: z.string().uuid().describe("ID of the reasoning"),
  }),
  z.object({
    action: z.literal("list_reasonings"),
    limit: z.number().optional().describe("Limit for listing"),
    page: z.number().optional().describe("Page for listing"),
    projectId: z.string().uuid().describe("ID of the project"),
    sort: z.string().optional().describe("Sort parameter"),
  }),
  z.object({
    action: z.literal("list_sprints"),
    limit: z.number().optional().describe("Limit for listing"),
    page: z.number().optional().describe("Page for listing"),
    projectId: z.string().uuid().describe("ID of the project"),
    sort: z.string().optional().describe("Sort parameter"),
  }),
]);

const createEngineTools = (user) => ({
  manage_engine: {
    description:
      "Manage engine reasonings and sprints (create_reasoning, get_reasoning, list_reasonings, list_sprints).",
    handler: async (params) => {
      try {
        const {
          action,
          projectId,
          reasoningId,
          limit,
          page,
          sort,
          ...filters
        } = params;

        if (action === "create_reasoning") {
          const reasoning = await ReasoningsCreateRepository.create({
            ...params,
            triggeredBy: user.id,
          });
          return {
            content: [
              { text: JSON.stringify(reasoning, null, 2), type: "text" },
            ],
          };
        }

        if (action === "get_reasoning") {
          if (!reasoningId)
            throw new Error(
              "reasoningId is required for get_reasoning action."
            );
          const content =
            await ReasoningsReadRepository.getContentById(reasoningId);
          if (!content) throw new Error("Reasoning not found");
          const actionItems =
            await ReasoningsReadRepository.getActionItemsByReasoning(
              reasoningId
            );
          return {
            content: [
              {
                text: JSON.stringify({ ...content, actionItems }, null, 2),
                type: "text",
              },
            ],
          };
        }

        if (action === "list_reasonings") {
          if (!projectId)
            throw new Error(
              "projectId is required for list_reasonings action."
            );
          const pagination = {
            limit: parseInt(limit, 10) || 20,
            offset:
              ((parseInt(page, 10) || 1) - 1) * (parseInt(limit, 10) || 20),
          };
          let sortConfig = { field: "created_at", order: "desc" };
          if (sort)
            sortConfig = {
              field: sort.startsWith("-") ? sort.substring(1) : sort,
              order: sort.startsWith("-") ? "desc" : "asc",
            };
          const reasonings =
            await ReasoningsReadRepository.listByProjectForMember(
              projectId,
              user.id,
              filters,
              pagination,
              sortConfig
            );
          return {
            content: [
              { text: JSON.stringify(reasonings, null, 2), type: "text" },
            ],
          };
        }

        if (action === "list_sprints") {
          if (!projectId)
            throw new Error("projectId is required for list_sprints action.");
          const pagination = {
            limit: parseInt(limit, 10) || 20,
            offset:
              ((parseInt(page, 10) || 1) - 1) * (parseInt(limit, 10) || 20),
          };
          let sortConfig = { field: "sprint_number", order: "desc" };
          if (sort)
            sortConfig = {
              field: sort.startsWith("-") ? sort.substring(1) : sort,
              order: sort.startsWith("-") ? "desc" : "asc",
            };
          const sprints = await SprintsRepository.getFilteredByProject(
            projectId,
            filters,
            pagination,
            sortConfig
          );
          return {
            content: [{ text: JSON.stringify(sprints, null, 2), type: "text" }],
          };
        }

        throw new Error(`Invalid action: ${action}`);
      } catch (error) {
        return {
          content: [
            { text: `Error managing engine: ${error.message}`, type: "text" },
          ],
          isError: true,
        };
      }
    },
    name: "manage_engine",
    schema: manageEngineSchema,
  },
});

module.exports = {
  createEngineTools,
};
