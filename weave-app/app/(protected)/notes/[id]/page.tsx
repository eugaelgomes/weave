"use client";

import React, { useState, useEffect } from "react";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Tag,
  Loader2,
  Plus,
  X,
  GripVertical,
  Save,
  Clock,
  Calendar,
  Link2,
  FileText,
  ImagePlus,
  Download,
  Link,
  Users,
  Kanban,
  FolderKanban,
  Flag,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
// CSS transform utility handled manually
import {
  useNotes,
  type Note,
  type Block,
  type UpdateNoteData,
  type SearchUser,
} from "@/app/_contexts/notes-context";
import {
  useProjects,
  type ProjectStage,
  type TaskPriority,
} from "@/app/_contexts/projects-context";
import { useNoteCommentsPanel } from "@/app/_contexts/note-comments-panel-context";
import { NoteCommentsProvider } from "@/app/_contexts/note-comments-context";
import {
  NoteCommentsSidebar,
  NoteCommentsSidebarTrigger,
} from "@/app/(protected)/notes/_components/note-comments-sidebar";
import { NoteDetailBody } from "@/app/(protected)/notes/[id]/_components/note-body";
import { NoteDetailHeader } from "@/app/(protected)/notes/[id]/_components/note-header";
import { NoteRelationsModal } from "@/app/(protected)/notes/[id]/_components/note-relations-modal";
import { NoteShareModal } from "@/app/(protected)/notes/[id]/_components/note-share-modal";
import { NoteTagsModal } from "@/app/(protected)/notes/[id]/_components/note-tags-modal";
import {
  getCollaboratorDisplayName,
  getCollaboratorAvatarUrl,
  getCollaboratorId,
} from "@/app/_utils/collaborators";
import { getTagColor } from "@/app/_utils/tag-colors";
import getStorageUrl from "@/app/_utils/get-storage-url";

// =================== COMPONENTE DE BLOCO SORTABLE ===================
interface BlockComponentProps {
  block: Block & { children?: Block[] };
  noteId: string;
  onUpdate: (blockId: string, data: Partial<Block>) => Promise<void>;
  onPasteLines?: (blockId: string, lines: string[]) => Promise<void>;
  onAddBlockAfter: (afterBlockId: string) => void;
  onBackspaceEmpty?: (blockId: string) => void;
  focusBlockId?: string | null;
  onFocused?: () => void;
  isDragging?: boolean;
}

const SortableBlockComponent: React.FC<BlockComponentProps> = ({
  block,
  noteId,
  onUpdate,
  onPasteLines,
  onAddBlockAfter,
  onBackspaceEmpty,
  focusBlockId,
  onFocused,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
  });

  const transformStyle = transform
    ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
    : undefined;

  return (
    <div
      ref={setNodeRef}
      className={`transition-transform ${isDragging ? "opacity-50" : "opacity-100"}`}
      // Inline styles são necessários para o dnd-kit funcionar
      style={{
        transform: transformStyle,
        transition,
      }}
    >
      <BlockComponent
        block={block}
        noteId={noteId}
        onUpdate={onUpdate}
        onPasteLines={onPasteLines}
        onAddBlockAfter={onAddBlockAfter}
        onBackspaceEmpty={onBackspaceEmpty}
        focusBlockId={focusBlockId}
        onFocused={onFocused}
        isDragging={isDragging}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
};

// =================== COMPONENTE DE BLOCO ===================
interface BlockInnerProps {
  block: Block & { children?: Block[] };
  noteId: string;
  onUpdate: (blockId: string, data: Partial<Block>) => Promise<void>;
  onPasteLines?: (blockId: string, lines: string[]) => Promise<void>;
  onAddBlockAfter: (afterBlockId: string) => void;
  onBackspaceEmpty?: (blockId: string) => void;
  focusBlockId?: string | null;
  onFocused?: () => void;
  isDragging?: boolean;
  dragHandleProps?: Record<string, unknown>;
}

const useAutoResize = (text: string) => {
  const ref = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [text]);

  return ref;
};

const BlockComponent: React.FC<BlockInnerProps> = ({
  block,
  noteId,
  onUpdate,
  onPasteLines,
  onAddBlockAfter,
  onBackspaceEmpty,
  focusBlockId,
  onFocused,
  isDragging,
  dragHandleProps,
}) => {
  const [localText, setLocalText] = useState(block.text || "");
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const textareaRef = useAutoResize(localText);

  // Auto-focus quando este bloco é o focusBlockId
  useEffect(() => {
    if (focusBlockId === block.id && textareaRef.current) {
      textareaRef.current.focus();
      setIsEditing(true);
      onFocused?.();
    }
  }, [focusBlockId, block.id, onFocused, textareaRef]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onAddBlockAfter(block.id);
    }

    if (e.key === "Backspace" && localText === "" && onBackspaceEmpty) {
      e.preventDefault();
      onBackspaceEmpty(block.id);
    }
  };

  // Sincroniza apenas quando block.text muda externamente (ex: do servidor)
  const prevBlockText = React.useRef(block.text);
  useEffect(() => {
    if (block.text !== prevBlockText.current) {
      prevBlockText.current = block.text;
      setLocalText(block.text || "");
    }
  }, [block.text]);

  const handleBlur = () => {
    setIsEditing(false);
  };

  const handleFocus = () => {
    setIsEditing(true);
  };

  // Foca no textarea quando entra em modo de edição
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isEditing, textareaRef]);

  // Auto-save com debounce mais conservador para evitar travar a digitação
  useEffect(() => {
    if (localText === block.text) return;

    const timeoutId = setTimeout(() => {
      onUpdate(block.id, { text: localText });
    }, 1800);

    return () => clearTimeout(timeoutId);
  }, [localText, block.id, block.text, onUpdate]);

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (!onPasteLines) return;

    const pastedText = e.clipboardData.getData("text");
    if (!pastedText || !pastedText.includes("\n")) return;

    e.preventDefault();

    const textarea = e.currentTarget;
    const selectionStart = textarea.selectionStart ?? localText.length;
    const selectionEnd = textarea.selectionEnd ?? localText.length;
    const beforeSelection = localText.slice(0, selectionStart);
    const afterSelection = localText.slice(selectionEnd);
    const merged = `${beforeSelection}${pastedText.replace(/\r\n/g, "\n")}${afterSelection}`;
    const [firstLine = "", ...nextLines] = merged.split("\n");

    setLocalText(firstLine);
    void onUpdate(block.id, { text: firstLine });

    if (nextLines.length > 0) {
      void onPasteLines(block.id, nextLines);
    }
  };

  const renderBlockContent = () => {
    return (
      <textarea
        ref={textareaRef}
        value={localText}
        onChange={(e) => setLocalText(e.target.value)}
        onBlur={handleBlur}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        className="w-full resize-none overflow-hidden bg-transparent text-[16px] leading-7 text-neutral-800 placeholder-neutral-400 outline-none dark:text-neutral-200 dark:placeholder-neutral-500"
        placeholder="Digite seu texto..."
        rows={1}
      />
    );
  };

  return (
    <div
      className={`group relative ${isDragging ? "z-50" : ""}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Handle de arrastar */}
      <div
        className={`absolute top-1.5 -left-7 flex flex-col gap-1 transition-opacity ${
          isHovered ? "opacity-100" : "opacity-0"
        }`}
      >
        <button
          {...dragHandleProps}
          className="hover:text-brand-primary-500 dark:hover:text-brand-primary-500 cursor-grab rounded p-0.5 text-neutral-300 hover:bg-neutral-100/80 active:cursor-grabbing dark:text-neutral-600 dark:hover:bg-neutral-800/70"
          title="Arrastar para reordenar"
        >
          <GripVertical size={14} />
        </button>
      </div>

      {/* Conteúdo do bloco */}
      <div
        className={`rounded-md px-1.5 py-0 ${
          isDragging
            ? "bg-neutral-100 shadow-lg ring-2 ring-yellow-500/20 dark:bg-neutral-800 dark:ring-yellow-500/40"
            : ""
        }`}
      >
        {renderBlockContent()}
      </div>

      {/* Blocos filhos (recursivo) */}
      {block.children && block.children.length > 0 && (
        <div className="mt-0.5 ml-6 border-l-2 border-neutral-200 pl-4 dark:border-neutral-800">
          {block.children.map((child) => (
            <BlockComponent
              key={child.id}
              block={child}
              noteId={noteId}
              onUpdate={onUpdate}
              onPasteLines={onPasteLines}
              onAddBlockAfter={onAddBlockAfter}
              onBackspaceEmpty={onBackspaceEmpty}
              focusBlockId={focusBlockId}
              onFocused={onFocused}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// =================== SKELETON ===================
const NoteDetailSkeleton = () => (
  <div className="flex min-h-0 flex-1 flex-col">
    {/* Header skeleton */}
    <div className="border-b border-neutral-200 bg-neutral-50 px-4 py-3 dark:border-neutral-800 dark:bg-neutral-950">
      <div className="mx-auto flex max-w-4xl items-center justify-between">
        <div className="h-8 w-8 animate-pulse rounded-md bg-neutral-200 dark:bg-neutral-800" />
        <div className="flex items-center gap-3">
          <div className="h-4 w-28 animate-pulse rounded-md bg-neutral-200 dark:bg-neutral-800" />
          <div className="flex gap-1.5">
            <div className="h-8 w-8 animate-pulse rounded-md bg-neutral-200 dark:bg-neutral-800" />
            <div className="h-8 w-8 animate-pulse rounded-md bg-neutral-200 dark:bg-neutral-800" />
          </div>
        </div>
      </div>
    </div>

    {/* Content skeleton */}
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <div className="mb-8">
        <div className="mb-2 h-9 w-2/3 animate-pulse rounded-md bg-neutral-200 dark:bg-neutral-800" />
      </div>
      <div className="mb-6 flex gap-3 border-b border-neutral-100 pb-5 dark:border-neutral-800">
        <div className="h-6 w-16 animate-pulse rounded-full bg-neutral-200 dark:bg-neutral-800" />
        <div className="h-6 w-20 animate-pulse rounded-full bg-neutral-200 dark:bg-neutral-800" />
      </div>
      <div className="space-y-4">
        <div className="h-12 w-full animate-pulse rounded-md bg-neutral-100 dark:bg-neutral-800/60" />
        <div className="h-20 w-full animate-pulse rounded-md bg-neutral-100 dark:bg-neutral-800/60" />
        <div className="h-12 w-4/5 animate-pulse rounded-md bg-neutral-100 dark:bg-neutral-800/60" />
        <div className="h-32 w-full animate-pulse rounded-md bg-neutral-100 dark:bg-neutral-800/60" />
        <div className="h-12 w-3/5 animate-pulse rounded-md bg-neutral-100 dark:bg-neutral-800/60" />
      </div>
    </div>
  </div>
);

const NoteDetail = () => {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  // Hook para gerenciar tarefas
  const {
    error,
    getNoteById,
    updateNote,
    deleteNote,
    shareNote,
    searchUsers,
    removeCollaborator,
    notesOverview,
    exportNoteAsPDF,
    createBlock,
    updateBlock: updateBlockService,
    deleteBlock: deleteBlockService,
    reorderBlocks: reorderBlocksService,
  } = useNotes();

  const {
    projects,
    refreshProjects,
    addNoteToProject,
    getProjectStages,
    updateProjectNoteStage,
    getTaskPriorities,
    getOrgTaskPriorities,
  } = useProjects();

  const [note, setNote] = useState<Note | null>(null);
  const [blocks, setBlocks] = useState<(Block & { children?: Block[] })[]>([]);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingDescription, setEditingDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [focusBlockId, setFocusBlockId] = useState<string | null>(null);
  const initialBlockCreated = React.useRef(false);
  const metadataDebounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const metadataSaveInFlightRef = React.useRef(false);
  const pendingMetadataRef = React.useRef<{
    description: string;
    title: string;
  } | null>(null);

  // Estados para modais e funcionalidades
  const [showShareModal, setShowShareModal] = useState(false);
  const { commentsPanelOpen: commentsSidebarOpen, setCommentsPanelOpen: setCommentsSidebarOpen } =
    useNoteCommentsPanel();

  const [showTagModal, setShowTagModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [newTag, setNewTag] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showAllTags, setShowAllTags] = useState(false);
  const [showAllCollabs, setShowAllCollabs] = useState(false);
  const [showAllRelations, setShowAllRelations] = useState(false);
  const [showAllUrls, setShowAllUrls] = useState(false);
  const [showAllFiles, setShowAllFiles] = useState(false);
  const [showRelationModal, setShowRelationModal] = useState(false);
  const [relationSearchTerm, setRelationSearchTerm] = useState("");
  const [taskPriorities, setTaskPriorities] = useState<TaskPriority[]>([]);
  const [projectStages, setProjectStages] = useState<ProjectStage[]>([]);

  /** Itens visíveis em colapso para tags, collabs, relações e URLs (toggle Ver mais / Ver menos) */
  const META_LIST_PREVIEW_LIMIT = 2;

  // Refs para inputs de arquivo
  const iconInputRef = React.useRef<HTMLInputElement>(null);
  const bannerInputRef = React.useRef<HTMLInputElement>(null);
  const filesInputRef = React.useRef<HTMLInputElement>(null);

  // Helper: salva no backend e retorna a tarefa atualizada (usado para uploads de arquivo)
  const saveAndApply = async (data: UpdateNoteData): Promise<Note | null> => {
    if (!note) return null;
    setIsSaving(true);
    try {
      const updated = await updateNote(note.id, data);
      if (updated) {
        setNote((prev) => (prev ? { ...prev, ...updated } : updated));
      }
      return updated;
    } catch (err) {
      console.error("Erro ao atualizar tarefa:", err);
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportNote = async () => {
    if (!note || isExporting) return;

    setIsExporting(true);
    try {
      const exported = await exportNoteAsPDF(note.id);
      if (!exported) return;
      const { blob, fileName } = exported;
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      console.error("Erro ao exportar tarefa:", err);
      const message =
        err instanceof Error && err.message
          ? err.message
          : "Não foi possível exportar a tarefa agora. Tente novamente.";
      window.alert(message);
    } finally {
      setIsExporting(false);
    }
  };

  const refreshNoteDetail = async () => {
    if (!id) return;
    try {
      const fresh = await getNoteById(id);
      if (fresh) {
        setNote((prev) => (prev ? { ...prev, ...fresh } : fresh));
        if (Array.isArray(fresh.blocks)) {
          setBlocks(fresh.blocks as (Block & { children?: Block[] })[]);
        }
      }
    } catch (e) {
      console.error("Erro ao recarregar a tarefa:", e);
    }
  };

  const handleProjectAssignment = async (nextProjectId: string) => {
    if (!note?.access?.canEdit) return;
    const current = note.associated_project?.id ?? "";
    if (nextProjectId === current) return;
    if (nextProjectId === "") {
      await saveAndApply({ project_id: null });
      return;
    }
    setIsSaving(true);
    try {
      await addNoteToProject(nextProjectId, note.id);
      await refreshNoteDetail();
    } catch (e) {
      console.error(e);
      window.alert(
        "Não foi possível associar a tarefa ao projeto. Verifique se você participa do projeto e se pode editar esta tarefa."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleStageChange = async (nextStageId: string) => {
    if (!note?.access?.canEdit || !note.associated_project?.id) return;
    if (!nextStageId || nextStageId === (note.associated_project.stage_id ?? "")) return;
    setIsSaving(true);
    try {
      await updateProjectNoteStage(note.associated_project.id, note.id, nextStageId);
      const name =
        projectStages.find((s) => s.id === nextStageId)?.name ??
        note.associated_project.stage_name ??
        "";
      setNote((prev) =>
        prev?.associated_project
          ? {
              ...prev,
              associated_project: {
                ...prev.associated_project,
                stage_id: nextStageId,
                stage_name: name,
              },
            }
          : prev
      );
    } catch (e) {
      console.error(e);
      window.alert("Não foi possível atualizar o estágio da tarefa.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleIconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) saveAndApply({ icon: file });
    if (iconInputRef.current) iconInputRef.current.value = "";
  };

  const handleBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) saveAndApply({ banner: file });
    if (bannerInputRef.current) bannerInputRef.current.value = "";
  };

  const handleFilesUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (fileList?.length) saveAndApply({ files: Array.from(fileList) });
    if (filesInputRef.current) filesInputRef.current.value = "";
  };

  const handleRemoveIcon = () => {
    // Otimista: remove localmente primeiro
    setNote((prev: Note | null): Note | null =>
      prev
        ? {
            ...prev,
            properties: { ...prev.properties, icon: { path: "", name: "", type: "" } },
          }
        : null
    );
    saveAndApply({ properties: { icon: { path: "", name: "", type: "" } } });
  };

  const handleRemoveBanner = () => {
    setNote((prev) =>
      prev
        ? {
            ...prev,
            properties: { ...prev.properties, banner: { path: "", name: "", type: "" } },
          }
        : null
    );
    saveAndApply({ properties: { banner: { path: "", name: "", type: "" } } });
  };

  const handleRemoveFile = (fileId: string) => {
    if (!note) return;
    const currentFiles = note.properties?.files || [];
    const updatedFiles = currentFiles.filter((f) => f.id !== fileId);
    // Otimista
    setNote((prev) =>
      prev ? { ...prev, properties: { ...prev.properties, files: updatedFiles } } : null
    );
    saveAndApply({ properties: { files: updatedFiles } });
  };

  // =================== FUNÇÕES PARA URLs ===================
  const handleAddUrl = async () => {
    if (!note || !newUrl.trim()) return;
    const currentUrls = note.properties?.urls || [];
    const updatedUrls = [...currentUrls, newUrl.trim()];
    // Otimista
    setNote((prev) =>
      prev ? { ...prev, properties: { ...prev.properties, urls: updatedUrls } } : null
    );
    setNewUrl("");
    setShowUrlInput(false);
    try {
      await saveAndApply({ properties: { urls: updatedUrls } });
    } catch (error) {
      // Reverter em caso de erro
      setNote((prev) =>
        prev ? { ...prev, properties: { ...prev.properties, urls: currentUrls } } : null
      );
      console.error("Erro ao adicionar URL:", error);
    }
  };

  const handleRemoveUrl = async (urlToRemove: string) => {
    if (!note) return;
    const currentUrls = note.properties?.urls || [];
    const updatedUrls = currentUrls.filter((u) => u !== urlToRemove);
    // Otimista
    setNote((prev) =>
      prev ? { ...prev, properties: { ...prev.properties, urls: updatedUrls } } : null
    );
    try {
      await saveAndApply({ properties: { urls: updatedUrls } });
    } catch (error) {
      setNote((prev) =>
        prev ? { ...prev, properties: { ...prev.properties, urls: currentUrls } } : null
      );
      console.error("Erro ao remover URL:", error);
    }
  };

  // =================== FUNÇÕES PARA RELAÇÕES ===================
  const handleAddRelation = async (relatedNoteId: string) => {
    if (!note) return;
    const currentRelations = note.properties?.relations || [];
    if (currentRelations.includes(relatedNoteId)) return;
    const updatedRelations = [...currentRelations, relatedNoteId];
    // Otimista
    setNote((prev) =>
      prev ? { ...prev, properties: { ...prev.properties, relations: updatedRelations } } : null
    );
    try {
      await saveAndApply({ properties: { relations: updatedRelations } });
    } catch (error) {
      setNote((prev) =>
        prev ? { ...prev, properties: { ...prev.properties, relations: currentRelations } } : null
      );
      console.error("Erro ao adicionar relação:", error);
    }
  };

  const handleRemoveRelation = async (relatedNoteId: string) => {
    if (!note) return;
    const currentRelations = note.properties?.relations || [];
    const updatedRelations = currentRelations.filter((id) => id !== relatedNoteId);
    // Otimista
    setNote((prev) =>
      prev ? { ...prev, properties: { ...prev.properties, relations: updatedRelations } } : null
    );
    try {
      await saveAndApply({ properties: { relations: updatedRelations } });
    } catch (error) {
      setNote((prev) =>
        prev ? { ...prev, properties: { ...prev.properties, relations: currentRelations } } : null
      );
      console.error("Erro ao remover relação:", error);
    }
  };

  const handleToggleRelation = (relatedNoteId: string) => {
    const currentRelations = note?.properties?.relations || [];
    if (currentRelations.includes(relatedNoteId)) {
      handleRemoveRelation(relatedNoteId);
    } else {
      handleAddRelation(relatedNoteId);
    }
  };

  // Tarefas filtradas para o modal de relações (exclui a tarefa atual)
  const filteredRelationNotes = notesOverview
    .filter((n) => n.id !== id)
    .filter((n) =>
      relationSearchTerm ? n.title.toLowerCase().includes(relationSearchTerm.toLowerCase()) : true
    );

  // Buscar dados das tarefas relacionadas pelo ID
  const relatedNotesData = (note?.properties?.relations || [])
    .map((relId) => notesOverview.find((n) => n.id === relId))
    .filter(Boolean);

  // =================== FUNÇÕES PARA COR ===================
  const handleChangeColor = async (color: string) => {
    if (!note) return;
    const previousColor = note.properties?.color || "";
    // Otimista
    setNote((prev) => (prev ? { ...prev, properties: { ...prev.properties, color } } : null));
    setShowColorPicker(false);
    try {
      await saveAndApply({ properties: { color } });
    } catch (error) {
      setNote((prev) =>
        prev ? { ...prev, properties: { ...prev.properties, color: previousColor } } : null
      );
      console.error("Erro ao alterar cor:", error);
    }
  };

  const _handleRemoveColor = async () => {
    if (!note) return;
    const previousColor = note.properties?.color || "";
    // Otimista
    setNote((prev) => (prev ? { ...prev, properties: { ...prev.properties, color: "" } } : null));
    setShowColorPicker(false);
    try {
      await saveAndApply({ properties: { color: "" } });
    } catch (error) {
      setNote((prev) =>
        prev ? { ...prev, properties: { ...prev.properties, color: previousColor } } : null
      );
      console.error("Erro ao remover cor:", error);
    }
  };

  // Configuração dos sensores para drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Precisa arrastar 8px para ativar
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Carregar tarefa específica
  useEffect(() => {
    if (id) {
      const loadNote = async () => {
        setInitialLoading(true);
        try {
          const loadedNote = await getNoteById(id);
          if (loadedNote) {
            setNote(loadedNote);
            setEditingTitle(loadedNote.title);
            setEditingDescription(loadedNote.description || "");
            // Carregar blocos da tarefa
            if (loadedNote.blocks) {
              setBlocks(loadedNote.blocks as (Block & { children?: Block[] })[]);
            }
          }
        } finally {
          setInitialLoading(false);
        }
      };
      loadNote();
    }
  }, [id, getNoteById]);

  useEffect(() => {
    let cancelled = false;
    const loadPriorities = async () => {
      if (!note) {
        setTaskPriorities([]);
        return;
      }
      const projectId = note.associated_project?.id;
      const orgId = note.associated_organization?.id;
      try {
        if (projectId) {
          const list = await getTaskPriorities(projectId);
          if (!cancelled) setTaskPriorities(list);
        } else if (orgId) {
          const list = await getOrgTaskPriorities(orgId);
          if (!cancelled) setTaskPriorities(list);
        } else if (!cancelled) {
          setTaskPriorities([]);
        }
      } catch {
        if (!cancelled) setTaskPriorities([]);
      }
    };
    loadPriorities();
    return () => {
      cancelled = true;
    };
  }, [note, getTaskPriorities, getOrgTaskPriorities]);

  useEffect(() => {
    if (!note?.access?.canEdit) return;
    void refreshProjects();
  }, [note?.access?.canEdit, refreshProjects]);

  useEffect(() => {
    let cancelled = false;
    const projectId = note?.associated_project?.id;
    if (!projectId) {
      setProjectStages([]);
      return;
    }
    (async () => {
      try {
        const stages = await getProjectStages(projectId);
        const ordered = [...stages].sort((a, b) => a.position - b.position);
        if (!cancelled) setProjectStages(ordered);
      } catch {
        if (!cancelled) setProjectStages([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [note?.associated_project?.id, getProjectStages]);

  // Auto-criar bloco parágrafo quando a tarefa não tem blocos
  useEffect(() => {
    if (
      !initialLoading &&
      note &&
      blocks.length === 0 &&
      note.access?.canEdit &&
      !initialBlockCreated.current
    ) {
      initialBlockCreated.current = true;
      const createInitialBlock = async () => {
        try {
          const newBlock = await createBlock(note.id, {
            type: "paragraph",
            text: "",
            position: 0,
          });
          if (newBlock) {
            setBlocks([{ ...newBlock, children: [] }]);
            setFocusBlockId(newBlock.id);
          }
        } catch (error) {
          console.error("Erro ao criar bloco inicial:", error);
        }
      };
      createInitialBlock();
    }
  }, [initialLoading, note, blocks.length, createBlock]);

  const flushMetadataSave = React.useCallback(
    async (payload: { description: string; title: string }) => {
      if (!note) return;
      if (
        payload.title === note.title &&
        payload.description === (note.description || "")
      ) {
        return;
      }

      if (metadataSaveInFlightRef.current) {
        pendingMetadataRef.current = payload;
        return;
      }

      metadataSaveInFlightRef.current = true;
      setIsSaving(true);
      try {
        const updatedNote = await updateNote(note.id, payload);
        if (updatedNote) {
          setNote((prev) =>
            prev
              ? {
                  ...prev,
                  ...updatedNote,
                  description: payload.description,
                  title: payload.title,
                }
              : updatedNote
          );
        }
      } catch (error) {
        console.error("Erro ao salvar:", error);
      } finally {
        metadataSaveInFlightRef.current = false;
        const pendingPayload = pendingMetadataRef.current;
        pendingMetadataRef.current = null;
        if (pendingPayload) {
          await flushMetadataSave(pendingPayload);
          return;
        }
        setIsSaving(false);
      }
    },
    [note, updateNote]
  );

  // Auto-salvar título/descrição com debounce e fila para evitar travamentos
  useEffect(() => {
    if (!note) return;

    const hasChanges =
      editingTitle !== note.title || editingDescription !== (note.description || "");
    if (!hasChanges) return;

    if (metadataDebounceRef.current) {
      clearTimeout(metadataDebounceRef.current);
    }

    metadataDebounceRef.current = setTimeout(() => {
      void flushMetadataSave({
        description: editingDescription,
        title: editingTitle,
      });
    }, 1500);

    return () => {
      if (metadataDebounceRef.current) {
        clearTimeout(metadataDebounceRef.current);
      }
    };
  }, [editingDescription, editingTitle, flushMetadataSave, note]);

  // =================== FUNÇÕES PARA DRAG AND DROP ===================
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id || !note) return;

    const oldIndex = blocks.findIndex((block) => block.id === active.id);
    const newIndex = blocks.findIndex((block) => block.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    // Atualizar estado local imediatamente para feedback visual
    const newBlocks = arrayMove(blocks, oldIndex, newIndex);
    setBlocks(newBlocks);

    // Preparar as novas posições para o backend
    const blockPositions = newBlocks.map((block, index) => ({
      id: block.id,
      position: index,
    }));

    // Salvar no backend
    try {
      setIsSaving(true);
      await reorderBlocksService(note.id, blockPositions);
    } catch (error) {
      console.error("Erro ao reordenar blocos:", error);
      // Reverter em caso de erro
      const revertedBlocks = arrayMove(newBlocks, newIndex, oldIndex);
      setBlocks(revertedBlocks);
      alert("Erro ao reordenar blocos. Tente novamente.");
    } finally {
      setIsSaving(false);
    }
  };

  // Encontrar bloco ativo para o DragOverlay
  const activeBlock = activeId ? blocks.find((block) => block.id === activeId) : null;

  // =================== FUNÇÕES PARA BLOCOS ===================
  const handleUpdateBlock = async (blockId: string, data: Partial<Block>) => {
    if (!note) return;

    const isTextOnlyUpdate =
      Object.keys(data).length === 1 && Object.prototype.hasOwnProperty.call(data, "text");

    try {
      if (!isTextOnlyUpdate) {
        setIsSaving(true);
      }
      await updateBlockService(note.id, blockId, data);

      // Atualizar estado local
      setBlocks((prevBlocks) => {
        const updateBlockRecursive = (
          blockList: (Block & { children?: Block[] })[]
        ): (Block & { children?: Block[] })[] => {
          return blockList.map((block) => {
            if (block.id === blockId) {
              return { ...block, ...data };
            }
            if (block.children && block.children.length > 0) {
              return {
                ...block,
                children: updateBlockRecursive(
                  block.children as (Block & { children?: Block[] })[]
                ),
              };
            }
            return block;
          });
        };
        return updateBlockRecursive(prevBlocks);
      });
    } catch (error) {
      console.error("Erro ao atualizar bloco:", error);
    } finally {
      if (!isTextOnlyUpdate) {
        setIsSaving(false);
      }
    }
  };

  const handleAddBlock = async (type: string, parentId?: string) => {
    if (!note) return;

    try {
      const newBlock = await createBlock(note.id, {
        type,
        text: "",
        parentId,
        position: blocks.length,
      });

      if (newBlock) {
        setBlocks((prev) => [...prev, { ...newBlock, children: [] }]);
        setFocusBlockId(newBlock.id);
      }
    } catch (error) {
      console.error("Erro ao criar bloco:", error);
      alert("Erro ao criar bloco. Tente novamente.");
    }
  };

  // Cria um bloco parágrafo após o bloco especificado
  const handleAddBlockAfter = async (afterBlockId: string) => {
    if (!note) return;

    const afterIndex = blocks.findIndex((b) => b.id === afterBlockId);
    const position = afterIndex !== -1 ? afterIndex + 1 : blocks.length;

    try {
      const newBlock = await createBlock(note.id, {
        type: "paragraph",
        text: "",
        position,
      });

      if (newBlock) {
        setBlocks((prev) => {
          const newBlocks = [...prev];
          newBlocks.splice(position, 0, { ...newBlock, children: [] });
          return newBlocks;
        });
        setFocusBlockId(newBlock.id);
      }
    } catch (error) {
      console.error("Erro ao criar bloco:", error);
    }
  };

  const handlePasteLines = async (blockId: string, lines: string[]) => {
    if (!note) return;

    const normalizedLines = lines.map((line) => line.replace(/\r/g, ""));
    if (normalizedLines.length === 0) return;

    const blockIndex = blocks.findIndex((b) => b.id === blockId);
    if (blockIndex === -1) return;

    const createdBlocks: (Block & { children?: Block[] })[] = [];
    let position = blockIndex + 1;

    try {
      for (const line of normalizedLines) {
        const created = await createBlock(note.id, {
          type: "paragraph",
          text: line,
          position,
        });

        if (created) {
          createdBlocks.push({ ...created, children: [] });
          position += 1;
        }
      }

      if (createdBlocks.length > 0) {
        setBlocks((prev) => {
          const insertionIndex = prev.findIndex((b) => b.id === blockId);
          if (insertionIndex === -1) return prev;
          const next = [...prev];
          next.splice(insertionIndex + 1, 0, ...createdBlocks);
          return next.map((block, index) => ({ ...block, position: index }));
        });
        setFocusBlockId(createdBlocks[createdBlocks.length - 1].id);
      }
    } catch (error) {
      console.error("Erro ao colar conteúdo em múltiplos blocos:", error);
    }
  };

  // Deleta bloco vazio silenciosamente (Backspace) e foca no anterior
  const handleBackspaceEmpty = async (blockId: string) => {
    if (!note) return;

    const blockIndex = blocks.findIndex((b) => b.id === blockId);
    // Não deletar se for o único bloco
    if (blocks.length <= 1) return;

    const previousBlockId = blockIndex > 0 ? blocks[blockIndex - 1].id : null;

    try {
      await deleteBlockService(note.id, blockId);
      setBlocks((prev) => prev.filter((b) => b.id !== blockId));
      if (previousBlockId) {
        setFocusBlockId(previousBlockId);
      }
    } catch (error) {
      console.error("Erro ao deletar bloco:", error);
    }
  };

  const handleDelete = async () => {
    if (!note) return;

    if (window.confirm("Tem certeza que deseja deletar esta tarefa?")) {
      try {
        const success = await deleteNote(note.id);
        if (success) {
          router.push("/notes");
        }
      } catch (error) {
        console.error("Erro ao deletar tarefa:", error);
        alert("Erro ao deletar a tarefa. Tente novamente.");
      }
    }
  };

  const handleBack = () => {
    router.push("/notes");
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("pt-BR", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "Data inválida";
    }
  };

  // =================== FUNÇÕES PARA COLABORAÇÃO ===================
  const handleSearchUsers = async (term: string) => {
    if (!term.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const users = await searchUsers(term);
      setSearchResults(users);
    } catch (error) {
      console.error("Erro ao buscar usuários:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleShareNote = async (userId: string) => {
    if (!note) return;

    try {
      await shareNote(note.id, {
        userId: userId,
      });

      // Buscar dados atualizados dos colaboradores sem refresh bruto
      const updatedNote = await getNoteById(note.id);
      if (updatedNote) {
        // Só atualizar os colaboradores, sem re-renderizar tudo
        setNote((prev) => (prev ? { ...prev, collaborators: updatedNote.collaborators } : null));
      }

      setShowShareModal(false);
      setSearchTerm("");
      setSearchResults([]);
    } catch (error) {
      console.error("Erro ao compartilhar tarefa:", error);
      alert("Erro ao compartilhar tarefa. Tente novamente.");
    }
  };

  const handleRemoveCollaborator = async (collaborator: unknown) => {
    if (!note) return;

    const collaboratorId = getCollaboratorId(collaborator);
    const collaboratorName = getCollaboratorDisplayName(collaborator);

    if (!collaboratorId) {
      alert("ID do colaborador não encontrado.");
      return;
    }

    if (window.confirm(`Tem certeza que deseja remover ${collaboratorName} desta tarefa?`)) {
      const previousCollaborators = note.collaborators || [];
      setNote((prev) =>
        prev
          ? {
              ...prev,
              collaborators: (prev.collaborators || []).filter(
                (c) => getCollaboratorId(c) !== collaboratorId
              ),
            }
          : null
      );

      try {
        await removeCollaborator(note.id, collaboratorId);
      } catch (error) {
        // Reverter em caso de erro
        setNote((prev) => (prev ? { ...prev, collaborators: previousCollaborators } : null));
        console.error("Erro ao remover colaborador:", error);
        alert("Erro ao remover colaborador. Tente novamente.");
      }
    }
  };

  // =================== FUNÇÕES PARA TAGS ===================
  const handleAddTag = async () => {
    if (!note || !newTag.trim()) return;

    const currentTags = note.tags || [];
    if (currentTags.includes(newTag.trim())) {
      alert("Esta tag já existe nesta tarefa.");
      return;
    }

    const updatedTags = [...currentTags, newTag.trim()];
    // Otimista
    setNote((prev) => (prev ? { ...prev, tags: updatedTags } : null));
    setNewTag("");
    setShowTagModal(false);

    try {
      await updateNote(note.id, { tags: updatedTags });
    } catch (error) {
      // Reverter
      setNote((prev) => (prev ? { ...prev, tags: currentTags } : null));
      console.error("Erro ao adicionar tag:", error);
      alert("Erro ao adicionar tag. Tente novamente.");
    }
  };

  const handleRemoveTag = async (tagToRemove: string) => {
    if (!note) return;

    const currentTags = note.tags || [];
    const updatedTags = currentTags.filter((tag) => tag !== tagToRemove);
    // Otimista
    setNote((prev) => (prev ? { ...prev, tags: updatedTags } : null));

    try {
      await updateNote(note.id, { tags: updatedTags });
    } catch (error) {
      // Reverter
      setNote((prev) => (prev ? { ...prev, tags: currentTags } : null));
      console.error("Erro ao remover tag:", error);
      alert("Erro ao remover tag. Tente novamente.");
    }
  };

  // Adicionar listener para teclas de atalho
  useEffect(() => {
    const handleDocumentKeyDown = async (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (note) {
          if (metadataDebounceRef.current) {
            clearTimeout(metadataDebounceRef.current);
            metadataDebounceRef.current = null;
          }
          await flushMetadataSave({
            description: editingDescription,
            title: editingTitle,
          });
        }
      }
    };

    document.addEventListener("keydown", handleDocumentKeyDown);
    return () => document.removeEventListener("keydown", handleDocumentKeyDown);
  }, [editingDescription, editingTitle, flushMetadataSave, note]);

  if (initialLoading || !note) {
    return <NoteDetailSkeleton />;
  }

  if (error) {
    return (
      <div className="flex min-h-[50vh] flex-1 items-center justify-center p-6">
        <div className="max-w-md rounded-md border border-neutral-200 bg-white p-8 text-center shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 dark:bg-red-500/10">
            <span className="text-xl">⚠️</span>
          </div>
          <p className="mb-1 font-semibold text-neutral-900 dark:text-neutral-100">
            Erro ao carregar tarefa
          </p>
          <p className="mb-5 text-sm text-neutral-500 dark:text-neutral-400">{error}</p>
          <button
            onClick={handleBack}
            className="inline-flex items-center gap-2 rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
          >
            <ArrowLeft size={14} />
            Voltar para Tarefas
          </button>
        </div>
      </div>
    );
  }

  const canUseNoteComments =
    !note.access || Boolean(note.access.canEdit || note.access.isCollaborator);

  const hasNoteHero = Boolean(note.properties?.banner?.path || note.properties?.color);

  const IconPropsToolbar = () => (
    <div className="group/props mb-3 flex items-center gap-3">
      {note.properties?.icon?.path ? (
        <div className="group relative">
          <div className="h-14 w-14 overflow-hidden rounded-md border-2 border-white bg-white shadow-md dark:border-neutral-900 dark:bg-neutral-900">
            <Image
              src={getStorageUrl(note.properties.icon.path)}
              alt="Ícone"
              width={56}
              height={56}
              className="h-full w-full object-cover"
            />
          </div>
          {note.access?.canEdit && (
            <div className="absolute -top-1 -right-1 flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                onClick={() => iconInputRef.current?.click()}
                className="rounded-full bg-neutral-800/70 p-1 text-white backdrop-blur-sm hover:bg-neutral-800"
                title="Trocar ícone"
              >
                <ImagePlus size={10} />
              </button>
              <button
                onClick={handleRemoveIcon}
                className="rounded-full bg-neutral-800/70 p-1 text-white backdrop-blur-sm hover:bg-red-500"
                title="Remover ícone"
              >
                <X size={10} />
              </button>
            </div>
          )}
        </div>
      ) : null}
      {note.access?.canEdit && (
        <div
          className={`flex items-center gap-1 transition-opacity ${
            note.properties?.icon?.path && note.properties?.banner?.path
              ? "opacity-0 group-hover/props:opacity-100"
              : ""
          }`}
        >
          <button
            onClick={() => filesInputRef.current?.click()}
            className="dark:hover:bg-brand-primary-500/5 dark:hover:text-brand-primary-500 flex items-center gap-1.5 rounded-md border border-dashed border-neutral-300 px-2.5 py-1.5 text-xs text-neutral-400 transition-colors hover:border-yellow-500 hover:bg-yellow-50 hover:text-yellow-600 dark:border-neutral-600 dark:text-neutral-500 dark:hover:border-yellow-500/50"
            title="Adicionar arquivos"
          >
            <FileText size={12} />
            Arquivos
          </button>
          {!note.properties?.icon?.path && (
            <button
              onClick={() => iconInputRef.current?.click()}
              className="dark:hover:bg-brand-primary-500/5 dark:hover:text-brand-primary-500 flex items-center gap-1.5 rounded-md border border-dashed border-neutral-300 px-2.5 py-1.5 text-xs text-neutral-400 transition-colors hover:border-yellow-500 hover:bg-yellow-50 hover:text-yellow-600 dark:border-neutral-600 dark:text-neutral-500 dark:hover:border-yellow-500/50"
              title="Adicionar ícone"
            >
              <ImagePlus size={12} />
              Ícone
            </button>
          )}
          {!note.properties?.banner?.path && (
            <button
              onClick={() => bannerInputRef.current?.click()}
              className="dark:hover:bg-brand-primary-500/5 dark:hover:text-brand-primary-500 flex items-center gap-1.5 rounded-md border border-dashed border-neutral-300 px-2.5 py-1.5 text-xs text-neutral-400 transition-colors hover:border-yellow-500 hover:bg-yellow-50 hover:text-yellow-600 dark:border-neutral-600 dark:text-neutral-500 dark:hover:border-yellow-500/50"
              title="Adicionar banner"
            >
              <ImagePlus size={12} />
              Banner
            </button>
          )}
          <button
            onClick={() => setShowTagModal(true)}
            className="dark:hover:bg-brand-primary-500/5 dark:hover:text-brand-primary-500 flex items-center gap-1.5 rounded-md border border-dashed border-neutral-300 px-2.5 py-1.5 text-xs text-neutral-400 transition-colors hover:border-yellow-500 hover:bg-yellow-50 hover:text-yellow-600 dark:border-neutral-600 dark:text-neutral-500 dark:hover:border-yellow-500/50"
            title="Gerenciar tags"
          >
            <Tag size={12} />
            Tags
          </button>
          <button
            onClick={() => setShowRelationModal(true)}
            className="dark:hover:bg-brand-primary-500/5 dark:hover:text-brand-primary-500 flex items-center gap-1.5 rounded-md border border-dashed border-neutral-300 px-2.5 py-1.5 text-xs text-neutral-400 transition-colors hover:border-yellow-500 hover:bg-yellow-50 hover:text-yellow-600 dark:border-neutral-600 dark:text-neutral-500 dark:hover:border-yellow-500/50"
            title="Gerenciar relações"
          >
            <Link size={12} />
            Relações
          </button>
        </div>
      )}
    </div>
  );

  return (
    <NoteCommentsProvider noteId={note.id}>
      <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden bg-neutral-50 shadow-sm dark:bg-neutral-950">
        <NoteDetailHeader
          isExporting={isExporting}
          isSaving={isSaving}
          note={note}
          onBack={handleBack}
          onChangeColor={handleChangeColor}
          onDelete={handleDelete}
          onExport={handleExportNote}
          onShare={() => setShowShareModal(true)}
          onToggleColorPicker={() => setShowColorPicker(!showColorPicker)}
          setShowColorPicker={setShowColorPicker}
          showColorPicker={showColorPicker}
        />

        {/* =================== CONTEÚDO: banner cheio; abaixo = corpo | comentários =================== */}
        <NoteDetailBody>
            {/* Hidden file inputs */}
            <input
              ref={iconInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleIconUpload}
            />
            <input
              ref={bannerInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleBannerUpload}
            />
            <input
              ref={filesInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFilesUpload}
            />

            {/* Banner em largura total; ícone “encosta” no hero com absolute (evita corte por overflow) */}
            {note.properties?.banner?.path ? (
              <div className="w-full shrink-0 overflow-visible pb-6">
                <div className="relative w-full">
                  <div className="group relative z-0 h-52 w-full overflow-hidden bg-neutral-100 dark:bg-neutral-800">
                    <Image
                      src={getStorageUrl(note.properties.banner.path)}
                      alt="Banner"
                      fill
                      sizes="100vw"
                      className="object-cover"
                    />
                    {note.access?.canEdit && (
                      <div className="absolute right-3 bottom-3 z-20 flex gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          onClick={() => bannerInputRef.current?.click()}
                          className="rounded-md bg-black/50 px-2.5 py-1 text-xs font-medium text-white/90 backdrop-blur-sm transition-colors hover:bg-black/70"
                        >
                          Trocar
                        </button>
                        <button
                          onClick={handleRemoveBanner}
                          className="rounded-md bg-black/50 px-2.5 py-1 text-xs font-medium text-white/90 backdrop-blur-sm transition-colors hover:bg-red-500/80"
                        >
                          Remover
                        </button>
                      </div>
                    )}
                  </div>
                  {/* top-full = base do banner (só h-52); -translate-y-7 = metade do ícone h-14 sobre o banner */}
                  <div className="pointer-events-none absolute inset-x-0 top-full z-30 flex -translate-y-7 justify-start px-4 sm:px-6">
                    <div className="pointer-events-auto min-w-0">
                      <IconPropsToolbar />
                    </div>
                  </div>
                </div>
              </div>
            ) : note.properties?.color ? (
              <div className="w-full shrink-0 overflow-visible pb-12">
                <div className="relative w-full">
                  <div
                    className="relative z-0 h-28 w-full"
                    style={{ backgroundColor: note.properties.color }}
                  />
                  <div className="pointer-events-none absolute inset-x-0 top-full z-30 flex -translate-y-7 justify-start px-4 sm:px-6">
                    <div className="pointer-events-auto min-w-0">
                      <IconPropsToolbar />
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row">
              <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                {!hasNoteHero ? (
                  <div className="shrink-0 px-4 pt-6 sm:px-6">
                    <IconPropsToolbar />
                  </div>
                ) : null}

                <div
                  className={`no-scrollbar min-h-0 flex-1 overflow-y-auto px-4 pb-6 sm:px-6 ${
                    hasNoteHero ? "pt-2 sm:pt-4" : ""
                  }`}
                >
                  <div className="mx-auto w-full max-w-4xl">
                  {/* Título + comentários */}
                  <div className="mb-4">
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <textarea
                          ref={(el) => {
                            if (el) {
                              el.style.height = "auto";
                              el.style.height = `${el.scrollHeight}px`;
                            }
                          }}
                          value={editingTitle}
                          onChange={(e) => {
                            setEditingTitle(e.target.value);
                            const el = e.target;
                            el.style.height = "auto";
                            el.style.height = `${el.scrollHeight}px`;
                          }}
                          placeholder="Título da tarefa..."
                          rows={1}
                          className="w-full resize-none overflow-hidden bg-transparent text-xl font-bold text-neutral-900 placeholder-neutral-300 transition-colors outline-none focus:placeholder-neutral-400 dark:text-neutral-100 dark:placeholder-neutral-600 dark:focus:placeholder-neutral-500"
                        />
                        <textarea
                          ref={(el) => {
                            if (el) {
                              el.style.height = "auto";
                              el.style.height = `${el.scrollHeight}px`;
                            }
                          }}
                          value={editingDescription}
                          onChange={(e) => {
                            setEditingDescription(e.target.value);
                            const el = e.target;
                            el.style.height = "auto";
                            el.style.height = `${el.scrollHeight}px`;
                          }}
                          placeholder="Adicionar descrição..."
                          rows={1}
                          className="w-full resize-none overflow-hidden bg-transparent text-sm text-neutral-600 placeholder-neutral-300 transition-colors outline-none focus:placeholder-neutral-400 dark:text-neutral-400 dark:placeholder-neutral-600 dark:focus:placeholder-neutral-500"
                        />
                      </div>
                      {canUseNoteComments ? (
                        <div className="mt-0.5 max-w-[46%] min-w-0 shrink sm:max-w-[min(18rem,48%)]">
                          <NoteCommentsSidebarTrigger
                            open={commentsSidebarOpen}
                            onToggle={() => setCommentsSidebarOpen((v) => !v)}
                          />
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {/* Meta informações — conteúdo até 2/3; linhas divisórias em largura total */}
                  <div className="mb-3 flex w-full flex-col gap-4 pb-1">
                    <div className="w-full max-w-[66.666667%]">
                      <div className="grid grid-cols-1 gap-x-6 gap-y-4 lg:grid-cols-2 lg:items-center">
                        {(note.access?.canEdit || note.associated_project) && (
                          <>
                            <div className="flex min-w-0 flex-row items-center gap-2 sm:gap-3">
                              <div className="flex shrink-0 items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                                <FolderKanban
                                  className="dark:text-brand-primary-500 flex-shrink-0 text-yellow-400"
                                  size={13}
                                />
                                <span className="font-medium">Projeto</span>
                              </div>
                              <div className="min-w-0 flex-1">
                                {note.access?.canEdit ? (
                                  <select
                                    aria-label="Projeto da tarefa"
                                    className="w-full max-w-full cursor-pointer rounded-lg border-0 bg-neutral-100/80 px-2 py-1.5 text-xs text-neutral-800 shadow-none ring-0 ring-offset-0 transition-colors outline-none hover:bg-neutral-100 focus:bg-neutral-100 focus:ring-0 focus:outline-none focus-visible:ring-0 dark:bg-neutral-800/55 dark:text-neutral-200 dark:hover:bg-neutral-800/75 dark:focus:bg-neutral-800/75"
                                    value={note.associated_project?.id ?? ""}
                                    onChange={(e) => void handleProjectAssignment(e.target.value)}
                                  >
                                    <option value="">Sem projeto</option>
                                    {projects.map((p) => (
                                      <option key={p.id} value={p.id}>
                                        {p.title}
                                      </option>
                                    ))}
                                  </select>
                                ) : note.associated_project ? (
                                  <span className="text-xs font-medium text-neutral-800 dark:text-neutral-200">
                                    {note.associated_project.name}
                                  </span>
                                ) : null}
                              </div>
                            </div>
                            <div className="flex min-w-0 flex-row items-center gap-2 sm:gap-3">
                              <div className="flex shrink-0 items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                                <Kanban
                                  className="dark:text-brand-primary-500 flex-shrink-0 text-yellow-400"
                                  size={13}
                                />
                                <span className="font-medium">Estágio</span>
                              </div>
                              <div className="min-w-0 flex-1">
                                {note.associated_project ? (
                                  <>
                                    {note.access?.canEdit && projectStages.length > 0 ? (
                                      <div className="flex items-center gap-2">
                                        <span
                                          className="h-3 w-3 shrink-0 rounded-full ring-1 ring-neutral-900/10 dark:ring-white/15"
                                          style={{
                                            backgroundColor: (() => {
                                              const sid = note.associated_project?.stage_id;
                                              if (!sid) return "#a3a3a3";
                                              const st = projectStages.find((s) => s.id === sid);
                                              return st?.color || "#a3a3a3";
                                            })(),
                                          }}
                                          title="Cor do estágio"
                                          aria-hidden
                                        />
                                        <select
                                          aria-label="Estágio da tarefa no projeto"
                                          className="min-w-0 flex-1 cursor-pointer rounded-lg border-0 bg-neutral-100/80 px-2 py-1.5 text-xs text-neutral-800 shadow-none ring-0 ring-offset-0 transition-colors outline-none hover:bg-neutral-100 focus:bg-neutral-100 focus:ring-0 focus:outline-none focus-visible:ring-0 dark:bg-neutral-800/55 dark:text-neutral-200 dark:hover:bg-neutral-800/75 dark:focus:bg-neutral-800/75"
                                          value={note.associated_project.stage_id ?? ""}
                                          onChange={(e) => void handleStageChange(e.target.value)}
                                        >
                                          <option value="">Escolha o estágio</option>
                                          {note.associated_project.stage_id &&
                                            !projectStages.some(
                                              (s) => s.id === note.associated_project?.stage_id
                                            ) && (
                                              <option value={note.associated_project.stage_id}>
                                                {note.associated_project.stage_name || "Estágio"}
                                              </option>
                                            )}
                                          {projectStages.map((s) => (
                                            <option key={s.id} value={s.id}>
                                              {s.name}
                                            </option>
                                          ))}
                                        </select>
                                      </div>
                                    ) : (
                                      <span
                                        className="inline-flex max-w-full items-center gap-2 rounded-lg bg-neutral-100/80 px-2 py-1.5 text-xs text-neutral-700 dark:bg-neutral-800/55 dark:text-neutral-300"
                                        style={(() => {
                                          const sid = note.associated_project?.stage_id;
                                          const st = sid
                                            ? projectStages.find((s) => s.id === sid)
                                            : undefined;
                                          const c = st?.color || "#a3a3a3";
                                          return {
                                            borderLeftWidth: 3,
                                            borderLeftStyle: "solid" as const,
                                            borderLeftColor: c,
                                            backgroundColor: st?.color
                                              ? `${st.color}26`
                                              : undefined,
                                          };
                                        })()}
                                      >
                                        <span
                                          className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-neutral-900/10 dark:ring-white/15"
                                          style={{
                                            backgroundColor: (() => {
                                              const sid = note.associated_project?.stage_id;
                                              if (!sid) return "#a3a3a3";
                                              return (
                                                projectStages.find((s) => s.id === sid)?.color ||
                                                "#a3a3a3"
                                              );
                                            })(),
                                          }}
                                          aria-hidden
                                        />
                                        {note.associated_project.stage_name ||
                                          (projectStages.length === 0
                                            ? "Nenhuma coluna neste projeto"
                                            : "—")}
                                      </span>
                                    )}
                                  </>
                                ) : note.access?.canEdit ? (
                                  <p className="text-[10px] leading-snug text-neutral-400 dark:text-neutral-500">
                                    O estágio só pode ser definido quando a tarefa está num projeto.
                                  </p>
                                ) : (
                                  <span className="text-xs text-neutral-500 dark:text-neutral-400">
                                    —
                                  </span>
                                )}
                              </div>
                            </div>
                          </>
                        )}

                        {(note.access?.canEdit ||
                          note.due_date ||
                          note.priority_id ||
                          note.priority_name) && (
                          <>
                            <div className="flex min-w-0 flex-row items-center gap-2 sm:gap-3">
                              <div className="flex shrink-0 items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                                <Calendar
                                  className="dark:text-brand-primary-500 flex-shrink-0 text-yellow-400"
                                  size={13}
                                />
                                <span className="font-medium">Prazo</span>
                              </div>
                              <div className="min-w-0 flex-1">
                                {note.access?.canEdit ? (
                                  <input
                                    type="datetime-local"
                                    aria-label="Data e hora de prazo"
                                    className="w-full max-w-full rounded-lg border-0 bg-neutral-100/80 px-2 py-1.5 text-xs text-neutral-800 shadow-none ring-0 ring-offset-0 transition-colors outline-none hover:bg-neutral-100 focus:bg-neutral-100 focus:ring-0 focus:outline-none focus-visible:ring-0 dark:bg-neutral-800/55 dark:text-neutral-200 dark:hover:bg-neutral-800/75 dark:focus:bg-neutral-800/75"
                                    value={
                                      note.due_date
                                        ? (() => {
                                            const d = new Date(note.due_date);
                                            const pad = (n: number) => String(n).padStart(2, "0");
                                            return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
                                          })()
                                        : ""
                                    }
                                    onChange={async (e) => {
                                      const v = e.target.value;
                                      if (!v) {
                                        await saveAndApply({ due_date: null });
                                        return;
                                      }
                                      await saveAndApply({ due_date: new Date(v).toISOString() });
                                    }}
                                  />
                                ) : (
                                  <span className="text-xs text-neutral-600 dark:text-neutral-300">
                                    {note.due_date
                                      ? new Date(note.due_date).toLocaleString("pt-BR")
                                      : "Sem prazo definido"}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex min-w-0 flex-row items-center gap-2 sm:gap-3">
                              <div className="flex shrink-0 items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                                <Flag
                                  className="dark:text-brand-primary-500 flex-shrink-0 text-yellow-400"
                                  size={13}
                                />
                                <span className="font-medium">Prioridade</span>
                              </div>
                              <div className="min-w-0 flex-1">
                                {note.access?.canEdit && taskPriorities.length > 0 ? (
                                  <div className="flex items-center gap-2">
                                    <span
                                      className="h-3 w-3 shrink-0 rounded-full ring-1 ring-neutral-900/10 dark:ring-white/15"
                                      style={{
                                        backgroundColor:
                                          (note.priority_id &&
                                            taskPriorities.find((p) => p.id === note.priority_id)
                                              ?.color_hex) ||
                                          note.priority_color ||
                                          "#a3a3a3",
                                      }}
                                      title="Cor da prioridade"
                                      aria-hidden
                                    />
                                    <select
                                      aria-label="Prioridade da tarefa"
                                      className="min-w-0 flex-1 cursor-pointer rounded-lg border-0 bg-neutral-100/80 px-2 py-1.5 text-xs text-neutral-800 shadow-none ring-0 ring-offset-0 transition-colors outline-none hover:bg-neutral-100 focus:bg-neutral-100 focus:ring-0 focus:outline-none focus-visible:ring-0 dark:bg-neutral-800/55 dark:text-neutral-200 dark:hover:bg-neutral-800/75 dark:focus:bg-neutral-800/75"
                                      value={note.priority_id ?? ""}
                                      onChange={async (e) => {
                                        const v = e.target.value;
                                        await saveAndApply({
                                          priority_id: v === "" ? null : v,
                                        });
                                      }}
                                    >
                                      <option value="">Sem prioridade</option>
                                      {taskPriorities.map((p) => (
                                        <option key={p.id} value={p.id}>
                                          {p.name}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                ) : note.priority_name ? (
                                  <span
                                    className="inline-flex w-fit max-w-full items-center gap-2 rounded-lg px-2 py-1 text-xs font-medium text-neutral-900 dark:text-neutral-100"
                                    style={{
                                      borderLeftWidth: 3,
                                      borderLeftStyle: "solid",
                                      borderLeftColor: note.priority_color || "#ca8a04",
                                      backgroundColor: note.priority_color
                                        ? `${note.priority_color}33`
                                        : "rgba(234, 179, 8, 0.2)",
                                    }}
                                  >
                                    <span
                                      className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-neutral-900/10 dark:ring-white/15"
                                      style={{
                                        backgroundColor: note.priority_color || "#ca8a04",
                                      }}
                                      aria-hidden
                                    />
                                    {note.priority_name}
                                  </span>
                                ) : note.access?.canEdit ? (
                                  <span className="text-xs text-neutral-500 dark:text-neutral-400">
                                    Nenhuma prioridade disponível neste âmbito
                                  </span>
                                ) : (
                                  <span className="text-xs text-neutral-500 dark:text-neutral-400">
                                    Sem prioridade
                                  </span>
                                )}
                              </div>
                            </div>
                          </>
                        )}

                        <div className="flex min-w-0 flex-row items-center gap-2 sm:gap-3">
                          <div className="flex shrink-0 items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                            <Users
                              className="dark:text-brand-primary-500 flex-shrink-0 text-yellow-400"
                              size={13}
                            />
                            <span className="font-medium">Collabs</span>
                          </div>
                          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
                            {note.collaborators && note.collaborators.length > 0 && (
                              <>
                                <div className="flex -space-x-1.5">
                                  {(showAllCollabs
                                    ? note.collaborators
                                    : note.collaborators.slice(0, META_LIST_PREVIEW_LIMIT)
                                  ).map((collab, index) => {
                                    const displayName = getCollaboratorDisplayName(collab);
                                    const avatarUrl = getCollaboratorAvatarUrl(collab);

                                    return (
                                      <div
                                        key={index}
                                        className="group relative flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-neutral-200 ring-0 transition-all hover:z-10 hover:ring-2 hover:ring-yellow-500/30 dark:border-neutral-900 dark:bg-neutral-700"
                                        title={displayName}
                                      >
                                        {avatarUrl ? (
                                          <Image
                                            width={28}
                                            height={28}
                                            src={avatarUrl}
                                            alt={displayName}
                                            className="h-full w-full object-cover"
                                          />
                                        ) : (
                                          <span className="text-[10px] font-bold text-neutral-600 dark:text-neutral-300">
                                            {displayName.charAt(0).toUpperCase()}
                                          </span>
                                        )}

                                        {note.access?.canShare && (
                                          <button
                                            onClick={() => handleRemoveCollaborator(collab)}
                                            className="absolute inset-0 flex items-center justify-center rounded-full bg-red-500/80 text-white opacity-0 transition-opacity group-hover:opacity-100"
                                            title="Remover colaborador"
                                          >
                                            <X size={10} />
                                          </button>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                                {note.collaborators.length > META_LIST_PREVIEW_LIMIT && (
                                  <button
                                    type="button"
                                    onClick={() => setShowAllCollabs(!showAllCollabs)}
                                    className="dark:hover:text-brand-primary-500 rounded-md border border-neutral-200 bg-neutral-50 px-2.5 py-0.5 text-xs font-medium text-neutral-500 transition-colors hover:border-yellow-500 hover:text-yellow-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:border-yellow-500/50"
                                  >
                                    {showAllCollabs ? "Ver menos" : "Ver mais"}
                                  </button>
                                )}
                              </>
                            )}
                            {note.access?.canShare && (
                              <button
                                onClick={() => setShowShareModal(true)}
                                className="dark:hover:text-brand-primary-500 rounded-md border border-dashed border-neutral-300 px-2 py-0.5 text-xs text-neutral-400 transition-colors hover:border-yellow-500 hover:text-yellow-600 dark:border-neutral-600 dark:text-neutral-500 dark:hover:border-yellow-500/50"
                                title="Adicionar colaborador"
                              >
                                <Plus size={10} />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Relações */}
                        <div className="flex min-w-0 flex-row items-center gap-2 sm:gap-3">
                          <div className="flex shrink-0 items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                            <Link
                              className="dark:text-brand-primary-500 flex-shrink-0 text-yellow-400"
                              size={13}
                            />
                            <span className="font-medium">Relações</span>
                          </div>
                          <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
                            {(showAllRelations
                              ? relatedNotesData
                              : relatedNotesData.slice(0, META_LIST_PREVIEW_LIMIT)
                            ).map((relNote) => (
                              <span
                                key={relNote!.id}
                                className="group flex items-center gap-1 rounded-md border border-neutral-200 bg-neutral-50 px-2.5 py-0.5 text-xs font-medium text-neutral-700 transition-colors hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:border-neutral-600"
                              >
                                <button
                                  onClick={() => router.push(`/notes/${relNote!.id}`)}
                                  className="inline-flex items-center gap-1.5 truncate"
                                >
                                  {relNote!.properties?.icon?.path ? (
                                    <Image
                                      src={getStorageUrl(relNote!.properties.icon.path)}
                                      alt=""
                                      width={12}
                                      height={12}
                                      className="flex-shrink-0 rounded"
                                    />
                                  ) : null}
                                  <span className="max-w-[120px] truncate">
                                    {relNote!.title || "Tarefa sem título"}
                                  </span>
                                </button>
                                {note.access?.canEdit && (
                                  <button
                                    onClick={() => handleRemoveRelation(relNote!.id)}
                                    className="ml-0.5 text-neutral-400 opacity-100 transition-all hover:text-red-500 sm:opacity-0 sm:group-hover:opacity-100 dark:text-neutral-500 dark:hover:text-red-400"
                                    title="Remover relação"
                                  >
                                    <X size={10} />
                                  </button>
                                )}
                              </span>
                            ))}
                            {relatedNotesData.length > META_LIST_PREVIEW_LIMIT && (
                              <button
                                type="button"
                                onClick={() => setShowAllRelations(!showAllRelations)}
                                className="dark:hover:text-brand-primary-500 rounded-md border border-neutral-200 bg-neutral-50 px-2.5 py-0.5 text-xs font-medium text-neutral-500 transition-colors hover:border-yellow-500 hover:text-yellow-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:border-yellow-500/50"
                              >
                                {showAllRelations ? "Ver menos" : "Ver mais"}
                              </button>
                            )}
                            {note.access?.canEdit && (
                              <button
                                onClick={() => setShowRelationModal(true)}
                                className="dark:hover:text-brand-primary-500 rounded-md border border-dashed border-neutral-300 px-2 py-0.5 text-xs text-neutral-400 transition-colors hover:border-yellow-500 hover:text-yellow-600 dark:border-neutral-600 dark:text-neutral-500 dark:hover:border-yellow-500/50"
                                title="Adicionar relação"
                              >
                                <Plus size={10} />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Tags */}
                        <div className="flex min-w-0 flex-row items-center gap-2 sm:gap-3">
                          <div className="flex shrink-0 items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                            <Tag
                              className="dark:text-brand-primary-500 flex-shrink-0 text-yellow-400"
                              size={13}
                            />
                            <span className="font-medium">Tags</span>
                          </div>
                          <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
                            {note.tags && note.tags.length > 0 && (
                              <>
                                {(showAllTags
                                  ? note.tags
                                  : note.tags.slice(0, META_LIST_PREVIEW_LIMIT)
                                ).map((tag, index) => {
                                  const colors = getTagColor(tag);
                                  return (
                                    <span
                                      key={index}
                                      className={`group flex items-center gap-1 rounded-md border px-2.5 py-0.5 text-xs font-medium transition-colors ${colors.bg} ${colors.text} ${colors.border}`}
                                    >
                                      {tag}
                                      {note.access?.canEdit && (
                                        <button
                                          onClick={() => handleRemoveTag(tag)}
                                          className="ml-0.5 text-neutral-400 opacity-100 transition-all hover:text-red-500 sm:opacity-0 sm:group-hover:opacity-100 dark:text-neutral-500 dark:hover:text-red-400"
                                          title="Remover tag"
                                        >
                                          <X size={10} />
                                        </button>
                                      )}
                                    </span>
                                  );
                                })}
                                {note.tags.length > META_LIST_PREVIEW_LIMIT && (
                                  <button
                                    type="button"
                                    onClick={() => setShowAllTags(!showAllTags)}
                                    className="dark:hover:text-brand-primary-500 rounded-md border border-neutral-200 bg-neutral-50 px-2.5 py-0.5 text-xs font-medium text-neutral-500 transition-colors hover:border-yellow-500 hover:text-yellow-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:border-yellow-500/50"
                                  >
                                    {showAllTags ? "Ver menos" : "Ver mais"}
                                  </button>
                                )}
                              </>
                            )}
                            {note.access?.canEdit && (
                              <button
                                onClick={() => setShowTagModal(true)}
                                className="dark:hover:text-brand-primary-500 rounded-md border border-dashed border-neutral-300 px-2 py-0.5 text-xs text-neutral-400 transition-colors hover:border-yellow-500 hover:text-yellow-600 dark:border-neutral-600 dark:text-neutral-500 dark:hover:border-yellow-500/50"
                                title="Adicionar tag"
                              >
                                <Plus size={10} />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* URLs */}
                        <div className="flex min-w-0 flex-row items-center gap-2 sm:gap-3">
                          <div className="flex shrink-0 items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                            <Link2
                              className="dark:text-brand-primary-500 flex-shrink-0 text-yellow-400"
                              size={13}
                            />
                            <span className="font-medium">URLs</span>
                          </div>
                          <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
                            {note.properties?.urls &&
                              (() => {
                                const filteredUrls = note.properties.urls.filter(Boolean);
                                const visibleUrls = showAllUrls
                                  ? filteredUrls
                                  : filteredUrls.slice(0, META_LIST_PREVIEW_LIMIT);
                                return (
                                  <>
                                    {visibleUrls.map((url, index) => (
                                      <span
                                        key={index}
                                        className="group flex items-center gap-1 rounded-md border border-neutral-200 bg-neutral-50 px-2.5 py-0.5 text-xs font-medium text-neutral-700 transition-colors hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:border-neutral-600"
                                      >
                                        <a
                                          href={url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="inline-flex max-w-[150px] items-center gap-1.5 truncate text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
                                        >
                                          <span className="truncate">
                                            {url.replace(/^https?:\/\//, "")}
                                          </span>
                                        </a>
                                        {note.access?.canEdit && (
                                          <button
                                            onClick={() => handleRemoveUrl(url)}
                                            className="ml-0.5 text-neutral-400 opacity-100 transition-all hover:text-red-500 sm:opacity-0 sm:group-hover:opacity-100 dark:text-neutral-500 dark:hover:text-red-400"
                                            title="Remover URL"
                                          >
                                            <X size={10} />
                                          </button>
                                        )}
                                      </span>
                                    ))}
                                    {filteredUrls.length > META_LIST_PREVIEW_LIMIT && (
                                      <button
                                        type="button"
                                        onClick={() => setShowAllUrls(!showAllUrls)}
                                        className="dark:hover:text-brand-primary-500 rounded-md border border-neutral-200 bg-neutral-50 px-2.5 py-0.5 text-xs font-medium text-neutral-500 transition-colors hover:border-yellow-500 hover:text-yellow-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:border-yellow-500/50"
                                      >
                                        {showAllUrls ? "Ver menos" : "Ver mais"}
                                      </button>
                                    )}
                                  </>
                                );
                              })()}
                            {note.access?.canEdit && (
                              <>
                                {showUrlInput ? (
                                  <div className="flex items-center gap-1.5">
                                    <input
                                      type="url"
                                      value={newUrl}
                                      onChange={(e) => setNewUrl(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                          e.preventDefault();
                                          handleAddUrl();
                                        }
                                        if (e.key === "Escape") {
                                          setShowUrlInput(false);
                                          setNewUrl("");
                                        }
                                      }}
                                      placeholder="https://..."
                                      className="w-40 rounded-md border border-neutral-200 bg-transparent px-2 py-0.5 text-xs text-neutral-800 placeholder-neutral-400 outline-none focus:border-yellow-500 dark:border-neutral-700 dark:text-neutral-200 dark:placeholder-neutral-500 dark:focus:border-yellow-500/50"
                                      autoFocus
                                    />
                                    <button
                                      onClick={handleAddUrl}
                                      disabled={!newUrl.trim()}
                                      className="bg-brand-primary-500 rounded-md px-2 py-0.5 text-xs font-medium text-white transition-colors hover:bg-yellow-600 disabled:opacity-50 dark:bg-neutral-50 dark:text-neutral-950 dark:hover:bg-neutral-200"
                                    >
                                      OK
                                    </button>
                                    <button
                                      onClick={() => {
                                        setShowUrlInput(false);
                                        setNewUrl("");
                                      }}
                                      className="text-neutral-400 transition-colors hover:text-neutral-600 dark:hover:text-neutral-300"
                                      title="Cancelar"
                                    >
                                      <X size={10} />
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => setShowUrlInput(true)}
                                    className="dark:hover:text-brand-primary-500 rounded-md border border-dashed border-neutral-300 px-2 py-0.5 text-xs text-neutral-400 transition-colors hover:border-yellow-500 hover:text-yellow-600 dark:border-neutral-600 dark:text-neutral-500 dark:hover:border-yellow-500/50"
                                    title="Adicionar URL"
                                  >
                                    <Plus size={10} />
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </div>

                        {/* Arquivos */}
                        <div className="flex min-w-0 flex-row items-center gap-2 sm:gap-3 lg:col-span-2">
                          <div className="flex shrink-0 items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                            <FileText
                              className="dark:text-brand-primary-500 flex-shrink-0 text-yellow-400"
                              size={13}
                            />
                            <span className="font-medium">Arquivos</span>
                          </div>
                          <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
                            {note.properties?.files &&
                              (() => {
                                const filteredFiles = note.properties.files.filter((f) => f.path);
                                const visibleFiles = showAllFiles
                                  ? filteredFiles
                                  : filteredFiles.slice(0, 2);
                                return (
                                  <>
                                    {visibleFiles.map((file, index) => (
                                      <span
                                        key={file.id || index}
                                        className="group flex items-center gap-1 rounded-md bg-neutral-50 px-2.5 py-0.5 text-xs font-medium text-neutral-700 transition-colors dark:bg-neutral-800 dark:text-neutral-300"
                                      >
                                        <a
                                          href={getStorageUrl(file.path)}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="inline-flex max-w-[120px] items-center gap-1.5 truncate hover:text-neutral-900 dark:hover:text-neutral-100"
                                        >
                                          <span className="truncate">{file.name || "Arquivo"}</span>
                                        </a>
                                        <a
                                          href={getStorageUrl(file.path)}
                                          download={file.name || "arquivo"}
                                          onClick={(e) => e.stopPropagation()}
                                          className="text-neutral-400 opacity-100 dark:text-neutral-500 dark:hover:text-neutral-300"
                                          title="Baixar arquivo"
                                        >
                                          <Download size={10} />
                                        </a>
                                        {note.access?.canEdit && (
                                          <button
                                            onClick={() => handleRemoveFile(file.id)}
                                            className="ml-0.5 text-neutral-400 dark:text-neutral-500 dark:hover:text-red-400"
                                            title="Remover arquivo"
                                          >
                                            <X size={10} />
                                          </button>
                                        )}
                                      </span>
                                    ))}
                                    {filteredFiles.length > 3 && (
                                      <button
                                        onClick={() => setShowAllFiles(!showAllFiles)}
                                        className="dark:hover:text-brand-primary-500 rounded-md border border-neutral-200 bg-neutral-50 px-2.5 py-0.5 text-xs font-medium text-neutral-500 transition-colors hover:border-yellow-500 hover:text-yellow-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:border-yellow-500/50"
                                      >
                                        {showAllFiles
                                          ? "Ver menos"
                                          : `+${filteredFiles.length - 3}`}
                                      </button>
                                    )}
                                  </>
                                );
                              })()}
                            {note.access?.canEdit && (
                              <button
                                onClick={() => filesInputRef.current?.click()}
                                className="dark:hover:text-brand-primary-500 rounded-md border border-dashed border-neutral-300 px-2 py-0.5 text-xs text-neutral-400 transition-colors hover:border-yellow-500 hover:text-yellow-600 dark:border-neutral-600 dark:text-neutral-500 dark:hover:border-yellow-500/50"
                                title="Adicionar arquivo"
                              >
                                <Plus size={10} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Criado / editado — linha superior em largura total; texto limitado a 2/3 */}
                    {(note.created_at || note.updated_at) && (
                      <div className="flex w-full flex-col">
                        <div
                          className="w-full border-t border-neutral-100 dark:border-neutral-800"
                          aria-hidden
                        />
                        <div className="flex w-full max-w-[66.666667%] items-start gap-1.5 pt-3 text-xs text-neutral-500 dark:text-neutral-400">
                          <Clock size={12} className="mt-0.5 shrink-0 text-neutral-400" />
                          <p className="min-w-0 font-medium text-neutral-600 dark:text-neutral-300">
                            {note.created_at ? (
                              <span>Criado em {formatDate(note.created_at)}</span>
                            ) : null}
                            {note.created_at && note.updated_at ? (
                              <span className="text-neutral-400 dark:text-neutral-500"> · </span>
                            ) : null}
                            {note.updated_at ? (
                              <span>Editado em {formatDate(note.updated_at)}</span>
                            ) : null}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Linha inferior entre metadados e blocos — largura total */}
                    <div
                      className="w-full border-b border-neutral-100 dark:border-neutral-800"
                      aria-hidden
                    />
                  </div>

                  {/* =================== EDITOR =================== */}
                  <div className="w-full space-y-0">
                    {blocks.length > 0 ? (
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                      >
                        <SortableContext
                          items={blocks.map((b) => b.id)}
                          strategy={verticalListSortingStrategy}
                        >
                          {blocks.map((block) => (
                            <SortableBlockComponent
                              key={block.id}
                              block={block}
                              noteId={note.id}
                              onUpdate={handleUpdateBlock}
                              onPasteLines={handlePasteLines}
                              onAddBlockAfter={handleAddBlockAfter}
                              onBackspaceEmpty={handleBackspaceEmpty}
                              focusBlockId={focusBlockId}
                              onFocused={() => setFocusBlockId(null)}
                            />
                          ))}
                        </SortableContext>

                        {/* Overlay para mostrar o item sendo arrastado */}
                        <DragOverlay>
                          {activeBlock ? (
                            <div className="rounded-md border border-yellow-500/30 bg-white px-3 py-2 shadow-xl dark:border-yellow-500/50 dark:bg-neutral-900">
                              <BlockComponent
                                block={activeBlock}
                                noteId={note.id}
                                onUpdate={handleUpdateBlock}
                                onPasteLines={async () => {}}
                                onAddBlockAfter={() => {}}
                                isDragging={true}
                              />
                            </div>
                          ) : null}
                        </DragOverlay>
                      </DndContext>
                    ) : (
                      <div className="flex min-h-[80px] flex-col items-center justify-center rounded-md px-4 py-4">
                        <div className="flex items-center gap-2 text-sm text-neutral-400 dark:text-neutral-500">
                          <Loader2 size={14} className="animate-spin" />
                          <span>Criando bloco...</span>
                        </div>
                      </div>
                    )}

                    {/* Botão para adicionar novo bloco */}
                    {note.access?.canEdit && (
                      <div className="pt-4">
                        <button
                          onClick={() => handleAddBlock("paragraph")}
                          className="dark:hover:bg-brand-primary-500/5 dark:hover:text-brand-primary-500 flex items-center gap-2 rounded-md border border-dashed border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-400 transition-all hover:border-yellow-500 hover:bg-yellow-50 hover:text-yellow-600 dark:border-neutral-700 dark:text-neutral-500 dark:hover:border-yellow-500/50"
                        >
                          <Plus size={14} />
                          Nova linha
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Atalhos de teclado - visível apenas em desktop */}
                  {note.access?.canEdit && (
                    <div className="mt-10 hidden border-t border-neutral-100 pt-4 sm:block dark:border-neutral-800">
                      <div className="flex items-center gap-2 text-xs text-neutral-400 dark:text-neutral-500">
                        <Save size={12} />
                        <span>
                          <kbd className="rounded border border-neutral-200 bg-neutral-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-neutral-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400">
                            Enter
                          </kbd>
                          <span className="ml-1.5">novo bloco</span>
                          <span className="mx-2 text-neutral-300 dark:text-neutral-600">|</span>
                          <kbd className="rounded border border-neutral-200 bg-neutral-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-neutral-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400">
                            Espaço
                          </kbd>
                          <span className="ml-1.5">ou</span>
                          <kbd className="ml-1.5 rounded border border-neutral-200 bg-neutral-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-neutral-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400">
                            /
                          </kbd>
                          <span className="ml-1.5">em linha vazia para tipo de bloco</span>
                          <span className="mx-2 text-neutral-300 dark:text-neutral-600">|</span>
                          <kbd className="rounded border border-neutral-200 bg-neutral-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-neutral-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400">
                            Shift+Enter
                          </kbd>
                          <span className="ml-1.5">nova linha</span>
                        </span>
                      </div>
                    </div>
                  )}
                  </div>
                </div>
              </div>

              {commentsSidebarOpen && canUseNoteComments ? (
                <div className="flex w-full shrink-0 flex-col border-t border-neutral-200 bg-white md:h-full md:w-[380px] md:max-w-[42%] md:flex-shrink-0 md:border-t-0 dark:border-neutral-800 dark:bg-neutral-950">
                  <div className="flex h-[min(22rem,52dvh)] max-h-[480px] min-h-[260px] w-full flex-col overflow-hidden md:h-full md:max-h-none md:min-h-0 md:flex-1">
                    <NoteCommentsSidebar
                      canComment={canUseNoteComments}
                      onClose={() => setCommentsSidebarOpen(false)}
                      searchMentionUsers={searchUsers}
                      embeddableNoteFiles={note.properties?.files ?? []}
                    />
                  </div>
                </div>
              ) : null}
            </div>
        </NoteDetailBody>

        <NoteShareModal
          isOpen={showShareModal}
          isSearching={isSearching}
          onClose={() => setShowShareModal(false)}
          onSearchUsers={(value) => {
            setSearchTerm(value);
            handleSearchUsers(value);
          }}
          onShareNote={handleShareNote}
          searchResults={searchResults}
          searchTerm={searchTerm}
        />

        <NoteRelationsModal
          filteredRelationNotes={filteredRelationNotes}
          isOpen={showRelationModal}
          note={note}
          onClose={() => {
            setShowRelationModal(false);
            setRelationSearchTerm("");
          }}
          onRelationSearchTermChange={setRelationSearchTerm}
          onToggleRelation={handleToggleRelation}
          relationSearchTerm={relationSearchTerm}
        />

        <NoteTagsModal
          isOpen={showTagModal}
          newTag={newTag}
          note={note}
          onAddTag={handleAddTag}
          onClose={() => setShowTagModal(false)}
          onNewTagChange={setNewTag}
          onRemoveTag={handleRemoveTag}
        />
      </div>
    </NoteCommentsProvider>
  );
};

export default NoteDetail;
