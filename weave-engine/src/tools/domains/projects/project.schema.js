/**
 * @module weave-engine/modules/core/tools/schemas/project.schema
 * @description JSON Schema definition for the project.schema AI tool.
 */
const { z } = require("zod");

const listMyProjectsZodSchema = z.object({
  limit: z
    .number()
    .optional()
    .describe("Max number of projects to return (default: 10)."),
});

const getProjectDetailsZodSchema = z.object({
  projectId: z
    .string()
    .describe("The UUID of the project to retrieve details for."),
});

const createProjectZodSchema = z.object({
  title: z.string().describe("The name/title of the project."),
  description: z
    .string()
    .optional()
    .describe("A short description of the project."),
  status: z
    .enum(["OPEN", "IN_PROGRESS", "PAUSED", "COMPLETED", "ARCHIVED"])
    .optional()
    .describe(
      "The initial status of the project (must be one of: 'OPEN', 'IN_PROGRESS', 'PAUSED', 'COMPLETED', 'ARCHIVED'). Defaults to 'OPEN'."
    ),
});

const schemas = [
  {
    name: "list_my_projects",
    description:
      "Retrieves a list of all active projects the user is working on or has access to. (Important: Translate any enum values returned by the database to the user's language.)",
    parameters: listMyProjectsZodSchema.toJSONSchema(),
  },
  {
    name: "get_project_details",
    description:
      "Retrieves detailed information about a specific project. This tool returns the project's properties and metadata, all of its stages, all associated tasks (notes), all attached project files, and the complete list of team collaborators/members. (Important: Translate any enum values returned by the database to the user's language.)",
    parameters: getProjectDetailsZodSchema.toJSONSchema(),
  },
  {
    name: "create_project",
    description:
      "Creates a new project. Use this tool when the user explicitly asks to create a new project. You must collect at least the title before creating. You can also define a description and a status. (Important: Translate any enum values returned by the database to the user's language.)",
    parameters: createProjectZodSchema.toJSONSchema(),
  },
];

const zodSchemas = {
  list_my_projects: listMyProjectsZodSchema,
  get_project_details: getProjectDetailsZodSchema,
  create_project: createProjectZodSchema,
};

module.exports = { schemas, zodSchemas };
