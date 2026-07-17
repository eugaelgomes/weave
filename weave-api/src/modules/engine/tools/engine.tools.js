const SprintsRepository = require("../repositories/sprints.repository");
const ReasoningsReadRepository = require("../repositories/reasonings.read.repository");
const ReasoningsCreateRepository = require("../repositories/reasonings.create.repository");
const {
  getSprintsSchema,
  getReasoningsSchema,
  createReasoningSchema,
  engineContextParamSchema,
  reasoningParamsSchema,
} = require("../schemas/engine.schema");

/**
 * Creates the Engine tools registry bound to a specific user context.
 *
 * @param {Object} user - The authenticated user object.
 * @returns {Record<string, Object>} The engine tools definition map.
 */
const createEngineTools = (user) => ({
  create_reasoning: {
    description: "Creates a new reasoning with its content and action items.",
    handler: async (params) => {
      try {
        const reasoning = await ReasoningsCreateRepository.create({
          ...params,
          triggeredBy: user.id,
        });
        return {
          content: [{ text: JSON.stringify(reasoning, null, 2), type: "text" }],
        };
      } catch (error) {
        return {
          content: [{ text: `Error: ${error.message}`, type: "text" }],
          isError: true,
        };
      }
    },
    schema: createReasoningSchema,
  },
  get_reasoning: {
    description:
      "Gets the full heavy content payload and action items for a single reasoning.",
    handler: async (params) => {
      try {
        const { reasoningId } = params;
        const content =
          await ReasoningsReadRepository.getContentById(reasoningId);
        if (!content) {
          return {
            content: [{ text: "Reasoning not found", type: "text" }],
            isError: true,
          };
        }
        const actionItems =
          await ReasoningsReadRepository.getActionItemsByReasoning(reasoningId);
        return {
          content: [
            {
              text: JSON.stringify({ ...content, actionItems }, null, 2),
              type: "text",
            },
          ],
        };
      } catch (error) {
        return {
          content: [{ text: `Error: ${error.message}`, type: "text" }],
          isError: true,
        };
      }
    },
    schema: reasoningParamsSchema,
  },
  get_reasonings: {
    description: "Lists and filters engine reasonings for a project.",
    handler: async (params) => {
      try {
        const { projectId, limit, page, sort, ...filters } = params;
        const pagination = {
          limit: parseInt(limit, 10) || 20,
          offset: ((parseInt(page, 10) || 1) - 1) * (parseInt(limit, 10) || 20),
        };

        let sortConfig = { field: "created_at", order: "desc" };
        if (sort) {
          const isDesc = sort.startsWith("-");
          sortConfig = {
            field: isDesc ? sort.substring(1) : sort,
            order: isDesc ? "desc" : "asc",
          };
        }

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
      } catch (error) {
        return {
          content: [{ text: `Error: ${error.message}`, type: "text" }],
          isError: true,
        };
      }
    },
    schema: getReasoningsSchema.merge(engineContextParamSchema),
  },
  get_sprints: {
    description: "Lists and filters sprints for a given project.",
    handler: async (params) => {
      try {
        const { projectId, limit, page, sort, ...filters } = params;
        const pagination = {
          limit: parseInt(limit, 10) || 20,
          offset: ((parseInt(page, 10) || 1) - 1) * (parseInt(limit, 10) || 20),
        };

        let sortConfig = { field: "sprint_number", order: "desc" };
        if (sort) {
          const isDesc = sort.startsWith("-");
          sortConfig = {
            field: isDesc ? sort.substring(1) : sort,
            order: isDesc ? "desc" : "asc",
          };
        }

        const sprints = await SprintsRepository.getFilteredByProject(
          projectId,
          filters,
          pagination,
          sortConfig
        );
        return {
          content: [{ text: JSON.stringify(sprints, null, 2), type: "text" }],
        };
      } catch (error) {
        return {
          content: [{ text: `Error: ${error.message}`, type: "text" }],
          isError: true,
        };
      }
    },
    schema: getSprintsSchema.merge(engineContextParamSchema),
  },
});

module.exports = {
  createEngineTools,
};
