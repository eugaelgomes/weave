const { z } = require("zod");

const listTaskPrioritiesSchema = z.object({
  projectId: z
    .string()
    .uuid()
    .describe("Project ID whose task priorities you want to view."),
});

const createTaskPrioritySchema = z.object({
  colorHex: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional()
    .describe("Cor em HEX."),
  name: z
    .string()
    .min(1)
    .max(30)
    .describe("Nome da Priority (ex: Alta, Baixa)."),
  projectId: z
    .string()
    .uuid()
    .describe("Project ID where to create the priority."),
  sortOrder: z
    .number()
    .int()
    .optional()
    .describe("Ordem para exibição (ex: 1, 2, 3)."),
});

const updateTaskPrioritySchema = z.object({
  colorHex: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional()
    .describe("Nova cor em HEX."),
  name: z.string().min(1).max(30).optional().describe("Novo nome da Priority."),
  priorityId: z.string().uuid().describe("ID da Priority a ser atualizada."),
  projectId: z
    .string()
    .uuid()
    .describe("Project ID to which the priority belongs."),
  sortOrder: z.number().int().optional().describe("Nova ordem para exibição."),
});

const deleteTaskPrioritySchema = z.object({
  priorityId: z.string().uuid().describe("ID da Priority a ser excluída."),
  projectId: z
    .string()
    .uuid()
    .describe("Project ID to which the priority belongs."),
});

module.exports = {
  taskPrioritySchemas: {
    create_task_priority: createTaskPrioritySchema,
    delete_task_priority: deleteTaskPrioritySchema,
    list_task_priorities: listTaskPrioritiesSchema,
    update_task_priority: updateTaskPrioritySchema,
  },
  taskPriorityTools: [
    {
      function: {
        description:
          "Lists task priorities configured for a project. Useful before creating a task to know which priority to use.",
        name: "list_task_priorities",
        parameters: {
          properties: {
            projectId: { type: "string" },
          },
          required: ["projectId"],
          type: "object",
        },
      },
      type: "function",
    },
    {
      function: {
        description: "Creates a new task priority option for a project.",
        name: "create_task_priority",
        parameters: {
          properties: {
            colorHex: { type: "string" },
            name: { type: "string" },
            projectId: { type: "string" },
            sortOrder: { type: "number" },
          },
          required: ["projectId", "name"],
          type: "object",
        },
      },
      type: "function",
    },
    {
      function: {
        description: "Updates a task priority option for a project.",
        name: "update_task_priority",
        parameters: {
          properties: {
            colorHex: { type: "string" },
            name: { type: "string" },
            priorityId: { type: "string" },
            projectId: { type: "string" },
            sortOrder: { type: "number" },
          },
          required: ["projectId", "priorityId"],
          type: "object",
        },
      },
      type: "function",
    },
    {
      function: {
        description: "Deletes a task priority option for a project.",
        name: "delete_task_priority",
        parameters: {
          properties: {
            priorityId: { type: "string" },
            projectId: { type: "string" },
          },
          required: ["projectId", "priorityId"],
          type: "object",
        },
      },
      type: "function",
    },
  ],
};
