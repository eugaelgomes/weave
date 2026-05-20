"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useAuth } from "./auth-context";
import {
  fetchNotes as fetchNotesService,
  fetchNoteById as fetchNoteByIdService,
  createNote as createNoteService,
  createCompleteNote as createCompleteNoteService,
  exportNoteAsPDF as exportNoteAsPDFService,
  updateNote as updateNoteService,
  deleteNote as deleteNoteService,
  deleteNotes as deleteNotesService,
  shareNote as shareNoteService,
  searchUsers as searchUsersService,
  getCollaborators as getCollaboratorsService,
  removeCollaborator as removeCollaboratorService,
  recuseCollaboration as recuseCollaborationService,
  fetchNotesStats as fetchNotesStatsService,
  fetchNoteBlocks,
  putNoteBlocksSync,
  createNoteBlock,
  updateNoteBlock,
  deleteNoteBlock,
  reorderNoteBlocks,
  type Note,
  type NoteProperties,
  type CreateNoteData,
  type UpdateNoteData,
  type Block,
  type CreateBlockData,
  type ShareNoteData,
  type User as SearchUser,
} from "../_services/notes-service/notes-service";
import getStorageUrl from "@/app/_utils/get-storage-url";
import { plainTextPreview } from "@/app/_utils/note-text-preview";

export type {
  Note,
  Block,
  UpdateNoteData,
  User as SearchUser,
} from "../_services/notes-service/notes-service";

// Tipos específicos do contexto
export interface NoteOverview {
  id: string;
  title: string;
  properties: NoteProperties;
  tags: string[];
  lastModified: string;
  preview: string;
  status: string;
  collaboratorsCount: number;
  collaborators: unknown[];
  created_at: string;
  updated_at: string;
  owner_name?: string;
  owner_avatar_url?: string;
  /** ISO due date (top-level API); fallback: properties.due_date when present. */
  due_date?: string | null;
  priority_id?: string | null;
  priority_name?: string | null;
  priority_color?: string | null;
  project_id?: string | null;
  project_name?: string | null;
  stage_id?: string | null;
  stage_name?: string | null;
  parent_id?: string | null;
  organization_id?: string | null;
  organization_name?: string | null;
  organization_logo_url?: string | null;
  resolved_tags?: { id: string; name: string; color: string }[];
  /** Task-level done flag when API sends it (list may omit). */
  done?: boolean;
}

export interface NotesStats {
  totalNotes: number;
  totalTags: number;
  statusDistribution: Record<string, number>;
  mostUsedTags: Array<{ tag: string; count: number }>;
}

export interface NotesContextType {
  // Estado
  notes: Note[];
  notesOverview: NoteOverview[];
  loading: boolean;
  error: string | null;
  lastFetch: Date | null;
  refreshInterval: number;

  // Funções de tarefas
  fetchNotes: () => Promise<void>;
  refreshNotes: () => Promise<void>;
  getNoteById: (noteId: string) => Promise<Note | null>;
  createNote: (noteData: CreateNoteData) => Promise<Note | null>;
  createCompleteNote: (noteData: CreateNoteData) => Promise<Note | null>;
  updateNote: (noteId: string, noteData: UpdateNoteData) => Promise<Note | null>;
  deleteNote: (noteId: string) => Promise<boolean>;
  deleteNotes: (noteIds: string[]) => Promise<boolean>;
  exportNoteAsPDF: (noteId: string) => Promise<{ blob: Blob; fileName: string } | null>;

  // Funções de dados derivados
  getRecentNotes: () => NoteOverview[];
  getNotesByTag: (tag: string) => NoteOverview[];
  getNotesStats: () => NotesStats;

  // Funções de blocos
  fetchBlocks: (noteId: string) => Promise<Block[]>;
  createBlock: (noteId: string, blockData: CreateBlockData) => Promise<Block | null>;
  updateBlock: (
    noteId: string,
    blockId: string,
    blockData: Partial<Block> & { expectedVersion?: number }
  ) => Promise<Block | null>;
  deleteBlock: (noteId: string, blockId: string) => Promise<boolean>;
  reorderBlocks: (
    noteId: string,
    blockPositions: Array<{ id: string; position: number }>,
    parentId?: string | null
  ) => Promise<boolean>;
  putNoteBlocksSync: (
    noteId: string,
    blocks: unknown[],
    baseRevision?: number
  ) => Promise<{ blocks: Block[]; revision?: number | null }>;

  // Funções de colaboração
  shareNote: (noteId: string, collaboratorData: ShareNoteData) => Promise<unknown>;
  searchUsers: (searchTerm: string) => Promise<SearchUser[]>;
  getCollaborators: (noteId: string) => Promise<SearchUser[]>;
  removeCollaborator: (noteId: string, collaboratorId: string) => Promise<boolean>;
  recuseCollaboration: (noteId: string) => Promise<boolean>;
}

const NotesContext = createContext<NotesContextType | undefined>(undefined);

export function useNotes(): NotesContextType {
  const context = useContext(NotesContext);
  if (!context) {
    throw new Error("useNotes deve ser usado dentro de um NotesProvider");
  }
  return context;
}

const findBlockById = (
  blocks: (Block & { children?: Block[] })[],
  blockId: string
): (Block & { children?: Block[] }) | null => {
  for (const block of blocks) {
    if (block.id === blockId) return block;
    if (Array.isArray(block.children) && block.children.length > 0) {
      const nested = findBlockById(block.children, blockId);
      if (nested) return nested;
    }
  }
  return null;
};

const mergeBlockInTree = (
  blocks: (Block & { children?: Block[] })[],
  blockId: string,
  patch: Partial<Block>
): (Block & { children?: Block[] })[] => {
  return blocks.map((block) => {
    if (block.id === blockId) {
      return {
        ...block,
        ...patch,
      };
    }
    if (Array.isArray(block.children) && block.children.length > 0) {
      return {
        ...block,
        children: mergeBlockInTree(block.children, blockId, patch),
      };
    }
    return block;
  });
};

export function NotesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  // Estado
  const [notes, setNotes] = useState<Note[]>([]);
  const [notesOverview, setNotesOverview] = useState<NoteOverview[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);
  const [refreshInterval] = useState<number>(10 * 60 * 1000); // 10 minutos
  const [notesStats, setNotesStats] = useState<NotesStats>({
    totalNotes: 0,
    totalTags: 0,
    statusDistribution: {},
    mostUsedTags: [],
  });

  const extractPreview = (content: string | undefined): string =>
    plainTextPreview(content, 150);

  /**
   * Mirrors list payload from GET notes:
   * `weave-api/src/modules/notes/controllers/notes-read.controller.js` (due_date, priority_*, associated_project.stage_*).
   */
  const toOverview = useCallback(
    (note: Note): NoteOverview => {
      const assoc = note.associated_project;
      const props = (note.properties ?? {}) as NoteProperties;
      return {
        id: note.id,
        title: note.title || "Tarefa sem título",
        properties: props,
        tags: note.tags || [],
        lastModified: note.updated_at || note.created_at,
        preview: extractPreview(note.description || undefined),
        status: note.status || "sem_status",
        collaboratorsCount: Array.isArray(note.collaborators) ? note.collaborators.length : 0,
        collaborators: Array.isArray(note.collaborators) ? note.collaborators : [],
        created_at: note.created_at,
        updated_at: note.updated_at,
        owner_name:
          note.author?.name || note.author?.username || note.author?.email || note.name || note.email || undefined,
        owner_avatar_url: getStorageUrl(note.author?.avatar_url || note.avatar_url || ""),
        due_date: note.due_date ?? props.due_date ?? null,
        priority_id: note.priority_id ?? null,
        priority_name: note.priority_name ?? null,
        priority_color: note.priority_color ?? null,
        project_id: assoc?.id ?? note.project_id ?? null,
        project_name: assoc?.name ?? note.project_name ?? null,
        stage_id: assoc?.stage_id ?? null,
        stage_name: assoc?.stage_name ?? null,
        parent_id: note.parent_id ?? null,
        organization_id: note.associated_organization?.id ?? null,
        organization_name: note.associated_organization?.name ?? null,
        organization_logo_url: getStorageUrl(note.associated_organization?.logo_url || ""),
        resolved_tags: Array.isArray(note.resolved_tags)
          ? note.resolved_tags.map((tag) => ({
              id: String(tag.id),
              name: tag.name,
              color: tag.color,
            }))
          : [],
        done: note.done === true,
      };
    },
    []
  );

  const insertOrUpdateNoteLocally = useCallback(
    (note: Note) => {
      setNotes((prev) => {
        const exists = prev.some((n) => n.id === note.id);
        const next = [note, ...prev.filter((n) => n.id !== note.id)];
        if (!exists) {
          setNotesStats((current) => ({
            ...current,
            totalNotes: current.totalNotes + 1,
          }));
        }
        return next;
      });

      const overview = toOverview(note);
      setNotesOverview((prev) => [overview, ...prev.filter((n) => n.id !== note.id)]);
      setLastFetch(new Date());
    },
    [toOverview]
  );

  // 1. BUSCAR NOTAS (READ)
  const fetchNotes = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    setError(null);

    try {
      const notesData = await fetchNotesService();

      // Se retornar NotesResponse (com paginação), usar notes; senão usar direct array
      const notesRaw = Array.isArray(notesData) ? notesData : notesData.notes;
      const notes = notesRaw.map((note) => ({
        ...note,
        blocks: Array.isArray(note.blocks) ? note.blocks : [],
      }));

      setNotes(notes);

      // Versão resumida para overview/carrossel
      const overview: NoteOverview[] = notes.map((note: Note) => toOverview(note));

      setNotesOverview(overview);
      setLastFetch(new Date());
      // Buscar estatísticas no backend e popular o estado
      try {
        const statsData = await fetchNotesStatsService();

        // Normalize backend response to ensure arrays/objects exist
        setNotesStats({
          totalNotes: Number(statsData?.totalNotes) || 0,
          totalTags: Number(statsData?.totalTags) || 0,
          statusDistribution: statsData?.statusDistribution || {},
          mostUsedTags: Array.isArray(statsData?.mostUsedTags) ? statsData.mostUsedTags : [],
        });
      } catch (err) {
        console.error("Erro ao obter stats do backend:", err);
        // Define valores padrão em caso de erro
        setNotesStats({
          totalNotes: 0,
          totalTags: 0,
          statusDistribution: {},
          mostUsedTags: [],
        });
      }
    } catch (err: unknown) {
      console.error("Erro ao buscar tarefas:", err);
      setError(err instanceof Error ? err.message : "Erro ao buscar tarefas");
    } finally {
      setLoading(false);
    }
  }, [user?.id, toOverview]);

  // 1.0.1. REFRESH MANUAL DE NOTAS
  const refreshNotes = useCallback(async () => {
    await fetchNotes();
  }, [fetchNotes]);

  // 1.1. BUSCAR NOTA POR ID
  const getNoteById = useCallback(
    async (noteId: string): Promise<Note | null> => {
      if (!user?.id || !noteId) return null;

      try {
        const noteData = await fetchNoteByIdService(noteId);
        return {
          ...noteData,
          blocks: Array.isArray(noteData.blocks) ? noteData.blocks : [],
        };
      } catch (err: unknown) {
        console.error("Erro ao buscar tarefa:", err);
        throw err;
      }
    },
    [user?.id]
  );

  // 2. CRIAR NOTA (CREATE)
  const createNote = useCallback(
    async (noteData: CreateNoteData): Promise<Note | null> => {
      if (!user?.id) return null;

      setError(null);

      try {
        const newNote = await createNoteService(noteData);
        insertOrUpdateNoteLocally(newNote);
        return newNote;
      } catch (err: unknown) {
        console.error("Erro ao criar tarefa:", err);
        setError(err instanceof Error ? err.message : "Erro ao criar tarefa");
        throw err; // Propaga o erro para ser tratado na UI
      }
    },
    [user?.id, insertOrUpdateNoteLocally]
  );

  // 2.1. CRIAR NOTA COMPLETA (CREATE COMPLETE)
  const createCompleteNote = useCallback(
    async (noteData: CreateNoteData): Promise<Note | null> => {
      if (!user?.id) return null;

      setError(null);

      try {
        const newNote = await createCompleteNoteService(noteData);
        insertOrUpdateNoteLocally(newNote);
        return newNote;
      } catch (err: unknown) {
        console.error("Erro ao criar tarefa completa:", err);
        setError(err instanceof Error ? err.message : "Erro ao criar tarefa completa");
        return null;
      }
    },
    [user?.id, insertOrUpdateNoteLocally]
  );

  // 3. ATUALIZAR NOTA (UPDATE)
  const updateNote = useCallback(
    async (noteId: string, noteData: UpdateNoteData): Promise<Note | null> => {
      if (!user?.id) return null;

      setError(null);

      try {
        const updatedNote = await updateNoteService(noteId, noteData);

        // Atualizar a lista local sem re-fetch (evita flash/refresh)
        if (updatedNote) {
          setNotes((prev) =>
            prev.map((n) =>
              n.id === noteId
                ? {
                    ...n,
                    ...updatedNote,
                    blocks: Array.isArray(updatedNote.blocks)
                      ? updatedNote.blocks
                      : n.blocks,
                  }
                : n
            )
          );
          setNotesOverview((prev) =>
            prev.map((n) =>
              n.id === noteId
                ? {
                    ...n,
                    title: updatedNote.title || n.title,
                    tags: updatedNote.tags || n.tags,
                    properties: updatedNote.properties || n.properties,
                    updated_at: updatedNote.updated_at || n.updated_at,
                    lastModified: updatedNote.updated_at || n.lastModified,
                    collaborators: Array.isArray(updatedNote.collaborators)
                      ? updatedNote.collaborators
                      : n.collaborators,
                    collaboratorsCount: Array.isArray(updatedNote.collaborators)
                      ? updatedNote.collaborators.length
                      : n.collaboratorsCount,
                  }
                : n
            )
          );
        }

        return updatedNote;
      } catch (err: unknown) {
        console.error("Erro ao atualizar tarefa:", err);
        setError(err instanceof Error ? err.message : "Erro ao atualizar tarefa");
        return null;
      }
    },
    [user?.id]
  );

  // 4. DELETAR NOTA (DELETE)
  const deleteNote = useCallback(
    async (noteId: string): Promise<boolean> => {
      if (!user?.id) return false;

      setLoading(true);
      setError(null);

      try {
        await deleteNoteService(noteId);
        await fetchNotes(); // Atualiza a lista após a exclusão
        return true;
      } catch (err: unknown) {
        console.error("Erro ao deletar tarefa:", err);
        setError(err instanceof Error ? err.message : "Erro ao deletar tarefa");
        return false;
      } finally {
        setLoading(false);
      }
    },
    [user?.id, fetchNotes]
  );

  const deleteNotes = useCallback(
    async (noteIds: string[]): Promise<boolean> => {
      if (!user?.id || noteIds.length === 0) return false;

      setLoading(true);
      setError(null);

      try {
        await deleteNotesService(noteIds);
        await fetchNotes();
        return true;
      } catch (err: unknown) {
        console.error("Erro ao deletar tarefas:", err);
        setError(err instanceof Error ? err.message : "Erro ao deletar tarefas");
        return false;
      } finally {
        setLoading(false);
      }
    },
    [user?.id, fetchNotes]
  );

  const exportNoteAsPDF = useCallback(
    async (noteId: string): Promise<{ blob: Blob; fileName: string } | null> => {
      if (!user?.id || !noteId) return null;

      setError(null);
      try {
        return await exportNoteAsPDFService(noteId);
      } catch (err: unknown) {
        console.error("Erro ao exportar tarefa:", err);
        setError(err instanceof Error ? err.message : "Erro ao exportar tarefa");
        throw err;
      }
    },
    [user?.id]
  );

  // --- DADOS DERIVADOS ---

  const getRecentNotes = useCallback((): NoteOverview[] => {
    return notesOverview
      .sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime())
      .slice(0, 5);
  }, [notesOverview]);

  const getNotesByTag = useCallback(
    (tag: string): NoteOverview[] => {
      if (!tag) return notesOverview;
      return notesOverview.filter((note) =>
        note.tags.some((noteTag) => noteTag.toLowerCase().includes(tag.toLowerCase()))
      );
    },
    [notesOverview]
  );

  const getNotesStats = useCallback((): NotesStats => {
    return notesStats;
  }, [notesStats]);

  const applyLocalBlocksUpdate = useCallback(
    (noteId: string, blocks: Block[], updatedAt?: string) => {
      const nextUpdatedAt = updatedAt || new Date().toISOString();
      setNotes((prev) =>
        prev.map((note) =>
          note.id === noteId
            ? {
                ...note,
                blocks,
                updated_at: nextUpdatedAt,
                lastModified: nextUpdatedAt,
              }
            : note
        )
      );
      setNotesOverview((prev) =>
        prev.map((note) =>
          note.id === noteId
            ? {
                ...note,
                updated_at: nextUpdatedAt,
                lastModified: nextUpdatedAt,
              }
            : note
        )
      );
    },
    []
  );

  // --- FUNÇÕES DE BLOCOS ---

  const fetchBlocks = useCallback(
    async (noteId: string): Promise<Block[]> => {
      if (!user?.id) return [];

      try {
        const tree = await fetchNoteBlocks(noteId);
        applyLocalBlocksUpdate(noteId, tree);
        return tree;
      } catch (err: unknown) {
        console.error("Erro ao buscar blocos:", err);
        throw err;
      }
    },
    [applyLocalBlocksUpdate, user?.id]
  );

  const createBlock = useCallback(
    async (noteId: string, blockData: CreateBlockData): Promise<Block | null> => {
      if (!user?.id) return null;

      try {
        const created = await createNoteBlock(noteId, {
          ...blockData,
          type: blockData.type || "paragraph",
        });
        const tree = await fetchNoteBlocks(noteId);
        applyLocalBlocksUpdate(noteId, tree);
        return (
          findBlockById(tree as (Block & { children?: Block[] })[], created.id) || created
        );
      } catch (err: unknown) {
        console.error("Erro ao criar bloco:", err);
        throw err;
      }
    },
    [applyLocalBlocksUpdate, user?.id]
  );

  const updateBlock = useCallback(
    async (
      noteId: string,
      blockId: string,
      blockData: Partial<Block> & { expectedVersion?: number }
    ): Promise<Block | null> => {
      if (!user?.id) return null;

      try {
        const updated = await updateNoteBlock(noteId, blockId, blockData);
        const currentNote = notes.find((storedNote) => storedNote.id === noteId);
        if (currentNote?.blocks) {
          applyLocalBlocksUpdate(noteId, mergeBlockInTree(currentNote.blocks, blockId, updated));
        }
        return updated;
      } catch (err: unknown) {
        console.error("Erro ao atualizar bloco:", err);
        throw err;
      }
    },
    [applyLocalBlocksUpdate, notes, user?.id]
  );

  const deleteBlock = useCallback(
    async (noteId: string, blockId: string): Promise<boolean> => {
      if (!user?.id) return false;

      try {
        await deleteNoteBlock(noteId, blockId);
        const tree = await fetchNoteBlocks(noteId);
        applyLocalBlocksUpdate(noteId, tree);
        return true;
      } catch (err: unknown) {
        console.error("Erro ao deletar bloco:", err);
        throw err;
      }
    },
    [applyLocalBlocksUpdate, user?.id]
  );

  const reorderBlocks = useCallback(
    async (
      noteId: string,
      blockPositions: Array<{ id: string; position: number }>,
      parentId: string | null = null
    ): Promise<boolean> => {
      if (!user?.id) return false;

      try {
        await reorderNoteBlocks(noteId, blockPositions, parentId);
        const tree = await fetchNoteBlocks(noteId);
        applyLocalBlocksUpdate(noteId, tree);
        return true;
      } catch (err: unknown) {
        console.error("Erro ao reordenar blocos:", err);
        throw err;
      }
    },
    [applyLocalBlocksUpdate, user?.id]
  );

  const putNoteBlocksSyncCtx = useCallback(
    async (
      noteId: string,
      blocks: unknown[],
      baseRevision?: number
    ): Promise<{ blocks: Block[]; revision?: number | null }> => {
      if (!user?.id) return { blocks: [], revision: null };
      try {
        const saved = await putNoteBlocksSync(noteId, blocks, baseRevision);
        // refresh local tree to keep UI consistent
        applyLocalBlocksUpdate(noteId, saved.blocks as (Block & { children?: Block[] })[]);
        return saved;
      } catch (err: unknown) {
        console.error("Erro ao sincronizar blocos:", err);
        throw err;
      }
    },
    [applyLocalBlocksUpdate, user?.id]
  );

  // --- FUNÇÕES DE COLABORAÇÃO ---

  const shareNote = useCallback(
    async (noteId: string, collaboratorData: ShareNoteData) => {
      if (!user?.id) return null;

      try {
        const sharedNote = await shareNoteService(noteId, collaboratorData);
        // Atualizar a lista de tarefas para refletir a mudança
        await fetchNotes();
        return sharedNote;
      } catch (err: unknown) {
        console.error("Erro ao compartilhar tarefa:", err);
        throw err;
      }
    },
    [user?.id, fetchNotes]
  );

  const searchUsers = useCallback(
    async (searchTerm: string): Promise<SearchUser[]> => {
      if (!user?.id) return [];

      try {
        const users = await searchUsersService(searchTerm);
        return users;
      } catch (err: unknown) {
        console.error("Erro ao buscar usuários:", err);
        throw err;
      }
    },
    [user?.id]
  );

  const getCollaborators = useCallback(
    async (noteId: string): Promise<SearchUser[]> => {
      if (!user?.id) return [];

      try {
        const collaborators = await getCollaboratorsService(noteId);
        return collaborators;
      } catch (err: unknown) {
        console.error("Erro ao buscar colaboradores:", err);
        throw err;
      }
    },
    [user?.id]
  );

  const removeCollaborator = useCallback(
    async (noteId: string, collaboratorId: string): Promise<boolean> => {
      if (!user?.id) return false;

      try {
        await removeCollaboratorService(noteId, collaboratorId);
        // Atualizar a lista de tarefas para refletir a mudança
        await fetchNotes();
        return true;
      } catch (err: unknown) {
        console.error("Erro ao remover colaborador:", err);
        throw err;
      }
    },
    [user?.id, fetchNotes]
  );

  const recuseCollaboration = useCallback(
    async (noteId: string): Promise<boolean> => {
      if (!user?.id) return false;

      try {
        await recuseCollaborationService(noteId);
        // Atualizar a lista de tarefas para refletir a mudança
        await fetchNotes();
        return true;
      } catch (err: unknown) {
        console.error("Erro ao recusar colaboração:", err);
        throw err;
      }
    },
    [user?.id, fetchNotes]
  );

  // Efeito para buscar dados inicialmente e configurar polling
  useEffect(() => {
    if (!user?.id) return;

    // Busca inicial apenas se não houver dados em cache
    if (notes.length === 0) {
      fetchNotes();
    }

    // Configurar polling automático
    const intervalId = setInterval(() => {
      fetchNotes();
    }, refreshInterval);

    // Cleanup
    return () => {
      clearInterval(intervalId);
    };
  }, [user?.id, refreshInterval, fetchNotes, notes.length]);

  const value: NotesContextType = {
    notes,
    notesOverview,
    loading,
    error,
    lastFetch,
    refreshInterval,
    fetchNotes,
    refreshNotes,
    getNoteById,
    createNote,
    createCompleteNote,
    updateNote,
    deleteNote,
    deleteNotes,
    exportNoteAsPDF,
    getRecentNotes,
    getNotesByTag,
    getNotesStats,
    fetchBlocks,
    createBlock,
    updateBlock,
    deleteBlock,
    reorderBlocks,
    putNoteBlocksSync: putNoteBlocksSyncCtx,
    shareNote,
    searchUsers,
    getCollaborators,
    removeCollaborator,
    recuseCollaboration,
  };

  return <NotesContext.Provider value={value}>{children}</NotesContext.Provider>;
}

export default NotesContext;
