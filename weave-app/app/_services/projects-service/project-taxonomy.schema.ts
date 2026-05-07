import { z } from "zod";

export const ProjectTagSchema = z
  .object({
    id: z.string(),
    project_id: z.string().nullable().optional(),
    org_id: z.string().nullable().optional(),
    name: z.string(),
    color_hex: z.string().nullable(),
    user_id: z.string().optional(),
    created_at: z.string(),
    updated_at: z.string(),
    deleted: z.boolean().optional(),
    deleted_at: z.string().nullable().optional(),
    deleted_by: z.string().nullable().optional(),
  })
  .passthrough();

export const TaskPrioritySchema = z
  .object({
    id: z.string(),
    project_id: z.string().nullable().optional(),
    org_id: z.string().nullable().optional(),
    name: z.string(),
    color_hex: z.string().nullable(),
    sort_order: z.number(),
    user_id: z.string().optional(),
    created_at: z.string(),
    updated_at: z.string(),
    deleted: z.boolean().optional(),
    deleted_at: z.string().nullable().optional(),
    deleted_by: z.string().nullable().optional(),
  })
  .passthrough();

export type ProjectTag = z.infer<typeof ProjectTagSchema>;
export type TaskPriority = z.infer<typeof TaskPrioritySchema>;
