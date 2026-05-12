import React, { useCallback, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  type DragEndEvent,
  type DragStartEvent,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  Calendar,
  CheckCircle2,
  ExternalLink,
  Flag,
  LayoutGrid,
  MessageSquare,
  MoreHorizontal,
  Paperclip,
  Plus,
  UserCircle2,
} from "lucide-react";
import { useProjects } from "@/app/_contexts/projects-context";
import { useNotes } from "@/app/_contexts/notes-context";
import getStorageUrl from "@/app/_utils/get-storage-url";
import type { PatchProjectTaskData } from "@/app/_services/projects-service/projects-service";

interface ProjectBoardProps {
  stages: any[];
  projectNotes: any[];
  projectTags: any[];
  onNoteStageChange?: (noteId: string, newStageId: string) => void;
  onAddCard?: (stageId: string) => void;
  onPatchTask?: (noteId: string, patch: PatchProjectTaskData) => Promise<void>;
}

function NoteCard({
  note,
  getTagMeta,
  onCyclePriority,
  onSetDueDate,
  onRemoveNote,
  onOpenNote,
  onPatchTask,
  isDragging,
}: {
  note: any;
  getTagMeta: (tag: string) => { label: string; color: string };
  onCyclePriority: () => void;
  onSetDueDate: () => void;
  onRemoveNote: () => void;
  onOpenNote: () => void;
  onPatchTask?: (noteId: string, patch: PatchProjectTaskData) => Promise<void>;
  isDragging?: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const attachments = Array.isArray(note.properties?.files) ? note.properties.files : [];
  const dueDate = note.properties?.due_date || note.due_date;
  const collaboratorList = Array.isArray(note.collaborators) ? note.collaborators : [];
  const bannerPath = note.properties?.banner?.path;

  const stopDrag = (event: React.SyntheticEvent) => event.stopPropagation();

  const editTags = async () => {
    if (!onPatchTask) return;
    const current = Array.isArray(note.tags) ? note.tags.join(", ") : "";
    const raw = prompt("IDs das tags (separadas por vírgula):", current);
    if (raw === null) return;
    const set_tags = raw
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
    await onPatchTask(note.id, { set_tags });
  };

  const editCollaborators = async () => {
    if (!onPatchTask) return;
    const current = collaboratorList
      .map((collaborator: any) => collaborator.user_id || collaborator.id)
      .filter(Boolean)
      .join(", ");
    const raw = prompt("IDs de colaboradores (separados por vírgula):", current);
    if (raw === null) return;
    const set_collaborators = raw
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    await onPatchTask(note.id, { set_collaborators });
  };

  const removeFiles = async () => {
    if (!onPatchTask || attachments.length === 0) return;
    const raw = prompt(
      "IDs de arquivos para remover (separados por vírgula):",
      attachments.map((file: any) => file.id).join(", ")
    );
    if (raw === null) return;
    const remove_file_ids = raw
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    await onPatchTask(note.id, { remove_file_ids });
  };

  const uploadFiles = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!onPatchTask) return;
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;
    await onPatchTask(note.id, { files });
    event.target.value = "";
  };

  return (
    <div
      className={`group relative rounded-md border border-neutral-200 bg-white p-3 shadow-sm transition-all dark:border-surface-dark-border dark:bg-[#121214] ${
        isDragging
          ? "rotate-[2deg] scale-105 shadow-lg ring-2 ring-brand-primary-500/40"
          : "hover:border-neutral-300 hover:shadow-md dark:hover:border-surface-dark-border-strong"
      }`}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex flex-wrap gap-1">
          {(note.tags || []).slice(0, 3).map((tag: string, index: number) => {
            const tagMeta = getTagMeta(tag);
            return (
              <span
                key={`${tag}-${index}`}
                className="rounded-md border px-1.5 py-0.5 text-[9px] font-semibold"
                style={{
                  backgroundColor: `${tagMeta.color}14`,
                  borderColor: `${tagMeta.color}33`,
                  color: tagMeta.color,
                }}
              >
                {tagMeta.label}
              </span>
            );
          })}
        </div>
        <div className="relative">
          <button
            onPointerDown={stopDrag}
            onClick={(event) => {
              stopDrag(event);
              setMenuOpen((prev) => !prev);
            }}
            title="Abrir ações da tarefa"
            className="rounded-md p-1 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </button>
          {menuOpen && (
            <div
              onPointerDown={stopDrag}
              className="absolute top-7 right-0 z-20 flex w-44 flex-col rounded-md border border-neutral-200 bg-white p-1 shadow-md dark:border-surface-dark-border dark:bg-[#171717]"
            >
              <button
                onClick={() => {
                  setMenuOpen(false);
                  onOpenNote();
                }}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
              >
                <ExternalLink className="h-3 w-3" />
                Abrir nota
              </button>
              <button
                onClick={async () => {
                  setMenuOpen(false);
                  await editTags();
                }}
                className="rounded-md px-2 py-1.5 text-left text-xs text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
              >
                Editar tags
              </button>
              <button
                onClick={async () => {
                  setMenuOpen(false);
                  await editCollaborators();
                }}
                className="rounded-md px-2 py-1.5 text-left text-xs text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
              >
                Editar colaboradores
              </button>
              <button
                onClick={async () => {
                  setMenuOpen(false);
                  await removeFiles();
                }}
                className="rounded-md px-2 py-1.5 text-left text-xs text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
              >
                Remover arquivos
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="rounded-md px-2 py-1.5 text-left text-xs text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
              >
                Adicionar arquivo
              </button>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  onCyclePriority();
                }}
                className="rounded-md px-2 py-1.5 text-left text-xs text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
              >
                Alterar prioridade
              </button>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  onSetDueDate();
                }}
                className="rounded-md px-2 py-1.5 text-left text-xs text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
              >
                Definir vencimento
              </button>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  onRemoveNote();
                }}
                className="rounded-md px-2 py-1.5 text-left text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
              >
                Remover do projeto
              </button>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            multiple
            onChange={uploadFiles}
          />
        </div>
      </div>

      <p className="mb-2 text-sm leading-snug font-semibold text-neutral-800 dark:text-neutral-100">
        {note.title}
      </p>

      {bannerPath && (
        <div className="relative mb-2 h-28 w-full overflow-hidden rounded-md border border-neutral-200 dark:border-surface-dark-border">
          <Image src={getStorageUrl(bannerPath)} alt="" fill className="object-cover" />
        </div>
      )}

      <div className="flex items-center justify-between border-t border-neutral-100 pt-2 dark:border-surface-dark-border">
        <div className="flex items-center gap-2 text-[10px] text-neutral-500 dark:text-neutral-300">
          <span className="inline-flex items-center gap-1">
            <MessageSquare className="h-3 w-3" />
            {typeof note.comments_count === "number" ? note.comments_count : "--"}
          </span>
          <span className="inline-flex items-center gap-1">
            <Paperclip className="h-3 w-3" />
            {attachments.length}
          </span>
          <button
            onPointerDown={stopDrag}
            onClick={onSetDueDate}
            className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 transition-colors ${
              dueDate
                ? "bg-brand-primary-500/15 text-brand-primary-500"
                : "bg-neutral-100 text-neutral-500 hover:text-neutral-700 dark:bg-[#1d1d1b] dark:text-neutral-300"
            }`}
          >
            <Calendar className="h-3 w-3" />
            <span>
              {dueDate
                ? new Date(dueDate).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "short",
                  })
                : "Data"}
            </span>
          </button>
          <button
            onPointerDown={stopDrag}
            onClick={onCyclePriority}
            title={`Prioridade: ${note.properties?.priority || "nenhuma"}`}
            className="inline-flex items-center justify-center rounded-md bg-neutral-100 p-1 text-neutral-500 transition-colors hover:text-neutral-700 dark:bg-[#1d1d1b] dark:text-neutral-300"
          >
            <Flag className="h-3 w-3" />
          </button>
        </div>

        <div className="flex items-center gap-1">
          {collaboratorList.slice(0, 3).map((collaborator: any) => {
            const id = collaborator.user_id || collaborator.id;
            const label = collaborator.username || collaborator.name || "?";
            const avatar = collaborator.avatar_url;
            return (
              <div
                key={id}
                className="relative flex h-6 w-6 items-center justify-center overflow-hidden rounded-full border border-white bg-neutral-200 text-[10px] font-semibold text-neutral-700 dark:border-[#121214] dark:bg-neutral-700 dark:text-neutral-100"
                title={label}
              >
                {avatar ? (
                  <Image src={getStorageUrl(avatar)} alt={label} fill className="object-cover" />
                ) : (
                  label.slice(0, 1).toUpperCase()
                )}
              </div>
            );
          })}
          {collaboratorList.length === 0 && <UserCircle2 className="h-4 w-4 text-neutral-400" />}
        </div>
      </div>
    </div>
  );
}

function DraggableNoteCard({
  note,
  getTagMeta,
  onCyclePriority,
  onSetDueDate,
  onRemoveNote,
  onOpenNote,
  onPatchTask,
}: {
  note: any;
  getTagMeta: (tag: string) => { label: string; color: string };
  onCyclePriority: () => void;
  onSetDueDate: () => void;
  onRemoveNote: () => void;
  onOpenNote: () => void;
  onPatchTask?: (noteId: string, patch: PatchProjectTaskData) => Promise<void>;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: note.id,
    data: { note },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`cursor-grab touch-none ${isDragging ? "opacity-30" : ""}`}
    >
      <NoteCard
        note={note}
        getTagMeta={getTagMeta}
        onCyclePriority={onCyclePriority}
        onSetDueDate={onSetDueDate}
        onRemoveNote={onRemoveNote}
        onOpenNote={onOpenNote}
        onPatchTask={onPatchTask}
      />
    </div>
  );
}

function DroppableStageColumn({
  stage,
  children,
  count,
  onAddCard,
}: {
  stage: any;
  children: React.ReactNode;
  count: number;
  onAddCard?: (stageId: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  const isDoneStage = stage.properties?.is_done;

  return (
    <div
      ref={setNodeRef}
      className={`flex h-full min-h-0 w-[280px] flex-shrink-0 flex-col rounded-md transition-colors ${
        isOver
          ? "bg-brand-primary-500/10 ring-2 ring-inset ring-brand-primary-500/30"
          : "bg-neutral-50/50 dark:bg-[#1d1d1b]/30"
      }`}
    >
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-2">
          <div
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: stage.color || "#A3A3A3" }}
          />
          <h3 className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
            {stage.name}
          </h3>
          {isDoneStage && <CheckCircle2 className="h-3 w-3 text-emerald-500" />}
          <span className="ml-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-neutral-200/50 px-1.5 text-[10px] font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
            {count}
          </span>
        </div>
        {onAddCard && (
          <button
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onAddCard(stage.id);
            }}
            className="bg-brand-primary-500 inline-flex items-center justify-center rounded-md p-1 text-neutral-900 transition-opacity hover:opacity-90"
            title="Criar tarefa neste estágio"
          >
            <Plus className="h-3 w-3" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-3 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-neutral-200 dark:[&::-webkit-scrollbar-thumb]:bg-neutral-800">
        <div className="flex flex-col gap-2">{children}</div>
      </div>
    </div>
  );
}

export default function ProjectBoardV2({
  stages,
  projectNotes,
  projectTags,
  onNoteStageChange,
  onAddCard,
  onPatchTask,
}: ProjectBoardProps) {
  const router = useRouter();
  const { removeNoteFromProject, updateProjectNoteStage } = useProjects();
  const { updateNote } = useNotes();
  const [activeNote, setActiveNote] = useState<any>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const getTagMeta = useCallback(
    (tagValue: string) => {
      const matchingTag = projectTags.find((tag) => tag.id === tagValue || tag.name === tagValue);
      return {
        label: matchingTag?.name || tagValue,
        color: matchingTag?.color_hex || "#737373",
      };
    },
    [projectTags]
  );

  const handleCyclePriority = useCallback(
    async (noteId: string, currentPriority?: string) => {
      const nextMap: Record<string, string> = {
        nenhuma: "baixa",
        baixa: "media",
        media: "alta",
        alta: "nenhuma",
      };
      const newPriority = nextMap[currentPriority || "nenhuma"];
      await updateNote(noteId, { properties: { priority: newPriority } });
    },
    [updateNote]
  );

  const handleSetMockDueDate = useCallback(
    async (noteId: string) => {
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      await updateNote(noteId, {
        properties: { due_date: nextWeek.toISOString().split("T")[0] },
      });
    },
    [updateNote]
  );

  const handleRemoveNote = useCallback(
    async (projectId: string, noteId: string) => {
      if (confirm("Remover esta tarefa do projeto?")) {
        await removeNoteFromProject(projectId, noteId);
      }
    },
    [removeNoteFromProject]
  );

  const sortedStages = useMemo(
    () => [...stages].sort((a, b) => a.position - b.position),
    [stages]
  );

  const notesByStage = useMemo(() => {
    const map: Record<string, any[]> = {};
    for (const stage of sortedStages) {
      map[stage.id] = projectNotes.filter((note) => note.project_stage_id === stage.id);
    }
    return map;
  }, [sortedStages, projectNotes]);

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const note = projectNotes.find((item) => item.id === event.active.id);
      setActiveNote(note ?? null);
    },
    [projectNotes]
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      setActiveNote(null);
      const { active, over } = event;
      if (!over) return;

      const noteId = active.id as string;
      const note = projectNotes.find((item) => item.id === noteId);
      if (!note) return;

      const targetStageId = over.id as string;
      if (note.project_stage_id === targetStageId) return;

      const projectId = note.project_id || note.properties?.project_id;
      if (!projectId) return;

      onNoteStageChange?.(noteId, targetStageId);

      try {
        await updateProjectNoteStage(projectId, noteId, targetStageId);
      } catch {
        onNoteStageChange?.(noteId, note.project_stage_id);
      }
    },
    [projectNotes, updateProjectNoteStage, onNoteStageChange]
  );

  if (stages.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center text-neutral-400">
        <LayoutGrid className="mb-3 h-8 w-8 text-neutral-300 dark:text-neutral-700" />
        <p className="text-sm font-medium">Nenhum estágio configurado para este quadro.</p>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-full min-h-0 gap-4 overflow-x-auto overflow-y-hidden p-2 [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-neutral-300 dark:[&::-webkit-scrollbar-thumb]:bg-neutral-700">
        {sortedStages.map((stage) => {
          const stageNotes = notesByStage[stage.id] ?? [];
          return (
            <DroppableStageColumn
              key={stage.id}
              stage={stage}
              count={stageNotes.length}
              onAddCard={onAddCard}
            >
              {stageNotes.length === 0 ? (
                <div className="flex items-center justify-center rounded-md border border-dashed border-neutral-300 bg-transparent py-8 dark:border-surface-dark-border">
                  <span className="text-xs text-neutral-400">Solte os cards aqui</span>
                </div>
              ) : (
                stageNotes.map((note) => (
                  <DraggableNoteCard
                    key={note.id}
                    note={note}
                    getTagMeta={getTagMeta}
                    onCyclePriority={() => handleCyclePriority(note.id, note.properties?.priority)}
                    onSetDueDate={() => handleSetMockDueDate(note.id)}
                    onRemoveNote={() =>
                      handleRemoveNote(note.project_id || note.properties?.project_id, note.id)
                    }
                    onOpenNote={() => router.push(`/notes/${note.id}`)}
                    onPatchTask={onPatchTask}
                  />
                ))
              )}
            </DroppableStageColumn>
          );
        })}
      </div>

      <DragOverlay dropAnimation={{ duration: 200, easing: "ease" }}>
        {activeNote ? (
          <div className="w-[264px]">
            <NoteCard
              note={activeNote}
              getTagMeta={getTagMeta}
              onCyclePriority={() => {}}
              onSetDueDate={() => {}}
              onRemoveNote={() => {}}
              onOpenNote={() => {}}
              isDragging
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
