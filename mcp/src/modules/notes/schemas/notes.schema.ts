import { z } from "zod";

export const listNotesSchema = z.object({
  page: z.number().int().min(1).optional(),
  limit: z.number().int().min(1).max(100).optional(),
  search: z.string().optional(),
  status: z.string().optional(),
});

export const getNoteSchema = z.object({
  noteId: z.string().uuid("Invalid note ID format"),
});

export const createNoteToolSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().optional(),
  projectId: z.string().uuid().optional(),
});

export const createCompleteNoteSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().optional(),
  blocks: z.array(z.any()).optional(),
  projectId: z.string().uuid().optional(),
});

export const updateNoteSchema = z.object({
  noteId: z.string().uuid("Invalid note ID format"),
  title: z.string().optional(),
  content: z.string().optional(),
  status: z.string().optional(),
});

export const deleteNoteSchema = z.object({
  noteId: z.string().uuid("Invalid note ID format"),
});

export const getNotesStatsSchema = z.object({});

export const getNoteResourceSchema = z.object({
  noteId: z.string().uuid("Invalid note ID format"),
});

export type CreateNoteToolInput = z.infer<typeof createNoteToolSchema>;
export type ListNotesInput = z.infer<typeof listNotesSchema>;
export type GetNoteInput = z.infer<typeof getNoteSchema>;
export type CreateCompleteNoteInput = z.infer<typeof createCompleteNoteSchema>;
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;
export type DeleteNoteInput = z.infer<typeof deleteNoteSchema>;
export type GetNotesStatsInput = z.infer<typeof getNotesStatsSchema>;
