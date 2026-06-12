"use client";

import React, { useState, useCallback, useMemo } from "react";
import Image from "next/image";
import {
  Calendar,
  Flag,
  FolderKanban,
  Kanban,
  Tag,
  Users,
  Link2,
  Plus,
  X,
  ChevronDown,
  ChevronUp,
  Paperclip,
} from "lucide-react";

import type { Note, UpdateNoteData } from "@/app/_contexts/notes-context";
import type { Project, ProjectStage, TaskPriority } from "@/app/_contexts/projects-context";
import type { TaskNoteModalMode } from "@/app/(protected)/_components/task-note-modal/use-task-note-modal";
import type { CreateTaskDraft } from "@/app/(protected)/_components/task-note-modal/create-task-draft";
import { getTagColor } from "@/app/_utils/tag-colors";
import { getCollaboratorDisplayName, getCollaboratorAvatarUrl } from "@/app/_utils/collaborators";
import getStorageUrl from "@/app/_utils/get-storage-url";
import {
  TaskCardCollaboratorsPicker,
  TaskCardTagsPicker,
  type ProjectCollaboratorOption,
  type ProjectTagOption,
} from "@/app/(protected)/[orgId]/projects/_components/task-card-meta-pickers";

interface TaskNoteModalMetaProps {
  mode: TaskNoteModalMode;
  note: Note | null;
  projects: Project[];
  projectStages: ProjectStage[];
  taskPriorities: TaskPriority[];
  initialProjectId?: string;
  initialStageId?: string;
  canEdit: boolean;
  onProjectChange: (projectId: string) => Promise<void>;
  onStageChange: (stageId: string) => Promise<void>;
  onPriorityChange: (priorityId: string) => Promise<void>;
  onDueDateChange: (dueDate: string | null) => Promise<void>;
  onSaveAndApply: (data: UpdateNoteData) => Promise<Note | null>;
  /** Create-mode project taxonomy (when note is not persisted yet). */
  projectTags?: ProjectTagOption[];
  projectCollaborators?: ProjectCollaboratorOption[];
  createDraft?: CreateTaskDraft;
  createStageId?: string;
  onCreateStageChange?: (stageId: string) => void;
  onCreateDraftChange?: (patch: Partial<CreateTaskDraft>) => void;
}

const META_LIST_PREVIEW_LIMIT = 2;

export function TaskNoteModalMeta({
  mode,
  note,
  projects,
  projectStages,
  taskPriorities,
  initialProjectId,
  initialStageId,
  canEdit,
  onProjectChange,
  onStageChange,
  onPriorityChange,
  onDueDateChange,
  onSaveAndApply,
  projectTags = [],
  projectCollaborators = [],
  createDraft,
  createStageId = "",
  onCreateStageChange,
  onCreateDraftChange,
}: TaskNoteModalMetaProps) {
  const [showAllTags, setShowAllTags] = useState(false);
  const [showAllCollabs, setShowAllCollabs] = useState(false);
  const [showTagInput, setShowTagInput] = useState(false);
  const [newTag, setNewTag] = useState("");

  const currentProjectId = note?.associated_project?.id ?? initialProjectId ?? "";
  const currentStageId = note?.associated_project?.stage_id ?? initialStageId ?? "";
  const effectiveStageId =
    currentStageId || (note?.associated_project && projectStages[0] ? projectStages[0].id : "");

  const formatDateForInput = useCallback((dateStr: string | null | undefined): string => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      const pad = (n: number) => String(n).padStart(2, "0");
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch {
      return "";
    }
  }, []);

  const handleAddTag = useCallback(async () => {
    if (!newTag.trim() || !note) return;
    const currentTags = note.tags || [];
    if (currentTags.includes(newTag.trim())) {
      setNewTag("");
      return;
    }
    await onSaveAndApply({ tags: [...currentTags, newTag.trim()] });
    setNewTag("");
    setShowTagInput(false);
  }, [newTag, note, onSaveAndApply]);

  const handleRemoveTag = useCallback(
    async (tagToRemove: string) => {
      if (!note) return;
      const currentTags = note.tags || [];
      await onSaveAndApply({ tags: currentTags.filter((t) => t !== tagToRemove) });
    },
    [note, onSaveAndApply]
  );

  const visibleTags = useMemo(() => {
    const tags = note?.tags || [];
    return showAllTags ? tags : tags.slice(0, META_LIST_PREVIEW_LIMIT);
  }, [note?.tags, showAllTags]);

  const visibleCollabs = useMemo(() => {
    const collabs = note?.collaborators || [];
    return showAllCollabs ? collabs : collabs.slice(0, META_LIST_PREVIEW_LIMIT);
  }, [note?.collaborators, showAllCollabs]);

  if (mode === "create" && !note && createDraft && onCreateDraftChange) {
    const selectedTagIds = new Set(createDraft.tagIds);
    const selectedCollaboratorIds = new Set(createDraft.collaboratorIds);
    const dueInputValue = formatDateForInput(createDraft.dueDate);

    const toggleTag = (tagId: string, selected: boolean) => {
      const next = selected
        ? createDraft.tagIds.filter((id) => id !== tagId)
        : [...createDraft.tagIds, tagId];
      onCreateDraftChange({ tagIds: next });
    };

    const toggleCollaborator = (userId: string, selected: boolean) => {
      const next = selected
        ? createDraft.collaboratorIds.filter((id) => id !== userId)
        : [...createDraft.collaboratorIds, userId];
      onCreateDraftChange({ collaboratorIds: next });
    };

    const addFiles = (files: File[]) => {
      if (files.length === 0) return;
      onCreateDraftChange({ pendingFiles: [...createDraft.pendingFiles, ...files] });
    };

    const removeFile = (index: number) => {
      onCreateDraftChange({
        pendingFiles: createDraft.pendingFiles.filter((_, i) => i !== index),
      });
    };

    return (
      <div className="dark:border-surface-dark-border border-b border-neutral-100 px-4 py-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <MetaRow icon={FolderKanban} label="Projeto">
            {initialProjectId ? (
              <span className="text-xs font-medium text-neutral-800 dark:text-neutral-200">
                {projects.find((p) => p.id === initialProjectId)?.title || "Projeto"}
              </span>
            ) : (
              <select
                value={initialProjectId || ""}
                onChange={(e) => void onProjectChange(e.target.value)}
                aria-label="Projeto"
                className="w-full cursor-pointer rounded-lg border-0 bg-neutral-100/80 px-2 py-1.5 text-xs text-neutral-800 transition-colors outline-none hover:bg-neutral-100 dark:bg-neutral-800/55 dark:text-neutral-200 dark:hover:bg-neutral-800/75"
              >
                <option value="">Sem projeto</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            )}
          </MetaRow>

          {initialProjectId && projectStages.length > 0 && (
            <MetaRow icon={Kanban} label="Estágio">
              <div className="flex items-center gap-2">
                <span
                  className="h-3 w-3 shrink-0 rounded-full ring-1 ring-neutral-900/10 dark:ring-white/15"
                  style={{
                    backgroundColor:
                      projectStages.find((s) => s.id === createStageId)?.color || "#a3a3a3",
                  }}
                />
                <select
                  value={createStageId}
                  onChange={(e) => onCreateStageChange?.(e.target.value)}
                  className="min-w-0 flex-1 cursor-pointer rounded-lg border-0 bg-neutral-100/80 px-2 py-1.5 text-xs text-neutral-800 transition-colors outline-none hover:bg-neutral-100 dark:bg-neutral-800/55 dark:text-neutral-200 dark:hover:bg-neutral-800/75"
                >
                  <option value="">Selecione o estágio</option>
                  {projectStages.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </MetaRow>
          )}

          <MetaRow icon={Calendar} label="Prazo">
            <input
              type="datetime-local"
              value={dueInputValue}
              onChange={(e) => {
                const v = e.target.value;
                onCreateDraftChange({
                  dueDate: v ? new Date(v).toISOString() : null,
                });
              }}
              className="w-full rounded-lg border-0 bg-neutral-100/80 px-2 py-1.5 text-xs text-neutral-800 transition-colors outline-none hover:bg-neutral-100 dark:bg-neutral-800/55 dark:text-neutral-200 dark:hover:bg-neutral-800/75"
            />
          </MetaRow>

          <MetaRow icon={Flag} label="Prioridade">
            {taskPriorities.length > 0 ? (
              <div className="flex items-center gap-2">
                <span
                  className="h-3 w-3 shrink-0 rounded-full ring-1 ring-neutral-900/10 dark:ring-white/15"
                  style={{
                    backgroundColor:
                      taskPriorities.find((p) => p.id === createDraft.priorityId)?.color_hex ||
                      "#a3a3a3",
                  }}
                />
                <select
                  value={createDraft.priorityId}
                  onChange={(e) => onCreateDraftChange({ priorityId: e.target.value })}
                  className="min-w-0 flex-1 cursor-pointer rounded-lg border-0 bg-neutral-100/80 px-2 py-1.5 text-xs text-neutral-800 transition-colors outline-none hover:bg-neutral-100 dark:bg-neutral-800/55 dark:text-neutral-200 dark:hover:bg-neutral-800/75"
                >
                  <option value="">Sem prioridade</option>
                  {taskPriorities.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <span className="text-xs text-neutral-500 dark:text-neutral-400">Sem prioridade</span>
            )}
          </MetaRow>

          <MetaRow icon={Tag} label="Tags" className="sm:col-span-2">
            <TaskCardTagsPicker
              projectTags={projectTags}
              selectedTagIds={selectedTagIds}
              onToggle={toggleTag}
            />
          </MetaRow>

          <MetaRow icon={Users} label="Colaboradores" className="sm:col-span-2">
            <TaskCardCollaboratorsPicker
              projectCollaborators={projectCollaborators}
              selectedUserIds={selectedCollaboratorIds}
              onToggle={toggleCollaborator}
            />
          </MetaRow>

          <MetaRow icon={Paperclip} label="Anexos" className="sm:col-span-2">
            <div className="flex min-w-0 flex-col gap-2">
              {createDraft.pendingFiles.length > 0 && (
                <ul className="flex flex-col gap-1">
                  {createDraft.pendingFiles.map((file, index) => (
                    <li
                      key={`${file.name}-${index}`}
                      className="flex items-center justify-between gap-2 rounded-md bg-neutral-100/80 px-2 py-1 text-xs dark:bg-neutral-800/55"
                    >
                      <span className="truncate text-neutral-700 dark:text-neutral-200">
                        {file.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="shrink-0 text-neutral-400 hover:text-red-500"
                        title="Remover"
                      >
                        <X size={12} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <label className="hover:border-brand-primary-500 hover:text-brand-primary-500 dark:border-surface-dark-border inline-flex w-fit cursor-pointer items-center gap-2 rounded-md border border-dashed border-neutral-300 px-2 py-1.5 text-xs text-neutral-500 transition-colors dark:text-neutral-300">
                <Paperclip className="h-3.5 w-3.5" />
                Anexar arquivos
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    addFiles(Array.from(e.target.files || []));
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
          </MetaRow>
        </div>
      </div>
    );
  }

  if (!note) return null;

  return (
    <div className="dark:border-surface-dark-border border-b border-neutral-100 px-4 py-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {(canEdit || note.associated_project) && (
          <MetaRow icon={FolderKanban} label="Projeto">
            {canEdit ? (
              <select
                value={currentProjectId}
                onChange={(e) => void onProjectChange(e.target.value)}
                className="w-full cursor-pointer rounded-lg border-0 bg-neutral-100/80 px-2 py-1.5 text-xs text-neutral-800 transition-colors outline-none hover:bg-neutral-100 dark:bg-neutral-800/55 dark:text-neutral-200 dark:hover:bg-neutral-800/75"
              >
                <option value="">Sem projeto</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-xs font-medium text-neutral-800 dark:text-neutral-200">
                {note.associated_project?.name || "—"}
              </span>
            )}
          </MetaRow>
        )}

        {note.associated_project && (
          <MetaRow icon={Kanban} label="Estágio">
            {canEdit && projectStages.length > 0 ? (
              <div className="flex items-center gap-2">
                <span
                  className="h-3 w-3 shrink-0 rounded-full ring-1 ring-neutral-900/10 dark:ring-white/15"
                  style={{
                    backgroundColor:
                      projectStages.find((s) => s.id === effectiveStageId)?.color || "#a3a3a3",
                  }}
                />
                <select
                  value={effectiveStageId}
                  onChange={(e) => void onStageChange(e.target.value)}
                  className="min-w-0 flex-1 cursor-pointer rounded-lg border-0 bg-neutral-100/80 px-2 py-1.5 text-xs text-neutral-800 transition-colors outline-none hover:bg-neutral-100 dark:bg-neutral-800/55 dark:text-neutral-200 dark:hover:bg-neutral-800/75"
                >
                  {projectStages.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <span className="inline-flex items-center gap-2 rounded-lg bg-neutral-100/80 px-2 py-1.5 text-xs text-neutral-700 dark:bg-neutral-800/55 dark:text-neutral-300">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-neutral-900/10 dark:ring-white/15"
                  style={{
                    backgroundColor:
                      projectStages.find((s) => s.id === effectiveStageId)?.color || "#a3a3a3",
                  }}
                />
                {note.associated_project.stage_name || "—"}
              </span>
            )}
          </MetaRow>
        )}

        <MetaRow icon={Calendar} label="Prazo">
          {canEdit ? (
            <input
              type="datetime-local"
              value={formatDateForInput(note.due_date)}
              onChange={(e) => {
                const v = e.target.value;
                void onDueDateChange(v ? new Date(v).toISOString() : null);
              }}
              className="w-full rounded-lg border-0 bg-neutral-100/80 px-2 py-1.5 text-xs text-neutral-800 transition-colors outline-none hover:bg-neutral-100 dark:bg-neutral-800/55 dark:text-neutral-200 dark:hover:bg-neutral-800/75"
            />
          ) : (
            <span className="text-xs text-neutral-600 dark:text-neutral-300">
              {note.due_date
                ? new Date(note.due_date).toLocaleString("pt-BR")
                : "Sem prazo definido"}
            </span>
          )}
        </MetaRow>

        <MetaRow icon={Flag} label="Prioridade">
          {canEdit && taskPriorities.length > 0 ? (
            <div className="flex items-center gap-2">
              <span
                className="h-3 w-3 shrink-0 rounded-full ring-1 ring-neutral-900/10 dark:ring-white/15"
                style={{
                  backgroundColor:
                    taskPriorities.find((p) => p.id === note.priority_id)?.color_hex ||
                    note.priority_color ||
                    "#a3a3a3",
                }}
              />
              <select
                value={note.priority_id ?? ""}
                onChange={(e) => void onPriorityChange(e.target.value)}
                className="min-w-0 flex-1 cursor-pointer rounded-lg border-0 bg-neutral-100/80 px-2 py-1.5 text-xs text-neutral-800 transition-colors outline-none hover:bg-neutral-100 dark:bg-neutral-800/55 dark:text-neutral-200 dark:hover:bg-neutral-800/75"
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
              className="inline-flex w-fit items-center gap-2 rounded-lg px-2 py-1 text-xs font-medium text-neutral-900 dark:text-neutral-100"
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
                style={{ backgroundColor: note.priority_color || "#ca8a04" }}
              />
              {note.priority_name}
            </span>
          ) : (
            <span className="text-xs text-neutral-500 dark:text-neutral-400">Sem prioridade</span>
          )}
        </MetaRow>

        <MetaRow icon={Tag} label="Tags" className="sm:col-span-2">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            {visibleTags.map((tag, index) => {
              const colors = getTagColor(tag);
              return (
                <span
                  key={index}
                  className={`group flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${colors.bg} ${colors.text} ${colors.border}`}
                >
                  {tag}
                  {canEdit && (
                    <button
                      onClick={() => void handleRemoveTag(tag)}
                      className="text-neutral-400 transition-colors hover:text-red-500 dark:text-neutral-500 dark:hover:text-red-400"
                    >
                      <X size={10} />
                    </button>
                  )}
                </span>
              );
            })}

            {(note?.tags?.length ?? 0) > META_LIST_PREVIEW_LIMIT && (
              <button
                onClick={() => setShowAllTags((v) => !v)}
                className="flex items-center gap-0.5 text-[10px] text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
              >
                {showAllTags ? (
                  <>
                    <ChevronUp size={12} /> Ver menos
                  </>
                ) : (
                  <>
                    <ChevronDown size={12} /> +{(note?.tags?.length ?? 0) - META_LIST_PREVIEW_LIMIT}
                  </>
                )}
              </button>
            )}

            {canEdit && (
              <>
                {showTagInput ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void handleAddTag();
                        } else if (e.key === "Escape") {
                          setShowTagInput(false);
                          setNewTag("");
                        }
                      }}
                      placeholder="Nova tag..."
                      className="dark:border-surface-dark-border w-20 rounded border border-neutral-200 bg-neutral-50 px-1.5 py-0.5 text-[11px] outline-none focus:border-yellow-500 dark:bg-neutral-800 dark:text-neutral-200"
                      autoFocus
                    />
                    <button
                      onClick={() => void handleAddTag()}
                      className="rounded bg-yellow-500 p-0.5 text-white hover:bg-yellow-600"
                    >
                      <Plus size={10} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowTagInput(true)}
                    className="flex h-5 w-5 items-center justify-center rounded-full border border-dashed border-neutral-300 text-neutral-400 transition-colors hover:border-yellow-500 hover:text-yellow-500 dark:border-neutral-600 dark:hover:border-yellow-500"
                  >
                    <Plus size={10} />
                  </button>
                )}
              </>
            )}
          </div>
        </MetaRow>

        {(canEdit || (note?.collaborators && note.collaborators.length > 0)) && (
          <MetaRow icon={Users} label="Colaboradores" className="sm:col-span-2">
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              {note?.collaborators && note.collaborators.length > 0 && (
                <div className="flex -space-x-1.5">
                  {visibleCollabs.map((collab, index) => {
                    const displayName = getCollaboratorDisplayName(collab);
                    const avatarUrl = getCollaboratorAvatarUrl(collab);

                    return (
                      <div
                        key={index}
                        className="dark:border-surface-dark-border-strong flex h-6 w-6 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-neutral-200 dark:bg-neutral-700"
                        title={displayName}
                      >
                        {avatarUrl ? (
                          <Image
                            src={getStorageUrl(avatarUrl)}
                            alt={displayName}
                            width={24}
                            height={24}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-[9px] font-bold text-neutral-500 dark:text-neutral-300">
                            {displayName.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {(note?.collaborators?.length ?? 0) > META_LIST_PREVIEW_LIMIT && (
                <button
                  onClick={() => setShowAllCollabs((v) => !v)}
                  className="flex items-center gap-0.5 text-[10px] text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
                >
                  {showAllCollabs ? (
                    <>
                      <ChevronUp size={12} /> Ver menos
                    </>
                  ) : (
                    <>
                      <ChevronDown size={12} /> +
                      {(note?.collaborators?.length ?? 0) - META_LIST_PREVIEW_LIMIT}
                    </>
                  )}
                </button>
              )}

              {(!note?.collaborators || note.collaborators.length === 0) && (
                <span className="text-xs text-neutral-400 dark:text-neutral-500">
                  Nenhum colaborador
                </span>
              )}
            </div>
          </MetaRow>
        )}
      </div>
    </div>
  );
}

function MetaRow({
  icon: Icon,
  label,
  children,
  className = "",
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex min-w-0 flex-row items-center gap-1.5 sm:gap-2 ${className}`}>
      <div className="flex shrink-0 items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
        <Icon className="flex-shrink-0 text-yellow-400 dark:text-yellow-500" size={13} />
        <span className="font-medium">{label}</span>
      </div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
