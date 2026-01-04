// services/notes-service/NotesService.ts
import { apiClient, handleResponse } from "../api-methods";
import { API_ENDPOINTS } from "../api-routes";

//
// --- Types ---
//
export interface Note {
  id: string;
  title: string;
  description?: string;
  tags?: string[];
  status?: string;
  created_at: string;
  updated_at: string;
  lastModified?: string;
  preview?: string;
  done?: boolean;
  user_id?: string;
  collaborators?: unknown[];
  created_by?: string;
  email?: string;
  avatar_url?: string;
  name?: string;
  blocks?: Block[];
  project_id?: string;
  project_name?: string;
  access?: {
    isOwner: boolean;
    isCollaborator: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canShare: boolean;
  };
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

//
// --- Notes API ---
//

// =================== BUSCAR NOTAS ===================
// Função ORIGINAL (sem parâmetros) - mantida para compatibilidade
export async function fetchNotes(params: FetchNotesParams = {}): Promise<NotesResponse | Note[]> {
  // CONSTRUÇÃO DA URL COM QUERY PARAMETERS
  let url = API_ENDPOINTS.NOTES;
  const searchParams = new URLSearchParams();

  // PARÂMETROS DE PAGINAÇÃO
  if (params.page) {
    searchParams.append("page", params.page.toString());
  }
  if (params.limit) {
    searchParams.append("limit", params.limit.toString());
  }

  // PARÂMETROS DE BUSCA E FILTROS
  if (params.search) {
    searchParams.append("search", params.search);
  }
  if (params.tags) {
    const tagsStr = Array.isArray(params.tags) ? params.tags.join(",") : params.tags;
    searchParams.append("tags", tagsStr);
  }

  // PARÂMETROS DE ORDENAÇÃO
  if (params.sortBy) {
    searchParams.append("sortBy", params.sortBy);
  }
  if (params.sortOrder) {
    searchParams.append("sortOrder", params.sortOrder);
  }

  // MONTA A URL FINAL: /notes?page=1&limit=10&search=teste...
  if (searchParams.toString()) {
    url += `?${searchParams.toString()}`;
  }

  const response = await apiClient.get(url);
  const data = await handleResponse<NotesResponse | { notes: Note[] }>(response);

  // RETORNO PADRONIZADO para suportar paginação
  // Se o backend já retorna com paginação, use isso:
  if ("notes" in data && "pagination" in data) {
    return data as NotesResponse;
  }

  // Se o backend ainda não tem paginação, simula localmente:
  if (params.page || params.limit) {
    const notes = "notes" in data ? data.notes : (data as Note[]);
    return {
      notes,
      pagination: {
        currentPage: Number(params.page) || 1,
        limit: Number(params.limit) || notes.length,
        total: notes.length,
        totalPages: Math.ceil(notes.length / (Number(params.limit) || notes.length)),
        hasMore: false, // Como não há paginação real ainda, sempre false
      },
    };
  }

  // Retorno original para compatibilidade
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
  const response = await apiClient.put(API_ENDPOINTS.NOTES_BY_ID(noteId), {
    title: noteData.title,
    description: noteData.description,
    tags: noteData.tags,
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
  const url = `/users/search?q=${encodeURIComponent(searchTerm)}`;
  const response = await apiClient.get(url);
  const data = await handleResponse<{ users?: User[]; data?: User[] } | User[]>(response);

  if (Array.isArray(data)) {
    return data;
  }

  return data.users || data.data || [];
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
