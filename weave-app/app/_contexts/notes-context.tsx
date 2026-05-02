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
  type Note,
  type NoteProperties,
  type CreateNoteData,
  type UpdateNoteData,
  type Block,
  type CreateBlockData,
  type NoteDocumentNode,
  type NoteDocumentState,
  type ShareNoteData,
  type User as SearchUser,
} from "../_services/notes-service/notes-service";
import getStorageUrl from "@/app/_utils/get-storage-url";

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
    blockData: Partial<Block>
  ) => Promise<Block | null>;
  deleteBlock: (noteId: string, blockId: string) => Promise<boolean>;
  reorderBlocks: (
    noteId: string,
    blockPositions: Array<{ id: string; position: number }>
  ) => Promise<boolean>;

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

const createLocalBlockId = () => `doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const normalizeNodeId = (value: unknown, fallback: string): string => {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return fallback;
};

const withBlockNodeMeta = (
  node: NoteDocumentNode,
  block: Block & { children?: Block[] }
): NoteDocumentNode => ({
  ...node,
  id: block.id,
  order: Number.isFinite(block.position) ? block.position : 0,
});

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

const emptyDocument = (): NoteDocumentState => ({
  version: 1,
  document: {
    type: "doc",
    content: [{ type: "paragraph", content: [] }],
  },
});

const extractText = (content?: NoteDocumentNode[]): string => {
  if (!Array.isArray(content)) return "";
  return content
    .map((node) => {
      if (node.type === "text") return node.text || "";
      if (node.type === "hardBreak") return "\n";
      return extractText(node.content);
    })
    .join("")
    .trim();
};

const paragraphFromText = (text: string): NoteDocumentNode => ({
  type: "paragraph",
  content: text ? [{ type: "text", text }] : [],
});

const mapNodeToBlock = (
  node: NoteDocumentNode,
  noteId: string,
  position: number,
  level = 0,
  parentId: string | null = null,
  path = String(position)
): (Block & { children?: Block[] }) | null => {
  const nodeId = normalizeNodeId((node as NoteDocumentNode & { id?: unknown }).id, path);

  const base: Block & { children?: Block[] } = {
    id: nodeId,
    note_id: noteId,
    parent_id: parentId || undefined,
    position,
    properties: {},
    text: "",
    type: "paragraph",
    level,
    children: [],
  };

  switch (node.type) {
    case "heading":
      return {
        ...base,
        type: "heading",
        text: extractText(node.content),
        properties: { level: Number(node.attrs?.level) || 1 },
      };
    case "paragraph":
      return { ...base, type: "paragraph", text: extractText(node.content) };
    case "blockquote":
      return { ...base, type: "quote", text: extractText(node.content) };
    case "codeBlock":
      return { ...base, type: "code", text: extractText(node.content) };
    case "horizontalRule":
      return { ...base, type: "divider" };
    case "image":
      return {
        ...base,
        type: "image",
        text: typeof node.attrs?.src === "string" ? node.attrs.src : "",
        properties: {
          alt: typeof node.attrs?.alt === "string" ? node.attrs.alt : "",
          title: typeof node.attrs?.title === "string" ? node.attrs.title : "",
        },
      };
    case "table": {
      const lines = (node.content || []).map((row: NoteDocumentNode) => extractText(row.content));
      return { ...base, type: "table", text: lines.join("\n") };
    }
    case "taskList": {
      const listId = base.id;
      const children = (node.content || []).map((item: NoteDocumentNode, idx: number) => ({
        ...base,
        id: normalizeNodeId(
          (item as NoteDocumentNode & { id?: unknown }).id,
          `${path}.${idx}`
        ),
        type: "todo",
        text: extractText(item.content),
        done: item.attrs?.checked === true,
        level: level + 1,
        parent_id: listId,
        position: idx,
        children: [],
      }));
      return { ...base, type: "list", children };
    }
    case "bulletList":
    case "orderedList": {
      const listId = base.id;
      const children = (node.content || []).map((item: NoteDocumentNode, idx: number) => ({
        ...base,
        id: normalizeNodeId(
          (item as NoteDocumentNode & { id?: unknown }).id,
          `${path}.${idx}`
        ),
        type: "list",
        text: extractText(item.content),
        level: level + 1,
        parent_id: listId,
        position: idx,
        children: [],
      }));
      return {
        ...base,
        type: "list",
        properties: node.type === "orderedList" ? { ordered: true } : {},
        children,
      };
    }
    default:
      return { ...base, type: "paragraph", text: extractText(node.content) };
  }
};

const documentToBlocks = (
  noteDocument: NoteDocumentState | null | undefined,
  noteId: string
): (Block & { children?: Block[] })[] => {
  const content = noteDocument?.document?.content || emptyDocument().document.content;
  return content
    .map((node, index) => mapNodeToBlock(node, noteId, index, 0, null, String(index)))
    .filter((block): block is Block & { children?: Block[] } => Boolean(block));
};

const mapBlockToNode = (block: Block & { children?: Block[] }): NoteDocumentNode => {
  if (block.type === "heading") {
    return withBlockNodeMeta(
      {
      type: "heading",
      attrs: { level: Number(block.properties?.level) || 1 },
      content: block.text ? [{ type: "text", text: block.text }] : [],
      },
      block
    );
  }

  if (block.type === "code") {
    return withBlockNodeMeta(
      {
      type: "codeBlock",
      content: block.text ? [{ type: "text", text: block.text }] : [],
      },
      block
    );
  }

  if (block.type === "quote") {
    return withBlockNodeMeta(
      { type: "blockquote", content: [paragraphFromText(block.text)] },
      block
    );
  }

  if (block.type === "divider") {
    return withBlockNodeMeta({ type: "horizontalRule" }, block);
  }

  if (block.type === "image") {
    return withBlockNodeMeta(
      {
      type: "image",
      attrs: {
        src: block.text || "",
        alt: typeof block.properties?.alt === "string" ? block.properties.alt : "",
        title: typeof block.properties?.title === "string" ? block.properties.title : "",
      },
      },
      block
    );
  }

  if (block.type === "table") {
    const rows = (block.text || "")
      .split("\n")
      .map((line: string) =>
        line
          .split("|")
          .map((cell: string) => cell.trim())
          .filter(Boolean)
      )
      .filter((cells: string[]) => cells.length > 0);

    return withBlockNodeMeta(
      {
      type: "table",
      content: rows.map((cells: string[]) => ({
        type: "tableRow",
        content: cells.map((cell: string) => ({
          type: "tableCell",
          content: [paragraphFromText(cell)],
        })),
      })),
      },
      block
    );
  }

  if (block.type === "orderedList") {
    const lines = (block.text || "")
      .split("\n")
      .map((line: string) => line.trim())
      .filter(Boolean);

    return withBlockNodeMeta(
      {
      type: "orderedList",
      content: (lines.length > 0 ? lines : [""]).map((line: string) => ({
        type: "listItem",
        content: [paragraphFromText(line)],
      })),
      },
      block
    );
  }

  if (block.type === "todo") {
    return withBlockNodeMeta(
      {
      type: "taskItem",
      attrs: { checked: block.done === true },
      content: [paragraphFromText(block.text)],
      },
      block
    );
  }

  if (block.type === "list") {
    const children = Array.isArray(block.children) ? block.children : [];
    if (children.some((child: Block) => child.type === "todo")) {
      return withBlockNodeMeta(
        {
        type: "taskList",
        content: children.map((child: Block) => mapBlockToNode({ ...child, type: "todo" })),
        },
        block
      );
    }

    if (children.length > 0) {
      return withBlockNodeMeta(
        {
        type: block.properties?.ordered ? "orderedList" : "bulletList",
        content: children.map((child: Block) =>
          withBlockNodeMeta(
            {
              type: "listItem",
              content: [paragraphFromText(child.text || "")],
            },
            child
          )
        ),
        },
        block
      );
    }
  }

  return withBlockNodeMeta(paragraphFromText(block.text || ""), block);
};

const blocksToDocument = (blocks: (Block & { children?: Block[] })[]): NoteDocumentState => ({
  version: 1,
  document: {
    type: "doc",
    content:
      blocks.length > 0
        ? blocks.map((block) => mapBlockToNode(block))
        : emptyDocument().document.content,
  },
});

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

  // Função auxiliar para extrair preview
  const extractPreview = (content: string | undefined): string => {
    if (!content) return "";
    // Remove tags HTML/Markdown e pega os primeiros 150 caracteres
    const cleanContent = content.replace(/<[^>]*>/g, "").replace(/[#*_`]/g, "");
    return cleanContent.length > 150 ? cleanContent.substring(0, 150) + "..." : cleanContent;
  };

  const toOverview = useCallback(
    (note: Note): NoteOverview => ({
      id: note.id,
      title: note.title || "Tarefa sem título",
      properties: note.properties || {},
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
    }),
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
        blocks:
          note.document?.document
            ? documentToBlocks(note.document, note.id)
            : Array.isArray(note.blocks)
              ? note.blocks
              : [],
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
          blocks:
            noteData.document?.document
              ? documentToBlocks(noteData.document, noteId)
              : Array.isArray(noteData.blocks)
                ? noteData.blocks
                : [],
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
          setNotes((prev) => prev.map((n) => (n.id === noteId ? { ...n, ...updatedNote } : n)));
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

  const resolveNoteDocument = useCallback(
    async (noteId: string): Promise<NoteDocumentState | null> => {
      const localNote = notes.find((n) => n.id === noteId);
      if (localNote?.document) return localNote.document;
      const fetched = await fetchNoteByIdService(noteId);
      return fetched.document || null;
    },
    [notes]
  );

  const applyLocalDocumentUpdate = useCallback(
    (noteId: string, document: NoteDocumentState, updatedAt?: string) => {
      const nextUpdatedAt = updatedAt || new Date().toISOString();
      setNotes((prev) =>
        prev.map((note) =>
          note.id === noteId
            ? {
                ...note,
                document,
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
        const document = await resolveNoteDocument(noteId);
        return documentToBlocks(document, noteId);
      } catch (err: unknown) {
        console.error("Erro ao buscar blocos:", err);
        throw err;
      }
    },
    [resolveNoteDocument, user?.id]
  );

  const createBlock = useCallback(
    async (noteId: string, blockData: CreateBlockData): Promise<Block | null> => {
      if (!user?.id) return null;

      try {
        const document = await resolveNoteDocument(noteId);
        const blocks = documentToBlocks(document, noteId);
        const newBlock: Block & { children?: Block[] } = {
          id: createLocalBlockId(),
          type: blockData.type || "paragraph",
          text: blockData.text || "",
          properties: blockData.properties || {},
          done: blockData.done,
          parent_id: blockData.parentId,
          position: blockData.position ?? blocks.length,
          note_id: noteId,
          children: [],
        };

        if (blockData.parentId) {
          const addChild = (
            items: (Block & { children?: Block[] })[]
          ): (Block & { children?: Block[] })[] =>
            items.map((item) => {
              if (item.id === blockData.parentId) {
                const children = Array.isArray(item.children) ? item.children : [];
                return { ...item, children: [...children, newBlock] };
              }
              return {
                ...item,
                children: Array.isArray(item.children) ? addChild(item.children) : [],
              };
            });
          const nextBlocks = addChild(blocks);
          const nextDocument = blocksToDocument(nextBlocks);
          const updatedNote = await updateNoteService(noteId, { document: nextDocument });
          const persistedDocument = updatedNote?.document || nextDocument;
          const persistedBlocks = documentToBlocks(persistedDocument, noteId);
          const persistedParent = findBlockById(persistedBlocks, blockData.parentId);
          const persistedChildren = Array.isArray(persistedParent?.children)
            ? persistedParent.children
            : [];
          const persistedPosition =
            typeof blockData.position === "number" ? blockData.position : persistedChildren.length - 1;
          const persistedCreated =
            persistedChildren[Math.min(Math.max(persistedPosition, 0), persistedChildren.length - 1)];
          applyLocalDocumentUpdate(
            noteId,
            persistedDocument,
            updatedNote?.updated_at
          );
          return persistedCreated || null;
        } else {
          const nextBlocks = [...blocks, newBlock].map((block, index) => ({
            ...block,
            position: index,
          }));
          const nextDocument = blocksToDocument(nextBlocks);
          const updatedNote = await updateNoteService(noteId, { document: nextDocument });
          const persistedDocument = updatedNote?.document || nextDocument;
          const persistedBlocks = documentToBlocks(persistedDocument, noteId);
          const persistedPosition = blockData.position ?? blocks.length;
          const persistedCreated =
            persistedBlocks[Math.min(Math.max(persistedPosition, 0), persistedBlocks.length - 1)];
          applyLocalDocumentUpdate(
            noteId,
            persistedDocument,
            updatedNote?.updated_at
          );
          return persistedCreated || null;
        }
      } catch (err: unknown) {
        console.error("Erro ao criar bloco:", err);
        throw err;
      }
    },
    [applyLocalDocumentUpdate, resolveNoteDocument, user?.id]
  );

  const updateBlock = useCallback(
    async (noteId: string, blockId: string, blockData: Partial<Block>): Promise<Block | null> => {
      if (!user?.id) return null;

      try {
        const document = await resolveNoteDocument(noteId);
        const blocks = documentToBlocks(document, noteId);
        let updated: Block | null = null;

        const patchBlock = (
          items: (Block & { children?: Block[] })[]
        ): (Block & { children?: Block[] })[] =>
          items.map((item) => {
            if (item.id === blockId) {
              updated = { ...item, ...blockData };
              return { ...item, ...blockData };
            }
            return {
              ...item,
              children: Array.isArray(item.children) ? patchBlock(item.children) : [],
            };
          });

        const nextBlocks = patchBlock(blocks);
        if (!updated) {
          return null;
        }
        const nextDocument = blocksToDocument(nextBlocks);
        const updatedNote = await updateNoteService(noteId, { document: nextDocument });
        applyLocalDocumentUpdate(
          noteId,
          updatedNote?.document || nextDocument,
          updatedNote?.updated_at
        );
        return updated;
      } catch (err: unknown) {
        console.error("Erro ao atualizar bloco:", err);
        throw err;
      }
    },
    [applyLocalDocumentUpdate, resolveNoteDocument, user?.id]
  );

  const deleteBlock = useCallback(
    async (noteId: string, blockId: string): Promise<boolean> => {
      if (!user?.id) return false;

      try {
        const document = await resolveNoteDocument(noteId);
        const blocks = documentToBlocks(document, noteId);

        const removeBlock = (
          items: (Block & { children?: Block[] })[]
        ): (Block & { children?: Block[] })[] =>
          items
            .filter((item) => item.id !== blockId)
            .map((item) => ({
              ...item,
              children: Array.isArray(item.children) ? removeBlock(item.children) : [],
            }));

        const nextBlocks = removeBlock(blocks).map((block: Block, index: number) => ({
          ...block,
          position: index,
        }));
        const nextDocument = blocksToDocument(nextBlocks);
        const updatedNote = await updateNoteService(noteId, { document: nextDocument });
        applyLocalDocumentUpdate(
          noteId,
          updatedNote?.document || nextDocument,
          updatedNote?.updated_at
        );
        return true;
      } catch (err: unknown) {
        console.error("Erro ao deletar bloco:", err);
        throw err;
      }
    },
    [applyLocalDocumentUpdate, resolveNoteDocument, user?.id]
  );

  const reorderBlocks = useCallback(
    async (
      noteId: string,
      blockPositions: Array<{ id: string; position: number }>
    ): Promise<boolean> => {
      if (!user?.id) return false;

      try {
        const document = await resolveNoteDocument(noteId);
        const blocks = documentToBlocks(document, noteId);
        const blockMap = new Map(blocks.map((block) => [block.id, block]));
        const reordered = blockPositions
          .map(({ id }, index) => {
            const block = blockMap.get(id);
            if (!block) return null;
            return { ...block, position: index };
          })
          .filter((block): block is Block & { children?: Block[] } => Boolean(block));
        if (reordered.length > 0) {
          const nextDocument = blocksToDocument(reordered);
          const updatedNote = await updateNoteService(noteId, { document: nextDocument });
          applyLocalDocumentUpdate(
            noteId,
            updatedNote?.document || nextDocument,
            updatedNote?.updated_at
          );
        }
        return true;
      } catch (err: unknown) {
        console.error("Erro ao reordenar blocos:", err);
        throw err;
      }
    },
    [applyLocalDocumentUpdate, resolveNoteDocument, user?.id]
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
    shareNote,
    searchUsers,
    getCollaborators,
    removeCollaborator,
    recuseCollaboration,
  };

  return <NotesContext.Provider value={value}>{children}</NotesContext.Provider>;
}

export default NotesContext;
