import { McpToolDefinition, McpResourceDefinition, McpResourceTemplate } from "../types/mcp";
import notesModule from "./notes";
import usersModule from "./users";
import commentsModule from "./comments";
import projectsModule from "./projects";
import taskPrioritiesModule from "./task-priorities";
import calendarModule from "./calendar";
import slackModule from "./slack";
import webhooksModule from "./webhooks";
import weaveAiModule from "./weave-ai";

const allModules = [
  notesModule,
  usersModule,
  commentsModule,
  projectsModule,
  taskPrioritiesModule,
  calendarModule,
  slackModule,
  webhooksModule,
  weaveAiModule,
  // Future modules can be added here
];

export interface McpRegistry {
  tools: Record<string, McpToolDefinition>;
  resources: {
    templates: McpResourceTemplate[];
    readHandlers: ((uri: string) => Promise<any>)[];
  };
  prompts: Record<string, any>;
}

const registry: McpRegistry = {
  tools: {},
  resources: { templates: [], readHandlers: [] },
  prompts: {},
};

allModules.forEach((mod: any) => {
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
});

export default registry;
