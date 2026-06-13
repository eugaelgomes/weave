import React, { useCallback, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
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
  Flag,
  LayoutGrid,
  ListPlus,
  Paperclip,
  Plus,
  Tags,
  Trash2,
  Unlink,
  UserCircle2,
  Users,
} from "lucide-react";
import { useProjects } from "@/app/_contexts/projects-context";
import { useTheme } from "@/app/_contexts/theme-context";
import getStorageUrl from "@/app/_utils/get-storage-url";
import { plainTextPreview } from "@/app/_utils/note-text-preview";
import type { PatchProjectTaskData } from "@/app/_services/projects-service/projects-service";
import type { TaskPriority } from "@/app/_services/projects-service/project-taxonomy.schema";
import { CompactTaskModal } from "@/app/(protected)/[orgId]/projects/_components/compact-task-modal";
import {
  TaskCardCollaboratorsPicker,
  TaskCardTagsPicker,
  normalizeNoteCollaboratorIds,
  normalizeNoteTagIds,
  type ProjectCollaboratorOption,
  type ProjectTagOption,
} from "@/app/(protected)/[orgId]/projects/_components/task-card-meta-pickers";
import { useTaskNoteModal } from "@/app/(protected)/_components/task-note-modal";
import { syncProjectTaskUrl } from "@/app/_utils/note-path";

const COLUMN_WIDTH_CLASS = "w-[232px]";

const TASK_CARD_FOOTER_ACTION = {
  attachments: { icon: "text-sky-500", active: "bg-sky-500/10" },
  tags: { icon: "text-amber-500", active: "bg-amber-500/10" },
  collaborators: { icon: "text-violet-500", active: "bg-violet-500/10" },
  date: { icon: "text-emerald-500", active: "bg-brand-primary-500/15 text-brand-primary-500" },
  priority: { icon: "text-orange-500", active: "" },
} as const;

function footerActionButtonClass(
  action: keyof typeof TASK_CARD_FOOTER_ACTION,
  opts: { disabled?: boolean; active?: boolean; extra?: string }
): string {
  const palette = TASK_CARD_FOOTER_ACTION[action];
  const useActiveStyle = Boolean(opts.active && palette.active);
  return [
    "inline-flex items-center gap-0.5 rounded-md p-0.5 transition-colors",
    opts.disabled
      ? "cursor-not-allowed opacity-40"
      : "hover:bg-neutral-100 dark:hover:bg-neutral-800",
    useActiveStyle ? palette.active : palette.icon,
    opts.extra ?? "",
  ]
    .filter(Boolean)
    .join(" ");
}
const DRAG_OVERLAY_CARD_CLASS = "w-[208px]";

type DropTargetData =
  | { type: "stage"; stageId: string }
  | { type: "task"; noteId: string; stageId: string };

function normalizeStageHex(color: string | undefined | null): string {
  if (!color || typeof color !== "string") return "#a3a3a3";
  let c = color.trim();
  if (!c.startsWith("#")) c = `#${c}`;
  if (c.length === 4 && /^#[0-9A-Fa-f]{3}$/i.test(c)) {
    const r = c[1];
    const g = c[2];
    const b = c[3];
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  if (c.length === 7 && /^#[0-9A-Fa-f]{6}$/i.test(c)) return c.toLowerCase();
  return "#a3a3a3";
}

function stageColumnBackgroundStyle(
  stageColor: string | undefined,
  theme: "light" | "dark"
): React.CSSProperties {
  const hex = normalizeStageHex(stageColor);
  if (theme === "dark") {
    return {
      background: `color-mix(in srgb, ${hex} 16%, rgb(29 29 27 / 0.92))`,
    };
  }
  return {
    background: `color-mix(in srgb, ${hex} 12%, rgb(250 250 250))`,
  };
}

function toDateInputValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

type StageTree = { roots: any[]; childrenMap: Record<string, any[]>; count: number };

function buildStageTree(stageId: string, allNotes: any[]): StageTree {
  const inStage = allNotes.filter((n) => n.project_stage_id === stageId);
  const inStageIds = new Set(inStage.map((n) => String(n.id)));
  const roots = inStage.filter((n) => !n.parent_id || !inStageIds.has(String(n.parent_id)));
  roots.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  const childrenMap: Record<string, any[]> = {};
  for (const n of inStage) {
    const pid = n.parent_id != null ? String(n.parent_id) : "";
    if (!pid || !inStageIds.has(pid)) continue;
    if (!childrenMap[pid]) childrenMap[pid] = [];
    childrenMap[pid].push(n);
  }
  for (const key of Object.keys(childrenMap)) {
    childrenMap[key].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  }
  return { roots, childrenMap, count: inStage.length };
}

function getDropTargetData(data: unknown): DropTargetData | null {
  if (!data || typeof data !== "object") return null;
  const target = data as { type?: unknown; noteId?: unknown; stageId?: unknown };
  if (target.type === "stage" && typeof target.stageId === "string") {
    return { type: "stage", stageId: target.stageId };
  }
  if (
    target.type === "task" &&
    typeof target.noteId === "string" &&
    typeof target.stageId === "string"
  ) {
    return { type: "task", noteId: target.noteId, stageId: target.stageId };
  }
  return null;
}

function isDescendantNote(notes: any[], ancestorId: string, possibleDescendantId: string): boolean {
  const notesById = new Map(notes.map((note) => [String(note.id), note]));
  let current = notesById.get(possibleDescendantId);
  const visited = new Set<string>();

  while (current?.parent_id) {
    const parentId = String(current.parent_id);
    if (parentId === ancestorId) return true;
    if (visited.has(parentId)) return false;
    visited.add(parentId);
    current = notesById.get(parentId);
  }

  return false;
}

type TaskModalKind = "attachments" | "date" | "priority" | "tags" | "collaborators";

interface ProjectBoardProps {
  stages: any[];
  projectNotes: any[];
  /** Project public id for shareable /projects/.../tasks/... URLs. */
  projectPublicId?: string;
  projectTags: ProjectTagOption[];
  projectCollaborators: ProjectCollaboratorOption[];
  taskPriorities: TaskPriority[];
  onNoteStageChange?: (noteId: string, newStageId: string) => void;
  onAddCard?: (stageId: string) => void;
  onAddSubtask?: (parentNoteId: string, stageId: string, parentTitle: string) => void;
  onProjectNotesReplaced?: (notes: any[]) => void;
  onPatchTask?: (noteId: string, patch: PatchProjectTaskData) => Promise<void>;
}

function NoteCard({
  note,
  getTagMeta,
  projectTags,
  projectCollaborators,
  onOpenNote,
  onPatchTask,
  taskPriorities,
  stageId,
  onAddSubtask,
  isDragging,
}: {
  note: any;
  getTagMeta: (tag: string) => { label: string; color: string };
  projectTags: ProjectTagOption[];
  projectCollaborators: ProjectCollaboratorOption[];
  onOpenNote: () => void;
  onPatchTask?: (noteId: string, patch: PatchProjectTaskData) => Promise<void>;
  taskPriorities: TaskPriority[];
  stageId?: string | null;
  onAddSubtask?: (parentNoteId: string, stageId: string, parentTitle: string) => void;
  isDragging?: boolean;
}) {
  const [activeModal, setActiveModal] = useState<TaskModalKind | null>(null);
  const [dateDraft, setDateDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const attachments = Array.isArray(note.properties?.files) ? note.properties.files : [];
  const dueDate = note.properties?.due_date || note.due_date;
  const collaboratorList = Array.isArray(note.collaborators) ? note.collaborators : [];
  const canWrite = Boolean(onPatchTask);

  const contentSnippet = useMemo(() => {
    const raw =
      (note.description as string | undefined) || (note.preview as string | undefined) || "";
    return plainTextPreview(raw, 120);
  }, [note.description, note.preview]);

  const sortedPriorities = useMemo(
    () => [...taskPriorities].sort((a, b) => a.sort_order - b.sort_order),
    [taskPriorities]
  );

  const activePriorityMeta = useMemo(() => {
    if (!note.priority_id) return null;
    return sortedPriorities.find((p) => p.id === note.priority_id) ?? null;
  }, [note.priority_id, sortedPriorities]);

  const selectedTagIds = useMemo(
    () => normalizeNoteTagIds(note.tags, projectTags),
    [note.tags, projectTags]
  );

  const selectedCollaboratorIds = useMemo(
    () => normalizeNoteCollaboratorIds(collaboratorList),
    [collaboratorList]
  );

  const hasTags = selectedTagIds.size > 0;
  const hasCollaborators = selectedCollaboratorIds.size > 0;

  const stopDrag = (event: React.SyntheticEvent) => event.stopPropagation();

  const openModal = (kind: TaskModalKind) => {
    if (kind === "date") {
      setDateDraft(toDateInputValue(dueDate));
    }
    setActiveModal(kind);
  };

  const closeModal = () => {
    setActiveModal(null);
    setSaving(false);
  };

  const handleToggleTag = async (tagId: string, selected: boolean) => {
    if (!onPatchTask) return;
    setSaving(true);
    try {
      await onPatchTask(note.id, selected ? { remove_tags: [tagId] } : { add_tags: [tagId] });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleCollaborator = async (userId: string, selected: boolean) => {
    if (!onPatchTask) return;
    setSaving(true);
    try {
      await onPatchTask(
        note.id,
        selected ? { remove_collaborators: [userId] } : { add_collaborators: [userId] }
      );
    } finally {
      setSaving(false);
    }
  };

  const applyPriority = async (priorityId: string | null) => {
    if (!onPatchTask) return;
    setSaving(true);
    try {
      await onPatchTask(note.id, { priority_id: priorityId });
      closeModal();
    } finally {
      setSaving(false);
    }
  };

  const saveDate = async (clear: boolean) => {
    if (!onPatchTask) return;
    if (!clear && !dateDraft) return;
    setSaving(true);
    try {
      const due_date =
        clear || !dateDraft ? null : new Date(`${dateDraft}T12:00:00.000Z`).toISOString();
      await onPatchTask(note.id, { due_date });
      closeModal();
    } finally {
      setSaving(false);
    }
  };

  const removeAttachment = async (fileId: string) => {
    if (!onPatchTask) return;
    setSaving(true);
    try {
      await onPatchTask(note.id, { remove_file_ids: [fileId] });
    } finally {
      setSaving(false);
    }
  };

  const uploadFiles = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!onPatchTask) return;
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;
    setSaving(true);
    try {
      await onPatchTask(note.id, { files });
    } finally {
      setSaving(false);
      event.target.value = "";
    }
  };

  return (
    <>
      <div
        className={`group dark:border-surface-dark-border relative rounded-md border border-neutral-200 bg-white p-2.5 shadow-sm transition-all dark:bg-[#121214] ${
          isDragging
            ? "ring-brand-primary-500/40 scale-105 rotate-[2deg] shadow-lg ring-2"
            : "dark:hover:border-surface-dark-border-strong hover:border-neutral-300 hover:shadow-md"
        }`}
      >
        {(onAddSubtask && stageId) || (note.parent_id && canWrite) ? (
          <div className="absolute top-1 right-1 z-10 flex items-center gap-0.5">
            {note.parent_id && canWrite ? (
              <button
                type="button"
                onPointerDown={stopDrag}
                onClick={(event) => {
                  stopDrag(event);
                  void onPatchTask?.(note.id, { parent_id: null });
                }}
                title="Tornar tarefa principal"
                className="rounded-md bg-white/90 p-1 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 dark:bg-[#121214]/90 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
              >
                <Unlink className="h-3.5 w-3.5" />
              </button>
            ) : null}
            {onAddSubtask && stageId ? (
              <button
                type="button"
                onPointerDown={stopDrag}
                onClick={(event) => {
                  stopDrag(event);
                  onAddSubtask(note.id, stageId, String(note.title ?? ""));
                }}
                title="Adicionar subtarefa"
                className="rounded-md bg-white/90 p-1 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 dark:bg-[#121214]/90 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
              >
                <ListPlus className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
        ) : null}

        {(note.tags?.length ?? 0) > 0 ? (
          <div className="mb-1 flex flex-wrap gap-1 pr-14">
            {(note.tags || []).slice(0, 3).map((tag: string, index: number) => {
              const tagMeta = getTagMeta(tag);
              return (
                <span
                  key={`${tag}-${index}`}
                  className="rounded-md border px-1.5 py-0.5 text-[9px]"
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
        ) : null}

        <button
          type="button"
          onPointerDown={stopDrag}
          onClick={(event) => {
            stopDrag(event);
            onOpenNote();
          }}
          className={`hover:text-brand-primary-500 dark:hover:text-brand-primary-500 mb-1 w-full cursor-pointer text-left text-xs leading-snug text-neutral-800 transition-colors hover:underline dark:text-neutral-100 ${
            (onAddSubtask && stageId) || (note.parent_id && canWrite) ? "pr-14" : ""
          }`}
        >
          {note.title}
        </button>

        {contentSnippet ? (
          <p className="mb-1.5 line-clamp-3 text-xs leading-snug text-neutral-500 dark:text-neutral-400">
            {contentSnippet}
          </p>
        ) : null}

        <div className="dark:border-surface-dark-border flex flex-wrap items-center justify-between gap-1 border-t border-neutral-100 pt-1.5">
          <div className="flex flex-wrap items-center gap-0.5 text-[9px] text-neutral-500 dark:text-neutral-300">
            <button
              type="button"
              onPointerDown={stopDrag}
              onClick={() => openModal("attachments")}
              title="Anexos"
              className={footerActionButtonClass("attachments", {
                disabled: !canWrite,
                active: attachments.length > 0,
              })}
            >
              <Paperclip className="h-2.5 w-2.5 shrink-0" />
              <span className="tabular-nums">{attachments.length}</span>
            </button>
            <button
              type="button"
              onPointerDown={stopDrag}
              onClick={() => canWrite && openModal("tags")}
              disabled={!canWrite}
              title="Tags"
              className={footerActionButtonClass("tags", {
                disabled: !canWrite,
                active: hasTags,
              })}
            >
              <Tags className="h-2.5 w-2.5 shrink-0" />
            </button>
            <button
              type="button"
              onPointerDown={stopDrag}
              onClick={() => canWrite && openModal("collaborators")}
              disabled={!canWrite}
              title="Colaboradores"
              className={footerActionButtonClass("collaborators", {
                disabled: !canWrite,
                active: hasCollaborators,
              })}
            >
              <Users className="h-2.5 w-2.5 shrink-0" />
            </button>
            <button
              type="button"
              onPointerDown={stopDrag}
              onClick={() => canWrite && openModal("date")}
              disabled={!canWrite}
              title="Data de vencimento"
              className={footerActionButtonClass("date", {
                disabled: !canWrite,
                active: Boolean(dueDate),
              })}
            >
              <Calendar className="h-2.5 w-2.5 shrink-0" />
              <span className="text-[9px]">
                {dueDate
                  ? new Date(dueDate).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "short",
                    })
                  : "Data"}
              </span>
            </button>
            <button
              type="button"
              onPointerDown={stopDrag}
              onClick={() => canWrite && openModal("priority")}
              disabled={!canWrite}
              title={activePriorityMeta?.name || "Prioridade"}
              className={footerActionButtonClass("priority", {
                disabled: !canWrite,
                active: Boolean(activePriorityMeta),
              })}
              style={
                activePriorityMeta?.color_hex
                  ? {
                      backgroundColor: `${activePriorityMeta.color_hex}22`,
                      color: activePriorityMeta.color_hex || undefined,
                    }
                  : undefined
              }
            >
              <Flag className="h-2.5 w-2.5 shrink-0" />
            </button>
          </div>

          <div className="flex shrink-0 items-center gap-0.5">
            {collaboratorList.slice(0, 3).map((collaborator: any) => {
              const id = collaborator.user_id || collaborator.id;
              const label = collaborator.username || collaborator.name || "?";
              const avatar = collaborator.avatar_url;
              return (
                <div
                  key={id}
                  className="relative flex h-5 w-5 items-center justify-center overflow-hidden rounded-full border border-white bg-neutral-200 text-[9px] text-neutral-700 dark:border-[#121214] dark:bg-neutral-700 dark:text-neutral-100"
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
            {collaboratorList.length === 0 && (
              <UserCircle2 className="h-3.5 w-3.5 text-neutral-400" />
            )}
          </div>
        </div>
      </div>

      {activeModal === "attachments" && (
        <CompactTaskModal title="Anexos" onClose={closeModal}>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            multiple
            disabled={!canWrite || saving}
            onChange={uploadFiles}
          />
          {attachments.length === 0 ? (
            <p className="mb-2 text-neutral-500 dark:text-neutral-400">Nenhum arquivo.</p>
          ) : (
            <ul className="mb-2 max-h-40 space-y-1 overflow-y-auto">
              {attachments.map((file: { id: string; name?: string }) => (
                <li
                  key={file.id}
                  className="dark:border-surface-dark-border flex items-center justify-between gap-2 rounded border border-neutral-100 px-2 py-1"
                >
                  <span className="min-w-0 truncate text-neutral-700 dark:text-neutral-200">
                    {file.name || file.id}
                  </span>
                  {canWrite && (
                    <button
                      type="button"
                      title="Remover"
                      disabled={saving}
                      onClick={() => void removeAttachment(file.id)}
                      className="shrink-0 rounded p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
          {canWrite && (
            <button
              type="button"
              disabled={saving}
              onClick={() => fileInputRef.current?.click()}
              className="bg-brand-primary-500 w-full rounded-md py-2 text-neutral-900 transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              Adicionar arquivos
            </button>
          )}
        </CompactTaskModal>
      )}

      {activeModal === "date" && canWrite && (
        <CompactTaskModal title="Data de vencimento" onClose={closeModal}>
          <label className="mb-2 block text-neutral-600 dark:text-neutral-400">
            <span className="mb-1 block">Data</span>
            <input
              type="date"
              value={dateDraft}
              onChange={(e) => setDateDraft(e.target.value)}
              className="dark:border-surface-dark-border w-full rounded-md border border-neutral-200 bg-white px-2 py-1.5 text-neutral-800 dark:bg-[#121214] dark:text-neutral-100"
            />
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => void saveDate(true)}
              className="dark:border-surface-dark-border flex-1 rounded-md border border-neutral-200 py-2"
            >
              Limpar
            </button>
            <button
              type="button"
              disabled={saving || !dateDraft}
              onClick={() => void saveDate(false)}
              className="bg-brand-primary-500 flex-1 rounded-md py-2 text-neutral-900 disabled:opacity-50"
            >
              Guardar
            </button>
          </div>
        </CompactTaskModal>
      )}

      {activeModal === "priority" && canWrite && (
        <CompactTaskModal title="Prioridade" onClose={closeModal}>
          <div className="max-h-48 space-y-1.5 overflow-y-auto">
            <label
              className={`flex cursor-pointer items-center gap-2 rounded-md border border-transparent px-1 py-0.5 hover:bg-neutral-50 dark:hover:bg-neutral-800/80 ${
                saving ? "pointer-events-none opacity-50" : ""
              }`}
            >
              <input
                type="radio"
                name={`pri-${note.id}`}
                checked={!note.priority_id}
                onChange={() => void applyPriority(null)}
                className="accent-brand-primary-500"
              />
              <span>Nenhuma</span>
            </label>
            {sortedPriorities.map((p) => (
              <label
                key={p.id}
                className={`flex cursor-pointer items-center gap-2 rounded-md border border-transparent px-1 py-0.5 hover:bg-neutral-50 dark:hover:bg-neutral-800/80 ${
                  saving ? "pointer-events-none opacity-50" : ""
                }`}
              >
                <input
                  type="radio"
                  name={`pri-${note.id}`}
                  checked={note.priority_id === p.id}
                  onChange={() => void applyPriority(p.id)}
                  className="accent-brand-primary-500"
                />
                <span
                  className="inline-flex items-center gap-1"
                  style={{ color: p.color_hex || undefined }}
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: p.color_hex || "#737373" }}
                  />
                  {p.name}
                </span>
              </label>
            ))}
          </div>
        </CompactTaskModal>
      )}

      {activeModal === "tags" && canWrite && (
        <CompactTaskModal title="Tags" onClose={closeModal} size="md">
          <TaskCardTagsPicker
            projectTags={projectTags}
            selectedTagIds={selectedTagIds}
            disabled={!canWrite}
            saving={saving}
            onToggle={handleToggleTag}
          />
        </CompactTaskModal>
      )}

      {activeModal === "collaborators" && canWrite && (
        <CompactTaskModal title="Colaboradores" onClose={closeModal} size="md">
          <TaskCardCollaboratorsPicker
            projectCollaborators={projectCollaborators}
            selectedUserIds={selectedCollaboratorIds}
            disabled={!canWrite}
            saving={saving}
            onToggle={handleToggleCollaborator}
          />
        </CompactTaskModal>
      )}
    </>
  );
}

function TaskBranch({
  note,
  childrenMap,
  getTagMeta,
  projectTags,
  projectCollaborators,
  onOpenNote,
  onPatchTask,
  taskPriorities,
  stageId,
  onAddSubtask,
  activeNoteId,
  allNotes,
  depth,
}: {
  note: any;
  childrenMap: Record<string, any[]>;
  getTagMeta: (tag: string) => { label: string; color: string };
  projectTags: ProjectTagOption[];
  projectCollaborators: ProjectCollaboratorOption[];
  onOpenNote: (noteId: string) => void;
  onPatchTask?: (noteId: string, patch: PatchProjectTaskData) => Promise<void>;
  taskPriorities: TaskPriority[];
  stageId: string;
  onAddSubtask?: (parentNoteId: string, stageId: string, parentTitle: string) => void;
  activeNoteId?: string | null;
  allNotes: any[];
  depth: number;
}) {
  const subs = childrenMap[note.id] ?? [];
  const canAcceptDrop =
    Boolean(activeNoteId) &&
    activeNoteId !== String(note.id) &&
    !isDescendantNote(allNotes, String(activeNoteId), String(note.id));

  return (
    <div
      className={
        depth === 0
          ? "flex flex-col gap-1.5"
          : "dark:border-surface-dark-border ml-1.5 flex flex-col gap-1.5 border-l border-neutral-200 pl-2"
      }
    >
      <DraggableNoteCard
        note={note}
        getTagMeta={getTagMeta}
        projectTags={projectTags}
        projectCollaborators={projectCollaborators}
        onOpenNote={() => onOpenNote(note.id)}
        onPatchTask={onPatchTask}
        taskPriorities={taskPriorities}
        stageId={stageId}
        onAddSubtask={onAddSubtask}
        canAcceptDrop={canAcceptDrop}
      />
      {subs.map((sub) => (
        <TaskBranch
          key={sub.id}
          note={sub}
          childrenMap={childrenMap}
          getTagMeta={getTagMeta}
          projectTags={projectTags}
          projectCollaborators={projectCollaborators}
          onOpenNote={onOpenNote}
          onPatchTask={onPatchTask}
          taskPriorities={taskPriorities}
          stageId={stageId}
          onAddSubtask={onAddSubtask}
          activeNoteId={activeNoteId}
          allNotes={allNotes}
          depth={depth + 1}
        />
      ))}
    </div>
  );
}

function DraggableNoteCard({
  note,
  getTagMeta,
  projectTags,
  projectCollaborators,
  onOpenNote,
  onPatchTask,
  taskPriorities,
  stageId,
  onAddSubtask,
  canAcceptDrop,
}: {
  note: any;
  getTagMeta: (tag: string) => { label: string; color: string };
  projectTags: ProjectTagOption[];
  projectCollaborators: ProjectCollaboratorOption[];
  onOpenNote: () => void;
  onPatchTask?: (noteId: string, patch: PatchProjectTaskData) => Promise<void>;
  taskPriorities: TaskPriority[];
  stageId?: string | null;
  onAddSubtask?: (parentNoteId: string, stageId: string, parentTitle: string) => void;
  canAcceptDrop?: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: note.id,
    data: { note },
  });
  const { setNodeRef: setDroppableNodeRef, isOver } = useDroppable({
    id: `task:${note.id}`,
    data: {
      type: "task",
      noteId: String(note.id),
      stageId: stageId ?? "",
    } satisfies DropTargetData,
    disabled: !stageId,
  });

  const setCardNodeRef = useCallback(
    (element: HTMLDivElement | null) => {
      setNodeRef(element);
      setDroppableNodeRef(element);
    },
    [setNodeRef, setDroppableNodeRef]
  );

  return (
    <div
      ref={setCardNodeRef}
      {...listeners}
      {...attributes}
      className={`cursor-grab touch-none rounded-md transition-shadow ${
        isDragging ? "opacity-30" : ""
      } ${
        isOver && canAcceptDrop
          ? "ring-brand-primary-500/50 ring-2 ring-offset-2 ring-offset-white dark:ring-offset-[#121214]"
          : ""
      }`}
    >
      <NoteCard
        note={note}
        getTagMeta={getTagMeta}
        projectTags={projectTags}
        projectCollaborators={projectCollaborators}
        onOpenNote={onOpenNote}
        onPatchTask={onPatchTask}
        taskPriorities={taskPriorities}
        stageId={stageId}
        onAddSubtask={onAddSubtask}
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
  const { setNodeRef, isOver } = useDroppable({
    id: `stage:${stage.id}`,
    data: { type: "stage", stageId: String(stage.id) } satisfies DropTargetData,
  });
  const isDoneStage = stage.properties?.is_done;
  const { theme } = useTheme();
  const columnTintStyle = !isOver ? stageColumnBackgroundStyle(stage.color, theme) : undefined;

  return (
    <div
      ref={setNodeRef}
      style={columnTintStyle}
      className={`flex h-full min-h-0 ${COLUMN_WIDTH_CLASS} flex-shrink-0 flex-col rounded-md transition-colors ${
        isOver ? "bg-brand-primary-500/10 ring-brand-primary-500/30 ring-2 ring-inset" : ""
      }`}
    >
      <div className="flex items-center justify-between p-2.5">
        <div className="flex min-w-0 items-center gap-1.5">
          <div
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: stage.color || "#A3A3A3" }}
          />
          <h3 className="truncate text-[10px] font-medium text-neutral-800 dark:text-neutral-200">
            {stage.name}
          </h3>
          {isDoneStage && <CheckCircle2 className="h-2.5 w-2.5 shrink-0 text-emerald-500" />}
          <span className="ml-0.5 flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-neutral-200/50 px-1 text-[9px] text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
            {count}
          </span>
        </div>
        {onAddCard && (
          <button
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onAddCard(stage.id);
            }}
            className="inline-flex shrink-0 items-center justify-center rounded-md p-1 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
            title="Criar tarefa neste estágio"
          >
            <Plus className="h-3 w-3" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-2.5 pb-2.5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-neutral-200 dark:[&::-webkit-scrollbar-thumb]:bg-neutral-800">
        <div className="flex flex-col gap-1.5">{children}</div>
      </div>
    </div>
  );
}

export default function ProjectBoardV2({
  stages,
  projectNotes,
  projectPublicId,
  projectTags,
  projectCollaborators,
  taskPriorities,
  onNoteStageChange,
  onAddCard,
  onAddSubtask,
  onProjectNotesReplaced,
  onPatchTask,
}: ProjectBoardProps) {
  const { openModal: openTaskModal } = useTaskNoteModal();
  const { updateProjectNoteStage } = useProjects();
  const [activeNote, setActiveNote] = useState<any>(null);
  const params = useParams();
  const orgId = params?.orgId as string;

  const handleOpenNote = useCallback(
    (noteId: string) => {
      const note = projectNotes.find((item) => item.id === noteId);
      if (projectPublicId && note) {
        syncProjectTaskUrl(orgId, projectPublicId, note, false);
      }
      openTaskModal("edit", { noteId, projectPublicId });
    },
    [openTaskModal, projectNotes, projectPublicId]
  );

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

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

  const sortedStages = useMemo(() => [...stages].sort((a, b) => a.position - b.position), [stages]);

  const stageTrees = useMemo(() => {
    const map: Record<string, StageTree> = {};
    for (const stage of sortedStages) {
      map[stage.id] = buildStageTree(stage.id, projectNotes);
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

      const target = getDropTargetData(over.data.current);
      if (!target) return;

      const projectId = note.project_id || note.properties?.project_id;
      if (!projectId) return;

      if (target.type === "task") {
        if (!onPatchTask) return;
        if (target.noteId === noteId) return;
        if (isDescendantNote(projectNotes, noteId, target.noteId)) return;

        const currentParentId = note.parent_id ? String(note.parent_id) : null;
        const targetStageId = target.stageId;
        if (
          currentParentId === target.noteId &&
          String(note.project_stage_id ?? "") === targetStageId
        ) {
          return;
        }

        await onPatchTask(noteId, {
          parent_id: target.noteId,
          stage_id: targetStageId,
        });
        return;
      }

      const targetStageId = target.stageId;
      const currentStageId = note.project_stage_id ? String(note.project_stage_id) : null;
      const hasParent = Boolean(note.parent_id);

      if (!hasParent && currentStageId === targetStageId) return;

      if (hasParent && onPatchTask) {
        await onPatchTask(noteId, {
          parent_id: null,
          stage_id: targetStageId,
        });
        return;
      }

      onNoteStageChange?.(noteId, targetStageId);

      try {
        const res = await updateProjectNoteStage(projectId, noteId, targetStageId);
        if (res?.notes && onProjectNotesReplaced) {
          onProjectNotesReplaced(res.notes);
        }
      } catch {
        onNoteStageChange?.(noteId, note.project_stage_id);
      }
    },
    [projectNotes, updateProjectNoteStage, onNoteStageChange, onProjectNotesReplaced, onPatchTask]
  );

  if (stages.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center text-neutral-400">
        <LayoutGrid className="mb-3 h-8 w-8 text-neutral-300 dark:text-neutral-700" />
        <p className="text-xs">Nenhum estágio configurado para este quadro.</p>
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
      <div className="flex h-full min-h-0 gap-3 overflow-x-auto overflow-y-hidden p-2 [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-neutral-300 dark:[&::-webkit-scrollbar-thumb]:bg-neutral-700">
        {sortedStages.map((stage) => {
          const tree = stageTrees[stage.id] ?? { roots: [], childrenMap: {}, count: 0 };
          const { roots, childrenMap, count } = tree;
          return (
            <DroppableStageColumn key={stage.id} stage={stage} count={count} onAddCard={onAddCard}>
              {roots.length === 0 ? (
                <div className="dark:border-surface-dark-border flex items-center justify-center rounded-md border border-dashed border-neutral-300 bg-transparent py-8">
                  <span className="text-xs text-neutral-400">
                    Solte aqui para tornar tarefa principal
                  </span>
                </div>
              ) : (
                roots.map((note) => (
                  <TaskBranch
                    key={note.id}
                    note={note}
                    childrenMap={childrenMap}
                    getTagMeta={getTagMeta}
                    projectTags={projectTags}
                    projectCollaborators={projectCollaborators}
                    onOpenNote={handleOpenNote}
                    onPatchTask={onPatchTask}
                    taskPriorities={taskPriorities}
                    stageId={stage.id}
                    onAddSubtask={onAddSubtask}
                    activeNoteId={activeNote?.id ? String(activeNote.id) : null}
                    allNotes={projectNotes}
                    depth={0}
                  />
                ))
              )}
            </DroppableStageColumn>
          );
        })}
      </div>

      <DragOverlay dropAnimation={{ duration: 200, easing: "ease" }}>
        {activeNote ? (
          <div className={DRAG_OVERLAY_CARD_CLASS}>
            <NoteCard
              note={activeNote}
              getTagMeta={getTagMeta}
              projectTags={projectTags}
              projectCollaborators={projectCollaborators}
              onOpenNote={() => {}}
              taskPriorities={taskPriorities}
              isDragging
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
