import { z } from "zod";

export interface McpToolDefinition<T extends z.ZodTypeAny = z.ZodTypeAny> {
  name: string;
  description: string;
  schema: T;
  handler: (args: z.infer<T>) => Promise<any>;
}

export interface McpResourceTemplate {
  uriTemplate: string;
  name: string;
  description: string;
  mimeType: string;
}

export interface McpResourceDefinition {
  templates: McpResourceTemplate[];
  readHandler: (uri: string) => Promise<any>;
}

export interface McpPromptArgument {
  name: string;
  description?: string;
  required?: boolean;
}

export interface McpPromptDefinition {
  name: string;
  description?: string;
  arguments?: McpPromptArgument[];
  handler: (args: Record<string, string>) => Promise<any>;
}
