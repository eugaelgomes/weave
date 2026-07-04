import { z } from "zod";

export const listProjectsSchema = z.object({});

export const getProjectSchema = z.object({
  projectId: z.string().uuid(),
});

export const createProjectSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
});

export const updateProjectSchema = z.object({
  projectId: z.string().uuid(),
  name: z.string().optional(),
  description: z.string().optional(),
});

export const deleteProjectSchema = z.object({
  projectId: z.string().uuid(),
});

export const getProjectStatsSchema = z.object({});

export const listProjectStagesSchema = z.object({
  projectId: z.string().uuid(),
});

export const updateProjectStageSchema = z.object({
  projectId: z.string().uuid(),
  stageId: z.string().uuid(),
  name: z.string().optional(),
  order: z.number().optional(),
});

export const deleteProjectStageSchema = z.object({
  projectId: z.string().uuid(),
  stageId: z.string().uuid(),
});

export const getProjectNotesSchema = z.object({
  projectId: z.string().uuid(),
});

export const updateNoteStageSchema = z.object({
  projectId: z.string().uuid(),
  noteId: z.string().uuid(),
  stageId: z.string().uuid().nullable(),
});

export const createTaskInStageSchema = z.object({
  projectId: z.string().uuid(),
  stageId: z.string().uuid(),
  title: z.string(),
  content: z.string().optional(),
});
