import { apiClient, handleResponse } from "../api-methods";
import { API_ENDPOINTS } from "../api-methods";

export interface NoteCommentFile {
  id: string;
  name: string;
  path: string;
  type: string;
}

export interface NoteCommentContent {
  version: number;
  blocks: Array<{
    type: string;
    text: string;
    properties?: Record<string, unknown>;
  }>;
}

export interface NoteComment {
  id: string;
  note_id: string;
  user_id: string;
  org_id?: string | null;
  content: NoteCommentContent;
  files: NoteCommentFile[];
  parent_id?: string | null;
  created_at: string;
  updated_at?: string | null;
  user_name?: string;
  user_username?: string;
  user_avatar_url?: string | null;
}

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
  const data = await handleResponse<NoteComment[]>(response);
  return Array.isArray(data) ? data : [];
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
  return await handleResponse<NoteComment>(response);
}

export async function updateNoteComment(
  noteId: string,
  commentId: string,
  body: UpdateNoteCommentBody
): Promise<NoteComment> {
  const response = await apiClient.put(API_ENDPOINTS.NOTES_COMMENT_BY_ID(noteId, commentId), body);
  return await handleResponse<NoteComment>(response);
}

export async function deleteNoteComment(noteId: string, commentId: string): Promise<void> {
  const response = await apiClient.delete(API_ENDPOINTS.NOTES_COMMENT_BY_ID(noteId, commentId));
  await handleResponse<void>(response);
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
  const data = await handleResponse<{ files?: NoteCommentFile[] }>(response);
  return Array.isArray(data.files) ? data.files : [];
}
