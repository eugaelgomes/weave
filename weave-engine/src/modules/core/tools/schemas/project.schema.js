/**
 * @module weave-engine/modules/core/tools/schemas/project.schema
 * @description JSON Schema definition for the project.schema AI tool.
 */
const schemas = [
  {
    name: "list_my_projects",
    description:
      "Retrieves a list of all active projects the user is working on or has access to.",
    parameters: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "Max number of projects to return (default: 10).",
        },
      },
    },
  },
  {
    name: "get_project_details",
    description:
      "Retrieves detailed information about a specific project. This tool returns the project's properties and metadata, all of its stages, all associated tasks (notes), all attached project files, and the complete list of team collaborators/members.",
    parameters: {
      type: "object",
      properties: {
        projectId: {
          type: "string",
          description: "The UUID of the project to retrieve details for.",
        },
      },
      required: ["projectId"],
    },
  },
];

module.exports = { schemas };
