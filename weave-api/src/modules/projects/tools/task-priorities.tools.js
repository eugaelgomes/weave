const { z } = require("zod");
const taskPrioritiesRepository = require("@/modules/projects/repositories/task-priorities.repository");

const manageTaskPrioritiesSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create"),
    color: z.string().optional().describe("Color hex code for the priority"),
    level: z.number().optional().describe("Numerical priority level, e.g. 1, 2, 3"),
    name: z.string().describe("Name of the priority"),
    projectId: z.string().describe("ID of the project"),
  }),
  z.object({
    action: z.literal("update"),
    color: z.string().optional().describe("Color hex code for the priority"),
    level: z.number().optional().describe("Numerical priority level, e.g. 1, 2, 3"),
    name: z.string().optional().describe("Name of the priority"),
    priorityId: z.string().describe("ID of the task priority"),
    projectId: z.string().describe("ID of the project"),
  }),
  z.object({
    action: z.literal("delete"),
    priorityId: z.string().describe("ID of the task priority"),
    projectId: z.string().describe("ID of the project"),
  }),
  z.object({
    action: z.literal("list"),
    projectId: z.string().describe("ID of the project"),
  }),
]);

const createTaskPriorityTools = (user) => ({
  manage_task_priorities: {
    description: "Manage task priorities for a project (create, update, delete, list).",
    handler: async (args) => {
      try {
        const { action, projectId, priorityId, name, color, level } = args;

        if (action === "create") {
          const newPriority = await taskPrioritiesRepository.createPriority({
            color,
            createdBy: user.userId,
            level,
            name,
            orgId: user.organizationId,
            projectId,
          });
          return {
            content: [{ text: JSON.stringify(newPriority, null, 2), type: "text" }],
          };
        }

        if (action === "list") {
          const priorities = await taskPrioritiesRepository.getPriorities({
            projectId,
          });
          return {
            content: [{ text: JSON.stringify(priorities, null, 2), type: "text" }],
          };
        }

        if (action === "update") {
          if (!priorityId) throw new Error("priorityId is required for update action");
          const updated = await taskPrioritiesRepository.updatePriority(priorityId, {
            projectId,
            updates: { color, level, name },
          });
          if (!updated) throw new Error(`Task priority ${priorityId} not found.`);
          return {
            content: [{ text: JSON.stringify(updated, null, 2), type: "text" }],
          };
        }

        if (action === "delete") {
          if (!priorityId) throw new Error("priorityId is required for delete action");
          const deleted = await taskPrioritiesRepository.deletePriority(priorityId, {
            deletedBy: user.userId,
            projectId,
          });
          if (!deleted) throw new Error(`Task priority ${priorityId} not found.`);
          return {
            content: [{ text: JSON.stringify(deleted, null, 2), type: "text" }],
          };
        }

        throw new Error(`Invalid action: ${action}`);
      } catch (error) {
        return {
          content: [{ text: `Error: ${error.message}`, type: "text" }],
          isError: true,
        };
      }
    },
    name: "manage_task_priorities",
    schema: manageTaskPrioritiesSchema,
  },
});

module.exports = {
  createTaskPriorityTools,
};
