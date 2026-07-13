const { z } = require("zod");

const sprintSchemas = [
  {
    function: {
      description: "Gets the currently active sprint for a given project.",
      name: "get_active_sprint",
      parameters: {
        properties: {
          projectId: {
            description: "The UUID of the project.",
            type: "string",
          },
        },
        required: ["projectId"],
        type: "object",
      },
    },
    type: "function",
  },
  {
    function: {
      description: "Gets all sprints for a project (sprint history).",
      name: "get_project_sprints",
      parameters: {
        properties: {
          limit: {
            description: "Maximum number of sprints to return. Default is 20.",
            type: "number",
          },
          projectId: {
            description: "The UUID of the project.",
            type: "string",
          },
        },
        required: ["projectId"],
        type: "object",
      },
    },
    type: "function",
  },
  {
    function: {
      description:
        "Creates a new sprint for a project. Sprints organize work into time-boxed periods.",
      name: "create_sprint",
      parameters: {
        properties: {
          endDate: {
            description: "The end date of the sprint (YYYY-MM-DD format).",
            type: "string",
          },
          goal: {
            description: "The goal or objective for this sprint.",
            type: "string",
          },
          projectId: {
            description: "The UUID of the project.",
            type: "string",
          },
          startDate: {
            description: "The start date of the sprint (YYYY-MM-DD format).",
            type: "string",
          },
          title: {
            description: "The title of the sprint.",
            type: "string",
          },
          workableDays: {
            description:
              "An array of numbers representing workable days of the week (0 = Sunday, 1 = Monday, etc.). Default is [1, 2, 3, 4, 5] (Monday to Friday).",
            items: {
              type: "number",
            },
            type: "array",
          },
        },
        required: ["projectId", "title", "startDate", "endDate"],
        type: "object",
      },
    },
    type: "function",
  },
  {
    function: {
      description:
        "Completes an active sprint, optionally adding a summary and metrics.",
      name: "complete_sprint",
      parameters: {
        properties: {
          sprintId: {
            description: "The UUID of the sprint to complete.",
            type: "string",
          },
          summary: {
            description: "A summary of what was achieved during the sprint.",
            type: "string",
          },
        },
        required: ["sprintId"],
        type: "object",
      },
    },
    type: "function",
  },
];

const sprintZodSchemas = {
  complete_sprint: z.object({
    sprintId: z.string().uuid(),
    summary: z.string().optional(),
  }),
  create_sprint: z.object({
    endDate: z.string(),
    goal: z.string().optional(),
    projectId: z.string().uuid(),
    startDate: z.string(),
    title: z.string(),
    workableDays: z.array(z.number()).optional().default([1, 2, 3, 4, 5]),
  }),
  get_active_sprint: z.object({
    projectId: z.string().uuid(),
  }),
  get_project_sprints: z.object({
    limit: z.number().optional().default(20),
    projectId: z.string().uuid(),
  }),
};

module.exports = {
  sprintSchemas,
  sprintZodSchemas,
};
