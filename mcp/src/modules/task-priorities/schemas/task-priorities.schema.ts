import { z } from "zod";

export const listTaskPrioritiesSchema = z.object({
  projectId: z.string().uuid(),
});

export const createTaskPrioritySchema = z.object({
  projectId: z.string().uuid(),
  name: z.string(),
  color: z.string().optional(),
  level: z.number().optional(),
});

export const updateTaskPrioritySchema = z.object({
  projectId: z.string().uuid(),
  priorityId: z.string().uuid(),
  name: z.string().optional(),
  color: z.string().optional(),
  level: z.number().optional(),
});

export const deleteTaskPrioritySchema = z.object({
  projectId: z.string().uuid(),
  priorityId: z.string().uuid(),
});
