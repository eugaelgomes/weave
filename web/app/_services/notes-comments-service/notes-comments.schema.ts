import { z } from "zod";

export const NoteCommentFileSchema = z.object({
  id: z.string(),
  name: z.string(),
  path: z.string(),
  type: z.string(),
});

export const NoteCommentBlockSchema = z.object({
  type: z.string(),
  text: z.string(),
  properties: z.record(z.string(), z.unknown()).optional(),
});

export const NoteCommentContentSchema = z.object({
  version: z.number(),
  blocks: z.array(NoteCommentBlockSchema),
});

export const NoteCommentSchema = z.object({
  id: z.string(),
  note_id: z.string(),
  user_id: z.string(),
  workspace_id: z.string().nullable().optional(),
  content: NoteCommentContentSchema,
  files: z.array(NoteCommentFileSchema),
  parent_id: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string().nullable().optional(),
  user_name: z.string().optional(),
  user_username: z.string().optional(),
  user_avatar_url: z.string().nullable().optional(),
});

export const NoteCommentAttachmentsResponseSchema = z.object({
  files: z.array(NoteCommentFileSchema).optional(),
});

export type NoteCommentFile = z.infer<typeof NoteCommentFileSchema>;
export type NoteCommentContent = z.infer<typeof NoteCommentContentSchema>;
export type NoteComment = z.infer<typeof NoteCommentSchema>;
