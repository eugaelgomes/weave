import { z } from "zod";
import { apiClient, handleResponse } from "../api-methods";
import { API_ENDPOINTS } from "../api-methods";
import {
  NoteCommentAttachmentsResponseSchema,
  NoteCommentFileSchema,
  NoteCommentSchema,
  type NoteComment,
  type NoteCommentContent,
  type NoteCommentFile,
} from "./notes-comments.schema";

export type { NoteComment, NoteCommentContent, NoteCommentFile };

export interface CreateNoteCommentBody {
  content?: NoteCommentContent;
  files?: NoteCommentFile[];
  parent_id?: string | null;
}

export interface UpdateNoteCommentBody {
  content?: NoteCommentContent;
  files?: NoteCommentFile[];
}

export function buildCommentContentFromPlainText(text: string): NoteCommentContent {
  const trimmed = text.trim();
  return {
    blocks: [
      {
        properties: {},
        text: trimmed,
        type: "paragraph",
      },
    ],
    version: 1,
  };
}

export function getPlainTextFromCommentContent(content: unknown): string {
  if (!content || typeof content !== "object" || !("blocks" in content)) {
    return "";
  }
  const blocks = (content as NoteCommentContent).blocks;
  if (!Array.isArray(blocks)) {
    return "";
  }
  return blocks
    .map((b) => (typeof b?.text === "string" ? b.text : ""))
    .filter(Boolean)
    .join("\n")
    .trim();
}

export async function fetchNoteComments(noteId: string): Promise<NoteComment[]> {
  const response = await apiClient.get(API_ENDPOINTS.NOTES_COMMENTS(noteId));
  const raw = await handleResponse<unknown>(response);
  if (!Array.isArray(raw)) {
    return [];
  }
  return z.array(NoteCommentSchema).parse(raw);
}

export async function createNoteComment(
  noteId: string,
  body: CreateNoteCommentBody
): Promise<NoteComment> {
  const response = await apiClient.post(API_ENDPOINTS.NOTES_COMMENTS(noteId), {
    content: body.content,
    files: body.files ?? [],
    parent_id: body.parent_id ?? null,
  });
  const raw = await handleResponse<unknown>(response);
  return NoteCommentSchema.parse(raw);
}

export async function updateNoteComment(
  noteId: string,
  commentId: string,
  body: UpdateNoteCommentBody
): Promise<NoteComment> {
  const response = await apiClient.put(API_ENDPOINTS.NOTES_COMMENT_BY_ID(noteId, commentId), body);
  const raw = await handleResponse<unknown>(response);
  return NoteCommentSchema.parse(raw);
}

export async function deleteNoteComment(noteId: string, commentId: string): Promise<void> {
  const response = await apiClient.delete(API_ENDPOINTS.NOTES_COMMENT_BY_ID(noteId, commentId));
  await handleResponse<unknown>(response);
}

export async function uploadNoteCommentAttachments(
  noteId: string,
  files: File[]
): Promise<NoteCommentFile[]> {
  if (!files.length) {
    return [];
  }
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));
  const response = await apiClient.post(API_ENDPOINTS.NOTES_COMMENT_ATTACHMENTS(noteId), formData);
  const raw = await handleResponse<unknown>(response);
  if (Array.isArray(raw)) {
    return z.array(NoteCommentFileSchema).parse(raw);
  }
  const data = NoteCommentAttachmentsResponseSchema.parse(raw);
  return Array.isArray(data.files) ? data.files : [];
}
