import { apiClient, handleResponse } from "../api-methods";
import { API_ENDPOINTS } from "../api-methods";
import type { NoteStatus } from "@/app/_utils/db-enums";
import { z } from "zod";

import {
  NoteSchema,
  NotesResponseSchema,
  NotesStatsResponseSchema,
  NoteDataResponseSchema,
  SearchUsersResponseSchema,
  CollaboratorsResponseSchema,
  NotesUserSchema,
  type Collaborator,
  type NoteProperties,
  type Tag,
  type TaskPriority,
  type Note,
  type Block,
  type NoteDocumentNode,
  type NoteDocumentState,
  type FetchNotesParams,
  type NotesResponse,
  type CreateNoteData,
  type UpdateNoteData,
  type CreateBlockData,
  type ShareNoteData,
  type NotesUser as User,
  type NotesStatsResponse,
} from "./notes.schema";

export type {
  Collaborator,
  NoteProperties,
  Tag,
  TaskPriority,
  Note,
  Block,
  NoteDocumentNode,
  NoteDocumentState,
  FetchNotesParams,
  NotesResponse,
  CreateNoteData,
  UpdateNoteData,
  CreateBlockData,
  ShareNoteData,
  User,
  NotesStatsResponse,
};

// =================== NOTES API ===================

export async function fetchNotes(params: FetchNotesParams = {}): Promise<NotesResponse | Note[]> {
  let url = API_ENDPOINTS.NOTES;
  const searchParams = new URLSearchParams();

  if (params.page) searchParams.append("page", params.page.toString());
  if (params.limit) searchParams.append("limit", params.limit.toString());
  if (params.search) searchParams.append("search", params.search);
  if (params.tags) {
    const tagsStr = Array.isArray(params.tags) ? params.tags.join(",") : params.tags;
    searchParams.append("tags", tagsStr);
  }
  if (params.sortBy) searchParams.append("sortBy", params.sortBy);
  if (params.sortOrder) searchParams.append("sortOrder", params.sortOrder);

  if (searchParams.toString()) {
    url += `?${searchParams.toString()}`;
  }

  const response = await apiClient.get(url);
  const rawData = await handleResponse<unknown>(response);

  if (rawData && typeof rawData === "object" && "notes" in rawData && "pagination" in rawData) {
    return NotesResponseSchema.parse(rawData);
  }

  const notesRaw = rawData && typeof rawData === "object" && "notes" in rawData ? (rawData as any).notes : rawData;
  const parsedNotes = z.array(NoteSchema).parse(notesRaw);

  if (params.page || params.limit) {
    return {
      notes: parsedNotes,
      pagination: {
        currentPage: Number(params.page) || 1,
        limit: Number(params.limit) || parsedNotes.length,
        total: parsedNotes.length,
        totalPages: Math.ceil(parsedNotes.length / (Number(params.limit) || parsedNotes.length || 1)),
        hasMore: false,
      },
    };
  }

  return parsedNotes;
}

export async function fetchNoteById(noteId: string): Promise<Note> {
  const response = await apiClient.get(API_ENDPOINTS.NOTES_BY_ID(noteId));
  const rawData = await handleResponse<unknown>(response);
  
  if (rawData && typeof rawData === "object" && "data" in rawData) {
    const parsed = NoteDataResponseSchema.parse(rawData);
    if (parsed.data) return parsed.data;
  }
  
  return NoteSchema.parse(rawData);
}

export async function createNote(noteData: CreateNoteData): Promise<Note> {
  const response = await apiClient.post(API_ENDPOINTS.NOTES, {
    title: noteData.title,
    description: noteData.description,
    tags: noteData.tags || [],
  });

  const rawData = await handleResponse<unknown>(response);
  return NoteSchema.parse(rawData);
}

export async function updateNote(noteId: string, noteData: UpdateNoteData): Promise<Note> {
  const hasFiles =
    noteData.icon || noteData.banner || (noteData.files && noteData.files.length > 0);

  if (hasFiles) {
    // Enviar como multipart/form-data quando há arquivos
    const formData = new FormData();

    if (noteData.title !== undefined) formData.append("title", noteData.title);
    if (noteData.description !== undefined) formData.append("description", noteData.description);
    if (noteData.tags !== undefined) formData.append("tags", JSON.stringify(noteData.tags));
    if (noteData.status !== undefined) formData.append("status", noteData.status);
    if (noteData.project_id !== undefined) formData.append("project_id", noteData.project_id ?? "");
    if (noteData.priority_id !== undefined)
      formData.append("priority_id", noteData.priority_id ?? "");
    if (noteData.due_date !== undefined) formData.append("due_date", noteData.due_date ?? "");
    if (noteData.properties !== undefined)
      formData.append("properties", JSON.stringify(noteData.properties));
    if (noteData.document !== undefined)
      formData.append("document", JSON.stringify(noteData.document));

    if (noteData.icon) formData.append("icon", noteData.icon);
    if (noteData.banner) formData.append("banner", noteData.banner);
    if (noteData.files) {
      noteData.files.forEach((file: any) => formData.append("files", file));
    }

    const response = await apiClient.put(API_ENDPOINTS.NOTES_BY_ID(noteId), formData);
    const rawData = await handleResponse<unknown>(response);
    return NoteSchema.parse(rawData);
  }

  // Enviar como JSON quando não há arquivos
  const response = await apiClient.put(API_ENDPOINTS.NOTES_BY_ID(noteId), {
    title: noteData.title,
    description: noteData.description,
    tags: noteData.tags,
    status: noteData.status,
    project_id: noteData.project_id,
    priority_id: noteData.priority_id,
    due_date: noteData.due_date,
    properties: noteData.properties,
    document: noteData.document,
  });

  const rawData = await handleResponse<unknown>(response);
  return NoteSchema.parse(rawData);
}

export async function deleteNote(noteId: string): Promise<boolean> {
  const response = await apiClient.delete(API_ENDPOINTS.NOTES_BY_ID(noteId));
  await handleResponse<void>(response);
  return true;
}

export async function deleteNotes(noteIds: string[]): Promise<boolean> {
  const response = await apiClient.delete(API_ENDPOINTS.NOTES, {
    body: JSON.stringify({ ids: noteIds }),
  });
  await handleResponse<void>(response);
  return true;
}

//
// --- Collaborators API ---
//

export async function shareNote(noteId: string, shareData: ShareNoteData): Promise<unknown> {
  const response = await apiClient.post(`${API_ENDPOINTS.NOTES_BY_ID(noteId)}/collaborators`, {
    userId: shareData.userId,
  });

  return await handleResponse<unknown>(response);
}

export async function searchUsers(searchTerm: string): Promise<User[]> {
  if (!searchTerm || searchTerm.trim().length < 3) {
    return [];
  }

  const url = `/users/search?q=${encodeURIComponent(searchTerm.trim())}`;
  const response = await apiClient.get(url);
  const rawData = await handleResponse<unknown>(response);

  if (Array.isArray(rawData)) {
    return z.array(NotesUserSchema).parse(rawData);
  }

  const parsed = SearchUsersResponseSchema.parse(rawData);
  return parsed.search_users || parsed.users || parsed.data || [];
}

// ========================================
// FUNÇÕES ADICIONAIS DE COLABORADORES
// ========================================

export async function getCollaborators(noteId: string): Promise<User[]> {
  const response = await apiClient.get(`${API_ENDPOINTS.NOTES_BY_ID(noteId)}/collaborators`);
  const rawData = await handleResponse<unknown>(response);

  if (Array.isArray(rawData)) {
    return z.array(NotesUserSchema).parse(rawData);
  }

  const parsed = CollaboratorsResponseSchema.parse(rawData);
  return parsed.collaborators || parsed.data || [];
}

export async function removeCollaborator(noteId: string, collaboratorId: string): Promise<boolean> {
  const response = await apiClient.delete(
    `${API_ENDPOINTS.NOTES_BY_ID(noteId)}/collaborators/${collaboratorId}`
  );
  await handleResponse<void>(response);
  return true;
}

export async function recuseCollaboration(noteId: string): Promise<boolean> {
  const response = await apiClient.put(`${API_ENDPOINTS.NOTES_BY_ID(noteId)}/recuseCollaboration`);
  await handleResponse<void>(response);
  return true;
}

// ========================================
// FUNÇÃO PARA CRIAR NOTA COMPLETA
// ========================================

export async function createCompleteNote(noteData: CreateNoteData): Promise<Note> {
  const response = await apiClient.post(`${API_ENDPOINTS.NOTES}/complete`, noteData);
  const rawData = await handleResponse<unknown>(response);
  return NoteSchema.parse(rawData);
}

export async function exportNoteAsPDF(noteId: string): Promise<{ blob: Blob; fileName: string }> {
  const response = await apiClient.get(`${API_ENDPOINTS.NOTES_BY_ID(noteId)}/export/pdf`, {
    headers: {
      Accept: "application/pdf",
    },
  });

  if (!response.ok) {
    await handleResponse(response);
  }

  const blob = await response.blob();
  const contentDisposition = response.headers.get("content-disposition") || "";
  const fileNameMatch = contentDisposition.match(/filename\*?=(?:UTF-8''|")?([^\";]+)/i);
  const parsedName = fileNameMatch?.[1]
    ? decodeURIComponent(fileNameMatch[1].replace(/"/g, ""))
    : "";

  return {
    blob,
    fileName: parsedName || `tarefa-${noteId}.pdf`,
  };
}

// --- Notes Stats API ---

export async function fetchNotesStats(): Promise<NotesStatsResponse> {
  const response = await apiClient.get(API_ENDPOINTS.NOTES_STATS);
  const rawData = await handleResponse<unknown>(response);
  return NotesStatsResponseSchema.parse(rawData);
}
