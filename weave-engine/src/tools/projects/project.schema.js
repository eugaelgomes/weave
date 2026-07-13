/**
 * @module weave-engine/modules/core/tools/schemas/project.schema
 * @description JSON Schema definition for the project AI tools.
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
  description: z
    .string()
    .optional()
    .describe("A short description of the project."),
  methodology: z
    .enum(["KANBAN", "SCRUM"])
    .optional()
    .describe("Methodology. Defaults to 'KANBAN'."),
  status: z
    .enum(["OPEN", "IN_PROGRESS", "PAUSED", "COMPLETED", "ARCHIVED"])
    .optional()
    .describe("Initial status. Defaults to 'OPEN'."),
  title: z.string().describe("The name/title of the project."),
  visibility: z
    .enum(["PRIVATE", "ORG_WIDE", "PUBLIC"])
    .optional()
    .describe("Visibility. Defaults to 'PRIVATE'."),
});

const updateProjectZodSchema = z.object({
  description: z.string().optional(),
  methodology: z.enum(["KANBAN", "SCRUM"]).optional(),
  projectId: z.string().describe("The UUID of the project."),
  status: z
    .enum(["OPEN", "IN_PROGRESS", "PAUSED", "COMPLETED", "ARCHIVED"])
    .optional(),
  title: z.string().optional(),
  visibility: z.enum(["PRIVATE", "ORG_WIDE", "PUBLIC"]).optional(),
});

const getProjectStagesZodSchema = z.object({
  projectId: z.string().describe("The UUID of the project."),
});

const createProjectStageZodSchema = z.object({
  name: z.string().describe("The name of the new stage (e.g. 'To Do')."),
  position: z.number().optional().describe("The position/order of the stage."),
  projectId: z.string().describe("The UUID of the project."),
});

const updateProjectStageZodSchema = z.object({
  name: z.string().optional(),
  position: z.number().optional(),
  projectId: z.string().describe("The UUID of the project."),
  stageId: z.string().describe("The UUID of the stage to update."),
});

const getProjectCollaboratorsZodSchema = z.object({
  projectId: z.string().describe("The UUID of the project."),
});

const addProjectCollaboratorZodSchema = z.object({
  projectId: z.string().describe("The UUID of the project."),
  role: z
    .enum(["PROJECT_MANAGER", "CONTRIBUTOR", "COMMENTER", "VIEWER"])
    .describe("The role to assign."),
  userId: z.string().describe("The UUID of the user to invite."),
});

const updateProjectCollaboratorZodSchema = z.object({
  collaboratorUserId: z
    .string()
    .describe("The UUID of the user whose role is being updated."),
  projectId: z.string().describe("The UUID of the project."),
  role: z
    .enum(["PROJECT_MANAGER", "CONTRIBUTOR", "COMMENTER", "VIEWER"])
    .describe("The new role."),
});

const removeProjectCollaboratorZodSchema = z.object({
  collaboratorUserId: z
    .string()
    .describe("The UUID of the user to remove from the project."),
  projectId: z.string().describe("The UUID of the project."),
});

const schemas = [
  {
    description:
      "Retrieves a list of all active projects the user is working on or has access to.",
    name: "list_my_projects",
    parameters: listMyProjectsZodSchema.toJSONSchema(),
  },
  {
    description:
      "Retrieves detailed information about a specific project, including its stages, tasks, and collaborators.",
    name: "get_project_details",
    parameters: getProjectDetailsZodSchema.toJSONSchema(),
  },
  {
    description:
      "Creates a new project. You must collect at least the title before creating.",
    name: "create_project",
    parameters: createProjectZodSchema.toJSONSchema(),
  },
  {
    description:
      "Updates an existing project's metadata like title, description, status, visibility, or methodology.",
    name: "update_project",
    parameters: updateProjectZodSchema.toJSONSchema(),
  },
  {
    description:
      "Lists all the stages/columns of a project (e.g., 'To Do', 'In Progress', 'Done').",
    name: "get_project_stages",
    parameters: getProjectStagesZodSchema.toJSONSchema(),
  },
  {
    description: "Creates a new stage/column in a project.",
    name: "create_project_stage",
    parameters: createProjectStageZodSchema.toJSONSchema(),
  },
  {
    description: "Updates a project stage's name or reorders its position.",
    name: "update_project_stage",
    parameters: updateProjectStageZodSchema.toJSONSchema(),
  },
  {
    description: "Lists all collaborators/members of a project.",
    name: "get_project_collaborators",
    parameters: getProjectCollaboratorsZodSchema.toJSONSchema(),
  },
  {
    description: "Adds a user to a project with a specific role.",
    name: "add_project_collaborator",
    parameters: addProjectCollaboratorZodSchema.toJSONSchema(),
  },
  {
    description: "Updates the role of an existing project collaborator.",
    name: "update_project_collaborator",
    parameters: updateProjectCollaboratorZodSchema.toJSONSchema(),
  },
  {
    description: "Removes a user from a project.",
    name: "remove_project_collaborator",
    parameters: removeProjectCollaboratorZodSchema.toJSONSchema(),
  },
];

const zodSchemas = {
  add_project_collaborator: addProjectCollaboratorZodSchema,
  create_project: createProjectZodSchema,
  create_project_stage: createProjectStageZodSchema,
  get_project_collaborators: getProjectCollaboratorsZodSchema,
  get_project_details: getProjectDetailsZodSchema,
  get_project_stages: getProjectStagesZodSchema,
  list_my_projects: listMyProjectsZodSchema,
  remove_project_collaborator: removeProjectCollaboratorZodSchema,
  update_project: updateProjectZodSchema,
  update_project_collaborator: updateProjectCollaboratorZodSchema,
  update_project_stage: updateProjectStageZodSchema,
};

module.exports = { schemas, zodSchemas };
