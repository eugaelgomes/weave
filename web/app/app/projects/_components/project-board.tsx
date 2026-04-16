import React, { useState, useCallback, useMemo } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  closestCenter,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  MoreHorizontal,
  LayoutGrid,
  CheckCircle2,
  Calendar,
  Flag,
  Plus,
} from "lucide-react";
import { useProjects } from "@/app/_contexts/projects-context";
import { useNotes } from "@/app/_contexts/notes-context";

interface ProjectBoardProps {
  stages: any[];
  projectNotes: any[];
  projectTags: any[];
  onNoteStageChange?: (noteId: string, newStageId: string) => void;
}

function NoteCard({
  note,
  getTagMeta,
  onCyclePriority,
  onSetDueDate,
  onRemoveNote,
  isDragging,
}: {
  note: any;
  getTagMeta: (tag: string) => { label: string; color: string };
  onCyclePriority: () => void;
  onSetDueDate: () => void;
  onRemoveNote: () => void;
  isDragging?: boolean;
}) {
  return (
    <div
      className={`group relative rounded-md border border-neutral-200 bg-white p-2 shadow-sm transition-all dark:border-neutral-800 dark:bg-[#121214] ${
        isDragging
          ? "rotate-[2deg] scale-105 shadow-lg ring-2 ring-yellow-400/50"
          : "hover:border-neutral-300 hover:shadow-md dark:hover:border-neutral-700"
      }`}
    >
      <div className="mb-1.5 flex items-start justify-between gap-1.5">
        <p className="text-[11px] leading-snug font-medium text-neutral-800 dark:text-neutral-100">
          {note.title}
        </p>
        <div className="flex shrink-0 items-center opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={onRemoveNote}
            className="text-neutral-400 hover:text-red-500"
            title="Remover do projeto"
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {note.tags && note.tags.length > 0 && (
        <div className="mb-2.5 flex flex-wrap gap-1">
          {note.tags.slice(0, 3).map((tag: string, i: number) => {
            const tagMeta = getTagMeta(tag);
            return (
              <span
                key={`${tag}-${i}`}
                className="rounded-[4px] px-1.5 py-0.5 text-[8.5px] font-semibold tracking-wide"
                style={{
                  backgroundColor: `${tagMeta.color}15`,
                  color: tagMeta.color,
                  border: `1px solid ${tagMeta.color}30`,
                }}
              >
                {tagMeta.label}
              </span>
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-between border-t border-neutral-100 pt-2 dark:border-neutral-800/60">
        <div className="flex items-center gap-1.5">
          <button
            onClick={onSetDueDate}
            className={`flex items-center gap-1 rounded px-1 py-0.5 transition-colors ${
              note.properties?.due_date
                ? "bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20"
                : "bg-neutral-50 text-neutral-400 hover:text-neutral-600 dark:bg-neutral-900 dark:hover:text-neutral-300"
            }`}
            title={
              note.properties?.due_date
                ? `Vencimento: ${note.properties.due_date}`
                : "Adicionar data de vencimento"
            }
          >
            <Calendar className="h-2.5 w-2.5" />
            <span className="text-[8px] font-medium">
              {note.properties?.due_date
                ? new Date(note.properties.due_date).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "short",
                  })
                : "Add"}
            </span>
          </button>

          <button
            onClick={onCyclePriority}
            className={`flex items-center justify-center rounded p-0.5 transition-colors ${
              note.properties?.priority === "alta"
                ? "bg-red-50 text-red-500 dark:bg-red-500/10 dark:text-red-400"
                : note.properties?.priority === "media"
                  ? "bg-orange-50 text-orange-500 dark:bg-orange-500/10 dark:text-orange-400"
                  : note.properties?.priority === "baixa"
                    ? "bg-blue-50 text-blue-500 dark:bg-blue-500/10 dark:text-blue-400"
                    : "bg-neutral-50 text-neutral-400 hover:text-neutral-600 dark:bg-neutral-900 dark:hover:text-neutral-300"
            }`}
            title={`Prioridade: ${note.properties?.priority || "Nenhuma"}`}
          >
            <Flag className="h-2.5 w-2.5" />
          </button>
        </div>

        <div className="flex items-center">
          <button
            className="flex h-4 w-4 items-center justify-center rounded-full border border-dashed border-neutral-300 bg-neutral-50 text-neutral-400 transition-colors hover:border-neutral-400 hover:text-neutral-600 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:text-neutral-300"
            title="Em breve: Atribuir pessoa"
          >
            <Plus className="h-2.5 w-2.5 bg-transparent" />
          </button>
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
}: {
  note: any;
  getTagMeta: (tag: string) => { label: string; color: string };
  onCyclePriority: () => void;
  onSetDueDate: () => void;
  onRemoveNote: () => void;
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
      />
    </div>
  );
}

function DroppableStageColumn({
  stage,
  children,
  count,
}: {
  stage: any;
  children: React.ReactNode;
  count: number;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  const isDoneStage = stage.properties?.is_done;

  return (
    <div
      ref={setNodeRef}
      className={`flex h-full min-h-0 w-[280px] flex-shrink-0 flex-col rounded-md transition-colors ${
        isOver
          ? "bg-yellow-50/60 ring-2 ring-inset ring-yellow-400/40 dark:bg-yellow-500/5 dark:ring-yellow-500/30"
          : "bg-neutral-50/50 dark:bg-neutral-950/30"
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
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-3 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-neutral-200 dark:[&::-webkit-scrollbar-thumb]:bg-neutral-800">
        <div className="flex flex-col gap-2">
          {children}
        </div>
      </div>
    </div>
  );
}

export default function ProjectBoard({
  stages,
  projectNotes,
  projectTags,
  onNoteStageChange,
}: ProjectBoardProps) {
  const { removeNoteFromProject, updateProjectNoteStage } = useProjects();
  const { updateNote } = useNotes();
  const [activeNote, setActiveNote] = useState<any>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const getTagMeta = useCallback(
    (tagValue: string) => {
      const matchingTag = projectTags.find((t) => t.id === tagValue || t.name === tagValue);
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
      if (confirm("Remover esta nota do projeto?")) {
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
      map[stage.id] = projectNotes.filter((n) => n.project_stage_id === stage.id);
    }
    return map;
  }, [sortedStages, projectNotes]);

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const note = projectNotes.find((n) => n.id === event.active.id);
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
      const note = projectNotes.find((n) => n.id === noteId);
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
            >
              {stageNotes.length === 0 ? (
                <div className="flex items-center justify-center rounded-md border border-dashed border-neutral-300 bg-transparent py-8 dark:border-neutral-800">
                  <span className="text-xs text-neutral-400">Solte os cards aqui</span>
                </div>
              ) : (
                stageNotes.map((note) => (
                  <DraggableNoteCard
                    key={note.id}
                    note={note}
                    getTagMeta={getTagMeta}
                    onCyclePriority={() =>
                      handleCyclePriority(note.id, note.properties?.priority)
                    }
                    onSetDueDate={() => handleSetMockDueDate(note.id)}
                    onRemoveNote={() =>
                      handleRemoveNote(
                        note.project_id || note.properties?.project_id,
                        note.id
                      )
                    }
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
              isDragging
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
