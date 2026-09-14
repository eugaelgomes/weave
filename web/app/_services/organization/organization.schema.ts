import { z } from "zod";

/**
 * Workspace API responses are wrapped in varying envelope shapes; we validate
 * a generic JSON object at the HTTP boundary so downstream logic stays unchanged.
 */
export const WorkspaceJsonSchema = z.record(z.string(), z.unknown());
