import { AxiosInstance } from "axios";
import { McpPromptDefinition } from "../../../types/mcp";

/**
 * Creates the Projects prompt definitions bound to a specific API client.
 * These prompts provide guided workflows for common project-level operations.
 *
 * @param {AxiosInstance} apiClient - The session-scoped Axios client.
 * @returns {Record<string, McpPromptDefinition>} The projects prompt definition map.
 */
export const createProjectsPrompts = (apiClient: AxiosInstance): Record<string, McpPromptDefinition> => ({
  summarize_project: {
    name: "summarize_project",
    description: "Generates a comprehensive summary of a project including its stages, notes, and pending tasks.",
    arguments: [
      { name: "projectId", description: "The UUID of the project to summarize.", required: true },
    ],
    handler: async (args) => {
      const project = await apiClient.get(`/projects/${args.projectId}`);
      const stages = await apiClient.get(`/projects/${args.projectId}/stages`);
      const notes = await apiClient.get(`/projects/${args.projectId}/notes`);

      const context = {
        project: project.data,
        stages: stages.data,
        notes: notes.data,
      };

      return {
        messages: [
          {
            role: "user" as const,
            content: {
              type: "text" as const,
              text: [
                `Please provide a comprehensive summary of the following project.`,
                `Include: current status, stage breakdown, number of notes per stage, and any actionable insights.`,
                ``,
                `Project Data:`,
                `\`\`\`json`,
                JSON.stringify(context, null, 2),
                `\`\`\``,
              ].join("\n"),
            },
          },
        ],
      };
    },
  },

  review_open_tasks: {
    name: "review_open_tasks",
    description: "Lists and analyzes high-priority open tasks within a project, helping identify blockers and next actions.",
    arguments: [
      { name: "projectId", description: "The UUID of the project to review tasks for.", required: true },
    ],
    handler: async (args) => {
      const project = await apiClient.get(`/projects/${args.projectId}`);
      const notes = await apiClient.get(`/projects/${args.projectId}/notes`);

      const context = {
        project: project.data,
        notes: notes.data,
      };

      return {
        messages: [
          {
            role: "user" as const,
            content: {
              type: "text" as const,
              text: [
                `Review the open tasks and notes in this project.`,
                `Prioritize by urgency and identify any blockers or items that need immediate attention.`,
                `Suggest concrete next actions for each high-priority item.`,
                ``,
                `Project Data:`,
                `\`\`\`json`,
                JSON.stringify(context, null, 2),
                `\`\`\``,
              ].join("\n"),
            },
          },
        ],
      };
    },
  },
});
