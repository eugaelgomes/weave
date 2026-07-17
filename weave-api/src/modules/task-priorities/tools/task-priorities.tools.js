const {
  listTaskPrioritiesSchema,
  createTaskPrioritySchema,
  updateTaskPrioritySchema,
  deleteTaskPrioritySchema,
} = require("../schemas/task-priorities.schema");
const taskPrioritiesRepository = require("@/modules/task-priorities/repositories/task-priorities.repository");

/**
 * Creates the Task Priorities tools registry bound to a specific user context.
 *
 * @param {Object} user - The authenticated user object.
 * @returns {Record<string, Object>} The task priorities tools definition map.
 */
const createTaskPriorityTools = (user) => ({
  create_task_priority: {
    description: "Create a new task priority configuration for a project",
    handler: async (args) => {
      try {
        const { projectId, name, color, level } = args;
        const newPriority = await taskPrioritiesRepository.createPriority({
          color,
          createdBy: user.userId,
          level,
          name,
          orgId: user.organizationId,
          projectId,
        });
        return {
          content: [
            { text: JSON.stringify(newPriority, null, 2), type: "text" },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              text: `Error creating task priority: ${error.message}`,
              type: "text",
            },
          ],
          isError: true,
        };
      }
    },
    name: "create_task_priority",
    schema: createTaskPrioritySchema,
  },
  delete_task_priority: {
    description: "Delete a task priority",
    handler: async (args) => {
      try {
        const { projectId, priorityId } = args;
        const deleted = await taskPrioritiesRepository.deletePriority(
          priorityId,
          {
            deletedBy: user.userId,
            projectId,
          }
        );
        if (!deleted) {
          return {
            content: [
              {
                text: `Task priority ${priorityId} not found or access denied.`,
                type: "text",
              },
            ],
            isError: true,
          };
        }
        return {
          content: [{ text: JSON.stringify(deleted, null, 2), type: "text" }],
        };
      } catch (error) {
        return {
          content: [
            {
              text: `Error deleting task priority: ${error.message}`,
              type: "text",
            },
          ],
          isError: true,
        };
      }
    },
    name: "delete_task_priority",
    schema: deleteTaskPrioritySchema,
  },
  list_task_priorities: {
    description: "List all task priorities for a specific project",
    handler: async (args) => {
      try {
        const priorities = await taskPrioritiesRepository.getPriorities({
          projectId: args.projectId,
        });
        return {
          content: [
            { text: JSON.stringify(priorities, null, 2), type: "text" },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              text: `Error listing task priorities: ${error.message}`,
              type: "text",
            },
          ],
          isError: true,
        };
      }
    },
    name: "list_task_priorities",
    schema: listTaskPrioritiesSchema,
  },
  update_task_priority: {
    description: "Update an existing task priority",
    handler: async (args) => {
      try {
        const { projectId, priorityId, name, color, level } = args;
        const updated = await taskPrioritiesRepository.updatePriority(
          priorityId,
          {
            projectId,
            updates: { color, level, name },
          }
        );
        if (!updated) {
          return {
            content: [
              {
                text: `Task priority ${priorityId} not found or access denied.`,
                type: "text",
              },
            ],
            isError: true,
          };
        }
        return {
          content: [{ text: JSON.stringify(updated, null, 2), type: "text" }],
        };
      } catch (error) {
        return {
          content: [
            {
              text: `Error updating task priority: ${error.message}`,
              type: "text",
            },
          ],
          isError: true,
        };
      }
    },
    name: "update_task_priority",
    schema: updateTaskPrioritySchema,
  },
});

module.exports = {
  createTaskPriorityTools,
};
