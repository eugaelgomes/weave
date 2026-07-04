import { z } from "zod";

export const listCommentsSchema = z.object({
  noteId: z.string().uuid("Invalid note ID format"),
});

export const createCommentSchema = z.object({
  noteId: z.string().uuid("Invalid note ID format"),
  content: z.string().min(1, "Comment content is required"),
});

export const updateCommentSchema = z.object({
  noteId: z.string().uuid("Invalid note ID format"),
  commentId: z.string().uuid("Invalid comment ID format"),
  content: z.string().min(1, "Comment content is required"),
});

export const deleteCommentSchema = z.object({
  noteId: z.string().uuid("Invalid note ID format"),
  commentId: z.string().uuid("Invalid comment ID format"),
});

export type ListCommentsInput = z.infer<typeof listCommentsSchema>;
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>;
export type DeleteCommentInput = z.infer<typeof deleteCommentSchema>;
