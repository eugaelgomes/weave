import { AxiosInstance } from "axios";
import { McpPromptDefinition } from "../../../types/mcp";

/**
 * Creates the Notes prompt definitions bound to a specific API client.
 * Provides guided workflows for structured note creation.
 *
 * @param {AxiosInstance} apiClient - The session-scoped Axios client.
 * @returns {Record<string, McpPromptDefinition>} The notes prompt definition map.
 */
export const createNotesPrompts = (apiClient: AxiosInstance): Record<string, McpPromptDefinition> => ({
  create_structured_note: {
    name: "create_structured_note",
    description: "Guides the LLM to create a well-structured note with typed blocks (headings, paragraphs, todos) from a given topic.",
    arguments: [
      { name: "topic", description: "The subject or theme for the note.", required: true },
      { name: "projectId", description: "Optional project UUID to associate the note with.", required: false },
    ],
    handler: async (args) => {
      let projectContext = "";
      if (args.projectId) {
        try {
          const project = await apiClient.get(`/projects/${args.projectId}`);
          projectContext = `\nThis note should be created within the project "${project.data.name}" (ID: ${args.projectId}).`;
        } catch {
          // Project fetch failed; proceed without project context
        }
      }

      return {
        messages: [
          {
            role: "user" as const,
            content: {
              type: "text" as const,
              text: [
                `Create a well-structured note about: "${args.topic}".${projectContext}`,
                ``,
                `Use the create_note tool with the following block structure:`,
                `- A "heading" block (level 1) as the title`,
                `- "paragraph" blocks for descriptive sections`,
                `- "todo" blocks for any actionable items`,
                `- "blockquote" blocks for key takeaways or important quotes`,
                ``,
                `Make the content rich, actionable, and well-organized.`,
              ].join("\n"),
            },
          },
        ],
      };
    },
  },

  daily_standup: {
    name: "daily_standup",
    description: "Generates a daily standup report by pulling recent notes and project activity for the authenticated user.",
    arguments: [
      { name: "date", description: "The date to report on (ISO format, e.g. 2026-07-07). Defaults to today.", required: false },
    ],
    handler: async (args) => {
      const recentNotes = await apiClient.get("/notes", {
        params: { limit: 10, sortBy: "updatedAt", sortOrder: "desc" },
      });
      const projects = await apiClient.get("/projects");

      const context = {
        date: args.date || new Date().toISOString().split("T")[0],
        recentNotes: recentNotes.data,
        projects: projects.data,
      };

      return {
        messages: [
          {
            role: "user" as const,
            content: {
              type: "text" as const,
              text: [
                `Generate a concise daily standup report for ${context.date}.`,
                `Format it with three sections: "Done", "In Progress", and "Blockers".`,
                `Base your analysis on the following recent activity data:`,
                ``,
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
