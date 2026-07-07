import { AxiosInstance } from "axios";
import {
  McpToolDefinition,
  McpResourceTemplate,
  McpModuleFactory,
  McpModuleDefinition,
} from "../types/mcp";
import { createNotesModule } from "./notes/notes.module";
import { createUsersModule } from "./users/users.module";
import { createCommentsModule } from "./comments/comments.module";
import { createProjectsModule } from "./projects/projects.module";
import { createTaskPrioritiesModule } from "./task-priorities/task-priorities.module";
import { createCalendarModule } from "./calendar/calendar.module";
import { createSlackModule } from "./slack/slack.module";
import { createWebhooksModule } from "./webhooks/webhooks.module";
import { createWeaveAiModule } from "./weave-ai/weave-ai.module";

/**
 * Ordered list of all module factory functions.
 * Each factory receives an AxiosInstance and returns its tools, resources, and prompts.
 */
const moduleFactories: McpModuleFactory[] = [
  createNotesModule,
  createUsersModule,
  createCommentsModule,
  createProjectsModule,
  createTaskPrioritiesModule,
  createCalendarModule,
  createSlackModule,
  createWebhooksModule,
  createWeaveAiModule,
];

/**
 * Aggregated MCP registry containing all tools, resources, and prompts
 * registered across all modules for a given session.
 */
export interface McpRegistry {
  tools: Record<string, McpToolDefinition>;
  resources: {
    templates: McpResourceTemplate[];
    readHandlers: ((uri: string) => Promise<any>)[];
  };
  prompts: Record<string, any>;
}

/**
 * Builds a complete MCP registry by invoking each module factory with the
 * provided API client. This enables per-session dependency injection for
 * multi-tenant SSE deployments.
 *
 * @param {AxiosInstance} apiClient - The Axios client scoped to the current session's auth token.
 * @returns {McpRegistry} The fully assembled registry with all tools, resources, and prompts.
 */
export function buildRegistry(apiClient: AxiosInstance): McpRegistry {
  const registry: McpRegistry = {
    tools: {},
    resources: { templates: [], readHandlers: [] },
    prompts: {},
  };

  for (const factory of moduleFactories) {
    const mod: McpModuleDefinition = factory(apiClient);

    if (mod.tools) {
      Object.assign(registry.tools, mod.tools);
    }
    if (mod.prompts) {
      Object.assign(registry.prompts, mod.prompts);
    }
    if (mod.resources) {
      if (mod.resources.templates) {
        registry.resources.templates.push(...mod.resources.templates);
      }
      if (mod.resources.readHandler) {
        registry.resources.readHandlers.push(mod.resources.readHandler);
      }
    }
  }

  return registry;
}
