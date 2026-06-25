"use client";

import React, { useEffect, useState, useCallback, useRef, useContext } from "react";
import { createPortal } from "react-dom";
import { Loader2 } from "lucide-react";

import {
  NotesContext,
  type Note,
  type Block,
  type UpdateNoteData,
} from "@/app/_contexts/notes-context";
import { useAuth } from "@/app/_contexts/auth-context";
import {
  ProjectsContext,
  type ProjectStage,
  type TaskPriority,
} from "@/app/_contexts/projects-context";
import { NoteCommentsProvider, useNoteComments } from "@/app/_contexts/note-comments-context";
import { NoteCommentsSidebar } from "@/app/(protected)/[orgId]/notes/_components/note-comments-sidebar";
import { NoteCommentsPanelProvider } from "@/app/_contexts/note-comments-panel-context";
import {
  useTaskNoteModal,
  type TaskNoteModalMode,
} from "@/app/(protected)/_components/task-note-modal/use-task-note-modal";
import { TaskNoteModalHeader } from "@/app/(protected)/_components/task-note-modal/task-note-modal-header";
import { TaskNoteModalMeta } from "@/app/(protected)/_components/task-note-modal/task-note-modal-meta";
import { TaskNoteModalContent } from "@/app/(protected)/_components/task-note-modal/task-note-modal-content";
import { SharedTaskDetail } from "@/app/(protected)/_components/shared-task-detail/shared-task-detail";
import {
  emptyCreateTaskDraft,
  type CreateTaskDraft,
} from "@/app/(protected)/_components/task-note-modal/create-task-draft";
import type {
  ProjectCollaboratorOption,
  ProjectTagOption,
} from "@/app/(protected)/[orgId]/projects/_components/task-card-meta-pickers";
import { ApiError } from "@/app/_services/api-methods";
import type { CreateBlockData } from "@/app/_services/notes-service/notes.schema";
import type { NoteCommentsEmbeddableFile } from "@/app/(protected)/[orgId]/notes/_components/note-comments-sidebar";

type NoteConflictState = {
  noteId: string;
  currentRevision: number | null;
  conflictFields: string[];
  serverNote?: Partial<Note>;
};

export function TaskNoteModal() {
  const { state } = useTaskNoteModal();
  if (!state.isOpen) return null;
  return <TaskNoteModalInner />;
}

function TaskNoteModalInner() {
  const { state, callbacks, closeModal, openModal } = useTaskNoteModal();
  const { isOpen, mode, noteId, projectId, projectPublicId, stageId, parentNoteId } = state;

  const notesContext = useContext(NotesContext);
  const projectsContext = useContext(ProjectsContext);

  if (!notesContext || !projectsContext) {
    console.warn("TaskNoteModal: NotesContext or ProjectsContext is missing.");
    return null;
  }

  const {
    getNoteById,
    createNote: createNoteService,
    updateNote,
    deleteNote,
    exportNoteAsPDF,
    putNoteBlocksSync,
  } = notesContext;

  const { user } = useAuth();

  const {
    projects,
    getProjectStages,
    getTaskPriorities,
    getOrgTaskPriorities,
    addNoteToProject,
    updateProjectNoteStage,
    createTaskInStage,
    getProjectTags,
    getCollaborators,
  } = projectsContext;

  const [mounted, setMounted] = useState(false);
  const [note, setNote] = useState<Note | null>(null);
  const [blocks, setBlocks] = useState<(Block & { children?: Block[] })[]>([]);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingDescription, setEditingDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showCommentsPanel, setShowCommentsPanel] = useState(false);
  const [taskPriorities, setTaskPriorities] = useState<TaskPriority[]>([]);
  const [projectStages, setProjectStages] = useState<ProjectStage[]>([]);
  const [noteConflict, setNoteConflict] = useState<NoteConflictState | null>(null);
  const [createDraft, setCreateDraft] = useState<CreateTaskDraft>(emptyCreateTaskDraft);
  const [createStageId, setCreateStageId] = useState("");
  const [projectTagsForCreate, setProjectTagsForCreate] = useState<ProjectTagOption[]>([]);
  const [projectCollaboratorsForCreate, setProjectCollaboratorsForCreate] = useState<
    ProjectCollaboratorOption[]
  >([]);

  const noteRevisionRef = useRef<number>(1);
  const noteSaveQueueRef = useRef<Promise<unknown>>(Promise.resolve());
  const metadataDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const parseNoteRevision = useCallback((revision: unknown): number | null => {
    if (revision === undefined || revision === null || revision === "") return null;
    const n = Number(revision);
    if (Number.isFinite(n) && n >= 1) return Math.floor(n);
    return null;
  }, []);

  const applyServerRevisionToRef = useCallback(
    (revision: unknown) => {
      const parsed = parseNoteRevision(revision);
      if (parsed !== null) noteRevisionRef.current = parsed;
    },
    [parseNoteRevision]
  );

  const isConflictError = (error: unknown): error is ApiError =>
    error instanceof ApiError && error.status === 409;

  const applyServerNote = useCallback(
    (serverNote: Note, options?: { replaceBlocks?: boolean }) => {
      const shouldReplaceBlocks = options?.replaceBlocks === true;
      setNote((prev) => (prev ? { ...prev, ...serverNote } : serverNote));
      applyServerRevisionToRef(serverNote.revision);
      if (shouldReplaceBlocks && Array.isArray(serverNote.blocks)) {
        setBlocks(serverNote.blocks as (Block & { children?: Block[] })[]);
      }
    },
    [applyServerRevisionToRef]
  );

  const enqueueNoteMutation = useCallback(async <T,>(task: () => Promise<T>): Promise<T> => {
    const run = noteSaveQueueRef.current.then(task, task);
    noteSaveQueueRef.current = run.then(
      () => undefined,
      () => undefined
    );
    return run;
  }, []);

  const saveAndApply = useCallback(
    async (data: UpdateNoteData): Promise<Note | null> => {
      if (!note) return null;
      return enqueueNoteMutation(async () => {
        setIsSaving(true);
        try {
          const updated = await updateNote(note.id, {
            ...data,
            baseRevision: noteRevisionRef.current,
          });
          if (updated) {
            applyServerNote(updated, { replaceBlocks: false });
            setNoteConflict(null);
            callbacks.onNoteUpdated?.(updated);
          }
          return updated;
        } catch (err) {
          if (isConflictError(err)) {
            const data =
              (err.data as {
                currentRevision?: number | null;
                conflictFields?: string[];
                serverNote?: Partial<Note>;
              }) || {};
            applyServerRevisionToRef(data.currentRevision);
            setNoteConflict({
              noteId: note.id,
              currentRevision: parseNoteRevision(data.currentRevision),
              conflictFields: Array.isArray(data.conflictFields) ? data.conflictFields : [],
              serverNote: data.serverNote,
            });
          }
          console.error("Error updating task:", err);
          return null;
        } finally {
          setIsSaving(false);
        }
      });
    },
    [
      note,
      enqueueNoteMutation,
      updateNote,
      applyServerNote,
      applyServerRevisionToRef,
      parseNoteRevision,
      callbacks,
    ]
  );

  const loadTaskPriorities = useCallback(
    async (opts: { projectId?: string; orgId?: string }) => {
      const { projectId: pid, orgId } = opts;
      try {
        if (pid) {
          const list = await getTaskPriorities(pid);
          setTaskPriorities(list || []);
        } else if (orgId) {
          const list = await getOrgTaskPriorities(orgId);
          setTaskPriorities(list || []);
        } else {
          setTaskPriorities([]);
        }
      } catch {
        setTaskPriorities([]);
      }
    },
    [getTaskPriorities, getOrgTaskPriorities]
  );

  const loadNote = useCallback(async () => {
    if (!noteId) return;
    setLoading(true);
    try {
      const fetchedNote = await getNoteById(noteId);
      if (fetchedNote) {
        applyServerNote(fetchedNote, { replaceBlocks: true });
        setEditingTitle(fetchedNote.title || "");
        setEditingDescription(fetchedNote.description || "");

        if (fetchedNote.associated_project?.id) {
          const stages = await getProjectStages(fetchedNote.associated_project.id);
          setProjectStages(stages || []);
        } else {
          setProjectStages([]);
        }

        await loadTaskPriorities({
          projectId: fetchedNote.associated_project?.id,
          orgId: fetchedNote.associated_organization?.id,
        });
      }
    } catch (err) {
      console.error("Error loading note:", err);
    } finally {
      setLoading(false);
    }
  }, [noteId, getNoteById, applyServerNote, getProjectStages, loadTaskPriorities]);

  const initNewNote = useCallback(async () => {
    setNote(null);
    setBlocks([]);
    setEditingTitle("");
    setEditingDescription("");
    setCreateDraft(emptyCreateTaskDraft());
    setCreateStageId(stageId || "");
    noteRevisionRef.current = 1;

    if (projectId) {
      const [stages, tags, collabs] = await Promise.all([
        getProjectStages(projectId),
        getProjectTags(projectId).catch(() => []),
        getCollaborators(projectId).catch(() => []),
      ]);
      setProjectStages(stages || []);
      setProjectTagsForCreate(
        (tags || []).map((t) => ({
          id: t.id,
          name: t.name,
          color_hex: t.color_hex,
        }))
      );
      setProjectCollaboratorsForCreate(
        (collabs || []).map((c) => ({
          user_id: c.user_id,
          username: c.username,
          name: c.name,
        }))
      );
    } else {
      setProjectStages([]);
      setProjectTagsForCreate([]);
      setProjectCollaboratorsForCreate([]);
    }

    await loadTaskPriorities({
      projectId: projectId || undefined,
      orgId: user?.org_id || undefined,
    });
  }, [
    projectId,
    stageId,
    user?.org_id,
    getProjectStages,
    getProjectTags,
    getCollaborators,
    loadTaskPriorities,
  ]);

  const patchCreateDraft = useCallback((patch: Partial<CreateTaskDraft>) => {
    setCreateDraft((prev) => ({ ...prev, ...patch }));
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setNote(null);
      setBlocks([]);
      setEditingTitle("");
      setEditingDescription("");
      setShowColorPicker(false);
      setShowCommentsPanel(false);
      setNoteConflict(null);
      setCreateDraft(emptyCreateTaskDraft());
      setCreateStageId("");
      setProjectTagsForCreate([]);
      setProjectCollaboratorsForCreate([]);
      noteRevisionRef.current = 1;
      return;
    }

    if (mode === "create") {
      void initNewNote();
    } else if (noteId) {
      void loadNote();
    }
  }, [isOpen, mode, noteId, loadNote, initNewNote]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeModal();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, closeModal]);

  const handleTitleChange = useCallback(
    (value: string) => {
      setEditingTitle(value);
      if (mode === "edit" && note) {
        if (metadataDebounceRef.current) {
          clearTimeout(metadataDebounceRef.current);
        }
        metadataDebounceRef.current = setTimeout(() => {
          void saveAndApply({ title: value });
        }, 800);
      }
    },
    [mode, note, saveAndApply]
  );

  const handleDescriptionChange = useCallback(
    (value: string) => {
      setEditingDescription(value);
      if (mode === "edit" && note) {
        if (metadataDebounceRef.current) {
          clearTimeout(metadataDebounceRef.current);
        }
        metadataDebounceRef.current = setTimeout(() => {
          void saveAndApply({ description: value });
        }, 800);
      }
    },
    [mode, note, saveAndApply]
  );

  const handleBlocksSave = useCallback(
    async (blocksToSave: CreateBlockData[]) => {
      if (!note) return;
      try {
        const result = await putNoteBlocksSync(note.id, blocksToSave, noteRevisionRef.current);
        if (result.revision !== null && result.revision !== undefined) {
          noteRevisionRef.current = result.revision;
        }
        if (result.blocks) {
          setBlocks(result.blocks as (Block & { children?: Block[] })[]);
        }
      } catch (err) {
        console.error("Error saving blocks:", err);
      }
    },
    [note, putNoteBlocksSync]
  );

  const handleCreateNote = useCallback(async () => {
    const effectiveStageId = createStageId || stageId;
    if (projectId && !effectiveStageId) return;

    setIsSaving(true);
    try {
      let createdNote: Note | null = null;
      const title = editingTitle.trim() || "Nova Tarefa";
      const description = editingDescription.trim() || undefined;
      const properties = createDraft.color ? { color: createDraft.color } : undefined;

      if (projectId && effectiveStageId) {
        const notes = await createTaskInStage(projectId, effectiveStageId, {
          title,
          description,
          parent_id: parentNoteId || undefined,
          tags: createDraft.tagIds.length > 0 ? createDraft.tagIds : undefined,
          priority_id: createDraft.priorityId || null,
          due_date: createDraft.dueDate,
          collaborator_ids:
            createDraft.collaboratorIds.length > 0 ? createDraft.collaboratorIds : undefined,
          files: createDraft.pendingFiles.length > 0 ? createDraft.pendingFiles : undefined,
          properties,
        });
        if (notes && notes.length > 0) {
          createdNote = notes[notes.length - 1] as Note;
        }
      } else {
        createdNote = await createNoteService({
          title,
          description,
        });
      }

      if (createdNote) {
        if (createDraft.blocks.length > 0) {
          try {
            const result = await putNoteBlocksSync(createdNote.id, createDraft.blocks, 1);
            if (result.blocks) {
              createdNote = { ...createdNote, blocks: result.blocks as Note["blocks"] };
            }
          } catch (err) {
            console.error("Error saving blocks on create:", err);
          }
        }

        callbacks.onNoteCreated?.(createdNote);
        openModal("edit", {
          noteId: createdNote.id,
          projectId,
          projectPublicId,
          onNoteUpdated: callbacks.onNoteUpdated,
          onNoteDeleted: callbacks.onNoteDeleted,
        });
      }
    } catch (err) {
      console.error("Error creating note:", err);
    } finally {
      setIsSaving(false);
    }
  }, [
    projectId,
    stageId,
    createStageId,
    parentNoteId,
    projectPublicId,
    editingTitle,
    editingDescription,
    createDraft,
    createTaskInStage,
    createNoteService,
    putNoteBlocksSync,
    callbacks,
    openModal,
  ]);

  const handleDelete = useCallback(async () => {
    if (!note) return;
    if (!window.confirm("Tem certeza que deseja deletar esta tarefa?")) return;

    try {
      const success = await deleteNote(note.id);
      if (success) {
        callbacks.onNoteDeleted?.(note.id);
        closeModal();
      }
    } catch (err) {
      console.error("Error deleting note:", err);
    }
  }, [note, deleteNote, callbacks, closeModal]);

  const handleExport = useCallback(async () => {
    if (!note || isExporting) return;
    setIsExporting(true);
    try {
      const exported = await exportNoteAsPDF(note.id);
      if (exported) {
        const { blob, fileName } = exported;
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = fileName;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error("Error exporting note:", err);
    } finally {
      setIsExporting(false);
    }
  }, [note, isExporting, exportNoteAsPDF]);

  const handleColorChange = useCallback(
    async (color: string) => {
      if (!note) return;
      await saveAndApply({
        properties: { ...note.properties, color },
      });
      setShowColorPicker(false);
    },
    [note, saveAndApply]
  );

  const handleProjectChange = useCallback(
    async (newProjectId: string) => {
      if (!note) return;
      const current = note.associated_project?.id ?? "";
      if (newProjectId === current) return;

      setIsSaving(true);
      try {
        if (newProjectId === "") {
          await saveAndApply({ project_id: null });
          await loadTaskPriorities({ orgId: note.associated_organization?.id });
        } else {
          await addNoteToProject(newProjectId, note.id);
          const stages = await getProjectStages(newProjectId);
          setProjectStages(stages || []);
          await loadTaskPriorities({ projectId: newProjectId });
          const fresh = await getNoteById(note.id);
          if (fresh) {
            applyServerNote(fresh, { replaceBlocks: false });
          }
        }
      } catch (err) {
        console.error("Error changing project:", err);
      } finally {
        setIsSaving(false);
      }
    },
    [
      note,
      saveAndApply,
      addNoteToProject,
      getProjectStages,
      getNoteById,
      applyServerNote,
      loadTaskPriorities,
    ]
  );

  const handleStageChange = useCallback(
    async (newStageId: string) => {
      if (!note?.associated_project?.id) return;
      if (!newStageId || newStageId === (note.associated_project.stage_id ?? "")) return;

      setIsSaving(true);
      try {
        await updateProjectNoteStage(note.associated_project.id, note.id, newStageId);
        const stageName = projectStages.find((s) => s.id === newStageId)?.name ?? "";
        setNote((prev) =>
          prev?.associated_project
            ? {
                ...prev,
                associated_project: {
                  ...prev.associated_project,
                  stage_id: newStageId,
                  stage_name: stageName,
                },
              }
            : prev
        );
      } catch (err) {
        console.error("Error changing stage:", err);
      } finally {
        setIsSaving(false);
      }
    },
    [note, projectStages, updateProjectNoteStage]
  );

  const handlePriorityChange = useCallback(
    async (priorityId: string) => {
      if (!note) return;
      await saveAndApply({ priority_id: priorityId === "" ? null : priorityId });
    },
    [note, saveAndApply]
  );

  const handleDueDateChange = useCallback(
    async (dueDate: string | null) => {
      if (!note) return;
      await saveAndApply({ due_date: dueDate });
    },
    [note, saveAndApply]
  );

  const canEdit = mode === "edit" || mode === "create";

  if (!mounted || !isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        aria-label="Fechar"
        onClick={closeModal}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-note-modal-title"
        className="relative z-10 flex h-full w-full flex-col overflow-hidden bg-white shadow-2xl sm:h-[90vh] sm:max-h-[900px] sm:w-full sm:max-w-5xl sm:rounded-xl dark:bg-[#1d1d1b]"
        onPointerDown={(e) => e.stopPropagation()}
      >
        {mode === "edit" && noteId ? (
          <div className="flex min-h-0 flex-1 overflow-hidden">
            <NoteCommentsPanelProvider>
              <SharedTaskDetail
                taskId={noteId}
                orgId={user?.org_id || ""}
                isModal={true}
                onClose={closeModal}
              />
            </NoteCommentsPanelProvider>
          </div>
        ) : loading ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
          </div>
        ) : (
          <>
            <TaskNoteModalHeader
              mode={mode}
              note={note}
              isSaving={isSaving}
              isExporting={isExporting}
              showColorPicker={showColorPicker}
              showCommentsPanel={showCommentsPanel}
              onClose={closeModal}
              onDelete={handleDelete}
              onExport={handleExport}
              onToggleColorPicker={() => setShowColorPicker((v) => !v)}
              onColorChange={handleColorChange}
              onToggleComments={() => setShowCommentsPanel((v) => !v)}
              onCreateNote={mode === "create" ? handleCreateNote : undefined}
              createDisabled={Boolean(projectId && !(createStageId || stageId))}
              parentNoteId={parentNoteId}
              draftColor={createDraft.color}
              onDraftColorChange={(color) => patchCreateDraft({ color })}
              editingTitle={editingTitle}
              onTitleChange={handleTitleChange}
            />

            <div className="flex min-h-0 flex-1 overflow-hidden">
              <div
                className={`flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto ${showCommentsPanel ? "md:w-[60%]" : ""}`}
              >
                {noteConflict && (
                  <div className="mx-4 mt-4 rounded-md border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-800 dark:border-yellow-500/30 dark:bg-yellow-500/10 dark:text-yellow-200">
                    <strong>Conflito detectado:</strong> A tarefa foi modificada por outro usuário.
                    <button
                      onClick={() => noteId && loadNote()}
                      className="ml-2 underline hover:no-underline"
                    >
                      Recarregar
                    </button>
                  </div>
                )}

                <TaskNoteModalMeta
                  mode={mode}
                  note={note}
                  projects={projects}
                  projectStages={projectStages}
                  taskPriorities={taskPriorities}
                  initialProjectId={projectId}
                  initialStageId={createStageId || stageId}
                  canEdit={canEdit}
                  onProjectChange={handleProjectChange}
                  onStageChange={handleStageChange}
                  onPriorityChange={handlePriorityChange}
                  onDueDateChange={handleDueDateChange}
                  onSaveAndApply={saveAndApply}
                  projectTags={projectTagsForCreate}
                  projectCollaborators={projectCollaboratorsForCreate}
                  createDraft={mode === "create" ? createDraft : undefined}
                  createStageId={createStageId}
                  onCreateStageChange={setCreateStageId}
                  onCreateDraftChange={patchCreateDraft}
                />

                <TaskNoteModalContent
                  mode={mode}
                  note={note}
                  blocks={blocks}
                  editingTitle={editingTitle}
                  editingDescription={editingDescription}
                  canEdit={canEdit}
                  onTitleChange={handleTitleChange}
                  onDescriptionChange={handleDescriptionChange}
                  onBlocksSave={handleBlocksSave}
                  createBlocks={createDraft.blocks}
                  onCreateBlocksChange={(blocks) => patchCreateDraft({ blocks })}
                />
              </div>

              {showCommentsPanel && note && (
                <NoteCommentsProvider noteId={note.id}>
                  <div className="dark:border-surface-dark-border hidden w-[40%] border-l border-neutral-200 md:block">
                    <TaskNoteModalCommentsPanel
                      note={note}
                      onClose={() => setShowCommentsPanel(false)}
                    />
                  </div>
                </NoteCommentsProvider>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

function TaskNoteModalCommentsPanel({ note, onClose }: { note: Note; onClose: () => void }) {
  const notesContext = useContext(NotesContext);
  const searchUsers = notesContext ? notesContext.searchUsers : async () => [];

  const embeddableFiles: NoteCommentsEmbeddableFile[] = React.useMemo(() => {
    const files = note.properties?.files || [];
    return files.map((f) => ({
      id: f.id as string,
      name: f.name as string,
      path: f.path as string,
      type: f.type as string,
    }));
  }, [note.properties?.files]);

  const handleSearchMentionUsers = React.useCallback(
    async (query: string) => {
      if (query.length < 3) return [];
      try {
        return await searchUsers(query);
      } catch {
        return [];
      }
    },
    [searchUsers]
  );

  const canComment = note.access?.canEdit ?? false;

  return (
    <NoteCommentsSidebar
      canComment={canComment}
      onClose={onClose}
      searchMentionUsers={handleSearchMentionUsers}
      embeddableNoteFiles={embeddableFiles}
    />
  );
}
