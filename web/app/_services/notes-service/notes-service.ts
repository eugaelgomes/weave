import { apiClient, handleResponse } from "../api-methods";
import { API_ENDPOINTS } from "../api-methods";
import { type CollaboratorObject } from "@/app/_utils/collaborators";

// =================== TYPES / INTERFACES ===================

export type Collaborator = string | CollaboratorObject;

export interface NoteProperties {
  icon?: {
    path: string;
    name: string;
    type: string;
  };
  urls?: string[];
  color?: string;
  files?: Array<{
    id: string;
    path: string;
    name: string;
    type: string;
  }>;
  banner?: {
    path: string;
    name: string;
    type: string;
  };
  relations?: string[];
  priority?: string;
  due_date?: string;
}

export interface Tag {
  id: string;
  org_id: string;
  name: string;
  color: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted: boolean;
  deleted_at?: string;
  deleted_by?: string;
}

export interface TaskPriority {
  id: string;
  org_id: string;
  name: string;
  color: string;
  level: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted: boolean;
  deleted_at?: string;
  deleted_by?: string;
}

export interface Note {
  id: string;
  title: string;
  description?: string;
  properties?: NoteProperties;
  tags?: string[];
  priority_id?: string | null;
  priority_name?: string | null;
  priority_color?: string | null;
  due_date?: string | null;
  assigned_to?: string | null;
  deleted_by?: string | null;
  deleted?: boolean;
  status?: string;
  created_at: string;
  updated_at: string;
  lastModified?: string;
  preview?: string;
  done?: boolean;
  user_id?: string;
  collaborators?: (Collaborator | unknown)[]; // Atualizado com o tipo correto
  created_by?: string;
  email?: string;
  avatar_url?: string;
  name?: string;
  blocks?: Block[];
  project_id?: string;
  project_name?: string;
  author?: {
    id: string;
    name: string;
    username: string;
    email: string;
    avatar_url: string | null;
  };
  access?: {
    isOwner: boolean;
    isCollaborator: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canShare: boolean;
  };
  associated_project?: {
    id: string;
    name: string;
    stage_id?: string | null;
    stage_name?: string | null;
  } | null;
  associated_organization?: {
    id: string;
    name: string;
    unique_name?: string;
    logo_url?: string | null;
  } | null;
  // Propriedades unificadas do componente de UI
  owner_name?: string;
  owner_avatar_url?: string;
}

export interface Block {
  id: string;
  type: string;
  text: string;
  properties?: Record<string, unknown>;
  done?: boolean;
  parentId?: string;
  parent_id?: string;
  position: number;
  note_id: string;
  level?: number;
  created_at?: string;
  updated_at?: string;
  children?: Block[];
}

export interface FetchNotesParams {
  page?: number;
  limit?: number;
  search?: string;
  tags?: string | string[];
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface NotesResponse {
  notes: Note[];
  pagination?: {
    currentPage: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export interface CreateNoteData {
  title: string;
  description?: string;
  tags?: string[];
}

export interface UpdateNoteData {
  title?: string;
  description?: string;
  tags?: string[];
  status?: string;
  project_id?: string | null;
  priority_id?: string | null;
  due_date?: string | null;
  properties?: Partial<NoteProperties>;
  icon?: File;
  banner?: File;
  files?: File[];
}

export interface CreateBlockData {
  type: string;
  text?: string;
  properties?: Record<string, unknown>;
  done?: boolean;
  parentId?: string;
  position?: number;
}

export interface ShareNoteData {
  userId: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  name?: string;
  avatar_url?: string;
}

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
  const data = await handleResponse<NotesResponse | { notes: Note[] }>(response);

  if ("notes" in data && "pagination" in data) {
    return data as NotesResponse;
  }

  if (params.page || params.limit) {
    const notes = "notes" in data ? data.notes : (data as Note[]);
    return {
      notes,
      pagination: {
        currentPage: Number(params.page) || 1,
        limit: Number(params.limit) || notes.length,
        total: notes.length,
        totalPages: Math.ceil(notes.length / (Number(params.limit) || notes.length)),
        hasMore: false,
      },
    };
  }

  return "notes" in data ? data.notes : (data as Note[]);
}

export async function fetchNoteById(noteId: string): Promise<Note> {
  const response = await apiClient.get(API_ENDPOINTS.NOTES_BY_ID(noteId));
  const data = await handleResponse<{ data?: Note } | Note>(response);
  return "data" in data ? data.data! : (data as Note);
}

export async function createNote(noteData: CreateNoteData): Promise<Note> {
  const response = await apiClient.post(API_ENDPOINTS.NOTES, {
    title: noteData.title,
    description: noteData.description,
    tags: noteData.tags || [],
  });

  return await handleResponse<Note>(response);
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

    if (noteData.icon) formData.append("icon", noteData.icon);
    if (noteData.banner) formData.append("banner", noteData.banner);
    if (noteData.files) {
      noteData.files.forEach((file) => formData.append("files", file));
    }

    const response = await apiClient.put(API_ENDPOINTS.NOTES_BY_ID(noteId), formData);
    return await handleResponse<Note>(response);
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
  });

  return await handleResponse<Note>(response);
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
// --- Blocks API ---
//

export async function fetchBlocks(noteId: string): Promise<Block[]> {
  const response = await apiClient.get(`${API_ENDPOINTS.NOTES_BY_ID(noteId)}/blocks`);
  const data = await handleResponse<{ blocks?: Block[] } | Block[]>(response);

  return Array.isArray(data) ? data : data.blocks || [];
}

export async function createBlock(noteId: string, blockData: CreateBlockData): Promise<Block> {
  const response = await apiClient.post(`${API_ENDPOINTS.NOTES_BY_ID(noteId)}/blocks`, {
    type: blockData.type,
    text: blockData.text || "",
    properties: blockData.properties || {},
    done: blockData.done,
    parentId: blockData.parentId,
    position: blockData.position,
  });

  return await handleResponse<Block>(response);
}

export async function updateBlock(
  noteId: string,
  blockId: string,
  blockData: Partial<Block>
): Promise<Block> {
  const response = await apiClient.put(
    `${API_ENDPOINTS.NOTES_BY_ID(noteId)}/blocks/${blockId}`,
    blockData
  );
  return await handleResponse<Block>(response);
}

export async function deleteBlock(noteId: string, blockId: string): Promise<boolean> {
  const response = await apiClient.delete(`${API_ENDPOINTS.NOTES_BY_ID(noteId)}/blocks/${blockId}`);
  await handleResponse<void>(response);
  return true;
}

export async function reorderBlocks(
  noteId: string,
  blockPositions: Array<{ id: string; position: number }>
): Promise<boolean> {
  const response = await apiClient.put(`${API_ENDPOINTS.NOTES_BY_ID(noteId)}/blocks/reorder`, {
    blocks: blockPositions,
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
  const data = await handleResponse<
    { search_users?: User[]; users?: User[]; data?: User[] } | User[]
  >(response);

  if (Array.isArray(data)) {
    return data;
  }

  return data.search_users || data.users || data.data || [];
}

// ========================================
// FUNÇÕES ADICIONAIS DE COLABORADORES
// ========================================

export async function getCollaborators(noteId: string): Promise<User[]> {
  const response = await apiClient.get(`${API_ENDPOINTS.NOTES_BY_ID(noteId)}/collaborators`);
  const data = await handleResponse<{ collaborators?: User[]; data?: User[] } | User[]>(response);

  if (Array.isArray(data)) {
    return data;
  }

  return data.collaborators || data.data || [];
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
  return await handleResponse<Note>(response);
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
  const parsedName = fileNameMatch?.[1] ? decodeURIComponent(fileNameMatch[1].replace(/"/g, "")) : "";

  return {
    blob,
    fileName: parsedName || `nota-${noteId}.pdf`,
  };
}

// --- Notes Stats API ---
export interface NotesStatsResponse {
  totalNotes: number;
  totalTags: number;
  statusDistribution: Record<string, number>;
  mostUsedTags: Array<{ tag: string; count: number }>;
}

export async function fetchNotesStats(): Promise<NotesStatsResponse> {
  const response = await apiClient.get(API_ENDPOINTS.NOTES_STATS);
  const data = await handleResponse<NotesStatsResponse>(response);
  return data;
}
