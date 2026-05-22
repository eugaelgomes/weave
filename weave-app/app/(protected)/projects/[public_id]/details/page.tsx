"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  FaArrowLeft,
  FaSpinner,
  FaPlus,
  FaTrash,
  FaPen,
  FaCheck,
  FaTimes,
  FaSearch,
  FaEye,
  FaKey,
  FaPlay,
  FaFlag,
} from "react-icons/fa";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/app/_contexts/auth-context";
import { useProjects } from "@/app/_contexts/projects-context";
import { useNotes } from "@/app/_contexts/notes-context";
import getStorageUrl from "@/app/_utils/get-storage-url";
import { PROJECT_STATUS, type ProjectStatus } from "@/app/_utils/db-enums";

const STATUS_OPTIONS: ProjectStatus[] = [
  PROJECT_STATUS.OPEN,
  PROJECT_STATUS.IN_PROGRESS,
  PROJECT_STATUS.PAUSED,
  PROJECT_STATUS.COMPLETED,
  PROJECT_STATUS.ARCHIVED,
];
const METHODOLOGY_OPTIONS = ["kanban", "scrum"] as const;
const LEVEL_OPTIONS = ["alta", "media", "baixa"] as const;

const STATUS_LABELS: Record<string, string> = {
  [PROJECT_STATUS.OPEN]: "Aberto",
  [PROJECT_STATUS.IN_PROGRESS]: "Em progresso",
  [PROJECT_STATUS.PAUSED]: "Pausado",
  [PROJECT_STATUS.COMPLETED]: "Concluído",
  [PROJECT_STATUS.ARCHIVED]: "Arquivado",
};

const METHODOLOGY_LABELS: Record<string, string> = {
  kanban: "Kanban",
  scrum: "Scrum",
};

const LEVEL_LABELS: Record<string, string> = {
  alta: "Alta",
  media: "Média",
  baixa: "Baixa",
};

const inputCls =
  "w-full rounded-md border border-neutral-200 bg-white px-2 py-1.5 text-xs text-neutral-800 transition-colors focus:border-neutral-400 focus:outline-none dark:border-surface-dark-border-strong dark:bg-[#1d1d1b] dark:text-neutral-100";
const selectCls = inputCls;
const btnPrimaryCls =
  "bg-brand-primary-500 inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-semibold text-neutral-900 transition-colors hover:bg-yellow-500 disabled:opacity-50";
const btnSecondaryCls =
  "inline-flex items-center gap-1.5 rounded-md border border-neutral-200 px-2 py-1.5 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-100 dark:border-surface-dark-border-strong dark:text-neutral-200 dark:hover:bg-neutral-800";
const btnDangerCls =
  "inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10";

export default function ProjectDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params?.public_id as string;
  const { user } = useAuth();

  const {
    getProjectById,
    getCollaborators,
    getProjectNotes,
    getProjectStages,
    getProjectTags,
    getTaskPriorities,
    updateProject,
    deleteProject,
    deleteProjectStage,
    createProjectTag,
    updateProjectTag,
    deleteProjectTag,
    createTaskPriority,
    updateTaskPriority,
    deleteTaskPriority,
    addCollaborator,
    updateCollaboratorPermission,
    removeCollaborator,
    getAiReportConfig,
    updateAiReportConfig,
    getSprints,
    getActiveSprint,
    createSprint,
    completeSprint,
    getReasonings,
    getReasoningById,
    getReasoningActionItems,
    updateReasoningInteraction,
    updateReasoningActionItem,
  } = useProjects();

  const { searchUsers } = useNotes();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [project, setProject] = useState<any>(null);
  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [stages, setStages] = useState<any[]>([]);
  const [projectTags, setProjectTags] = useState<any[]>([]);
  const [taskPriorities, setTaskPriorities] = useState<any[]>([]);
  const [formData, setFormData] = useState<any>(null);
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const lastSavedData = React.useRef<string | null>(null);
  const initialized = React.useRef(false);

  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#6366f1");
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editingTagName, setEditingTagName] = useState("");
  const [editingTagColor, setEditingTagColor] = useState("");

  const [newPriorityName, setNewPriorityName] = useState("");
  const [newPriorityColor, setNewPriorityColor] = useState("#ef4444");
  const [newPriorityLevel, setNewPriorityLevel] = useState(0);
  const [editingPriorityId, setEditingPriorityId] = useState<string | null>(null);
  const [editingPriorityName, setEditingPriorityName] = useState("");
  const [editingPriorityColor, setEditingPriorityColor] = useState("");
  const [editingPriorityLevel, setEditingPriorityLevel] = useState(0);

  const [collabSearch, setCollabSearch] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [addingCollab, setAddingCollab] = useState<string | null>(null);

  // Sprint state
  const [sprints, setSprints] = useState<any[]>([]);
  const [activeSprint, setActiveSprint] = useState<any>(null);
  const [showCreateSprint, setShowCreateSprint] = useState(false);
  const [sprintForm, setSprintForm] = useState({
    title: "",
    goal: "",
    start_date: "",
    end_date: "",
    activate: true,
  });
  const [creatingSprint, setCreatingSprint] = useState(false);

  // AI Report Config state
  const [reportConfig, setReportConfig] = useState<any>(null);
  const [reportConfigLoaded, setReportConfigLoaded] = useState(false);
  const [editingReport, setEditingReport] = useState(false);
  const [reportForm, setReportForm] = useState<any>(null);
  const [savingReport, setSavingReport] = useState(false);

  // Reasoning state
  const [reasonings, setReasonings] = useState<any[]>([]);
  const [selectedReasoning, setSelectedReasoning] = useState<any>(null);
  const [reasoningActionItems, setReasoningActionItems] = useState<any[]>([]);
  const loadAllData = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const [projectData, collabData, stagesData, tagsData, prioritiesData] = await Promise.all([
        getProjectById(projectId),
        getCollaborators(projectId),
        getProjectStages(projectId).catch(() => []),
        getProjectTags(projectId).catch(() => []),
        getTaskPriorities(projectId).catch(() => []),
      ]);

      if (!projectData) return;
      setProject(projectData);
      setCollaborators(collabData);
      setStages(stagesData);
      setProjectTags(tagsData);
      setTaskPriorities(prioritiesData);

      // Load sprints, report config, and reasonings in parallel (non-blocking)
      Promise.all([
        getSprints(projectId).catch(() => []),
        getActiveSprint(projectId).catch(() => null),
        getAiReportConfig(projectId).catch(() => null),
        getReasonings(projectId).catch(() => []),
      ]).then(([sprintsData, activeSprintData, configData, reasoningsData]) => {
        setSprints(sprintsData);
        setActiveSprint(activeSprintData);
        setReportConfig(configData);
        setReportConfigLoaded(true);
        setReasonings(reasoningsData);
      });
    } catch (error) {
      console.error("Erro ao carregar detalhes do projeto:", error);
    } finally {
      setLoading(false);
    }
  }, [
    projectId,
    getProjectById,
    getCollaborators,
    getProjectStages,
    getProjectTags,
    getTaskPriorities,
    getSprints,
    getActiveSprint,
    getAiReportConfig,
    getReasonings,
  ]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  useEffect(() => {
    if (!project) return;
    if (initialized.current && isDirty) return; // Não sobrescreve durante edições não salvas

    const freshFormData = {
      title: project.title || "",
      description: project.description || "",
      status: project.status || PROJECT_STATUS.OPEN,
      methodology: project.methodology || "kanban",
      active: project.active ?? true,
      color: project.properties?.color || "#eab308",
      priority: project.properties?.priority || "media",
      complexity: project.properties?.complexity || "media",
      estimated_time: project.properties?.estimated_time || "",
    };

    setFormData(freshFormData);
    lastSavedData.current = JSON.stringify(freshFormData);

    if (project.properties?.icon?.path) {
      setIconPreview(project.properties.icon.path);
    } else {
      setIconPreview(null);
    }
    initialized.current = true;
    setIsDirty(false);
  }, [project, isDirty]);

  useEffect(() => {
    if (collabSearch.length < 2) {
      setSearchResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      setSearchingUsers(true);
      try {
        const results = await searchUsers(collabSearch);
        setSearchResults(
          results.filter((u: any) => !collaborators.some((c) => c.user_id === u.id))
        );
      } catch {
        setSearchResults([]);
      } finally {
        setSearchingUsers(false);
      }
    }, 400);
    return () => clearTimeout(timeout);
  }, [collabSearch, searchUsers, collaborators]);

  const isOwner = project?.user_id === user?.id;
  const canEdit =
    isOwner || collaborators.some((c) => c.user_id === user?.id && c.permission === "admin");

  const handleSaveGeneral = useCallback(async () => {
    if (!canEdit || !isDirty || !project || !formData) return;
    setSaving(true);
    try {
      const currentDataSnapshot = JSON.stringify(formData);

      const properties: any = {
        ...project.properties,
        color: formData.color,
        priority: formData.priority as (typeof LEVEL_OPTIONS)[number],
        complexity: formData.complexity as (typeof LEVEL_OPTIONS)[number],
        estimated_time: formData.estimated_time || null,
      };

      if (!iconPreview && !iconFile) {
        properties.icon = { path: "" }; // Sinaliza remoção
      }

      let payload: any = {
        title: formData.title,
        description: formData.description || undefined,
        status: formData.status as ProjectStatus,
        methodology: formData.methodology as (typeof METHODOLOGY_OPTIONS)[number],
        active: formData.active,
        properties: properties,
      };

      if (iconFile) {
        const fd = new FormData();
        Object.entries(payload).forEach(([key, value]) => {
          if (value !== undefined) {
            fd.append(key, typeof value === "object" ? JSON.stringify(value) : String(value));
          }
        });
        fd.append("icon", iconFile);
        payload = fd;
      }

      const updated = await updateProject(project.id, payload);
      if (updated) {
        setProject(updated);
        setIconFile(null);
        lastSavedData.current = currentDataSnapshot;
        setFormData((prev: any) => {
          const stillDirty = JSON.stringify(prev) !== currentDataSnapshot;
          setIsDirty(stillDirty);
          return prev;
        });
      }
    } catch (error) {
      console.error("Erro ao salvar projeto:", error);
    } finally {
      setSaving(false);
    }
  }, [project, formData, iconFile, iconPreview, canEdit, isDirty, updateProject]);

  useEffect(() => {
    if (!isDirty || !canEdit || !formData?.title?.trim()) return;

    const timeoutId = setTimeout(() => {
      handleSaveGeneral();
    }, 1500);

    return () => clearTimeout(timeoutId);
  }, [formData, iconFile, iconPreview, isDirty, canEdit, handleSaveGeneral]);

  if (loading || !formData) {
    return (
      <div className="flex min-h-[50vh] flex-1 items-center justify-center">
        <div className="border-primary-500 h-4 w-4 animate-spin rounded-full border-b-2" />
      </div>
    );
  }

  if (!project) return null;

  const handleChange = (key: string, value: string | boolean) => {
    setFormData((prev: any) => {
      const next = { ...prev, [key]: value };
      setIsDirty(JSON.stringify(next) !== lastSavedData.current);
      return next;
    });
  };

  const handleIconChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setIconFile(file);
      setIconPreview(URL.createObjectURL(file));
      setIsDirty(true);
    }
  };

  const handleRemoveIcon = () => {
    setIconFile(null);
    setIconPreview(null);
    setIsDirty(true);
  };

  const handleDeleteProject = async () => {
    if (!isOwner) return;
    if (!window.confirm("Confirmar eliminação do projeto? Ação irreversível.")) return;
    try {
      await deleteProject(project.id);
      router.push("/projects");
    } catch (error) {
      console.error("Erro ao eliminar projeto:", error);
    }
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    setSaving(true);
    try {
      const tag = await createProjectTag(projectId, { name: newTagName, color: newTagColor });
      if (tag) setProjectTags((prev) => [...prev, tag]);
      setNewTagName("");
    } catch (error) {
      console.error("Erro ao criar tag:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateTag = async (tagId: string) => {
    setSaving(true);
    try {
      const updated = await updateProjectTag(projectId, tagId, {
        name: editingTagName,
        color: editingTagColor,
      });
      if (updated) setProjectTags((prev) => prev.map((t) => (t.id === tagId ? updated : t)));
      setEditingTagId(null);
    } catch (error) {
      console.error("Erro ao atualizar tag:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTag = async (tagId: string) => {
    if (!window.confirm("Eliminar tag?")) return;
    try {
      await deleteProjectTag(projectId, tagId);
      setProjectTags((prev) => prev.filter((t) => t.id !== tagId));
    } catch (error) {
      console.error("Erro ao eliminar tag:", error);
    }
  };

  const handleCreatePriority = async () => {
    if (!newPriorityName.trim()) return;
    setSaving(true);
    try {
      const priority = await createTaskPriority(projectId, {
        name: newPriorityName,
        color: newPriorityColor,
        level: newPriorityLevel,
      });
      if (priority) setTaskPriorities((prev) => [...prev, priority]);
      setNewPriorityName("");
      setNewPriorityLevel(0);
    } catch (error) {
      console.error("Erro ao criar prioridade:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePriority = async (priorityId: string) => {
    setSaving(true);
    try {
      const updated = await updateTaskPriority(projectId, priorityId, {
        name: editingPriorityName,
        color: editingPriorityColor,
        level: editingPriorityLevel,
      });
      if (updated)
        setTaskPriorities((prev) => prev.map((p) => (p.id === priorityId ? updated : p)));
      setEditingPriorityId(null);
    } catch (error) {
      console.error("Erro ao atualizar prioridade:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePriority = async (priorityId: string) => {
    if (!window.confirm("Eliminar prioridade?")) return;
    try {
      await deleteTaskPriority(projectId, priorityId);
      setTaskPriorities((prev) => prev.filter((p) => p.id !== priorityId));
    } catch (error) {
      console.error("Erro ao eliminar prioridade:", error);
    }
  };

  const handleAddCollaborator = async (userId: string, permission: "admin" | "viewer") => {
    setAddingCollab(userId);
    try {
      await addCollaborator(projectId, userId, permission);
      const updated = await getCollaborators(projectId);
      setCollaborators(updated);
      setCollabSearch("");
      setSearchResults([]);
    } catch (error) {
      console.error("Erro ao adicionar colaborador:", error);
    } finally {
      setAddingCollab(null);
    }
  };

  const handleUpdateCollabPermission = async (userId: string, permission: "admin" | "viewer") => {
    try {
      await updateCollaboratorPermission(projectId, userId, permission);
      const updated = await getCollaborators(projectId);
      setCollaborators(updated);
    } catch (error) {
      console.error("Erro ao atualizar permissão:", error);
    }
  };

  const handleRemoveCollaborator = async (userId: string) => {
    if (!window.confirm("Remover colaborador?")) return;
    try {
      await removeCollaborator(projectId, userId);
      setCollaborators((prev) => prev.filter((c) => c.user_id !== userId));
    } catch (error) {
      console.error("Erro ao remover colaborador:", error);
    }
  };

  // --- Stage delete ---
  const handleDeleteStage = async (stageId: string) => {
    if (!window.confirm("Eliminar etapa? As notas associadas perderão o estágio.")) return;
    try {
      await deleteProjectStage(projectId, stageId);
      setStages((prev) => prev.filter((s) => s.id !== stageId));
    } catch (error) {
      console.error("Erro ao eliminar etapa:", error);
    }
  };

  // --- Sprint handlers ---
  const handleCreateSprint = async () => {
    if (!sprintForm.start_date || !sprintForm.end_date) return;
    setCreatingSprint(true);
    try {
      const sprint = await createSprint(projectId, {
        title: sprintForm.title || undefined,
        goal: sprintForm.goal || undefined,
        start_date: sprintForm.start_date,
        end_date: sprintForm.end_date,
        activate: sprintForm.activate,
      });
      if (sprint) {
        setSprints((prev) => [sprint, ...prev]);
        if (sprintForm.activate) setActiveSprint(sprint);
        setShowCreateSprint(false);
        setSprintForm({ title: "", goal: "", start_date: "", end_date: "", activate: true });
      }
    } catch (error) {
      console.error("Erro ao criar sprint:", error);
    } finally {
      setCreatingSprint(false);
    }
  };

  const handleCompleteSprint = async (sprintId: string) => {
    if (!window.confirm("Concluir esta sprint?")) return;
    try {
      const result = await completeSprint(projectId, sprintId);
      if (result) {
        setSprints((prev) =>
          prev.map((s) =>
            s.id === sprintId
              ? { ...s, status: "completed", completed_at: new Date().toISOString() }
              : s
          )
        );
        if (result.next_sprint) {
          setSprints((prev) => [result.next_sprint!, ...prev]);
          setActiveSprint(result.next_sprint);
        } else {
          setActiveSprint(null);
        }
      }
    } catch (error) {
      console.error("Erro ao concluir sprint:", error);
    }
  };

  // --- AI Report Config handlers ---
  const handleEditReport = () => {
    setReportForm(
      reportConfig
        ? { ...reportConfig }
        : {
            enabled: true,
            report_time_utc: "09:00",
            channels: ["in_app"],
            recipient_scope: "all_members",
            default_sprint_duration_days: 14,
            default_workable_days: [1, 2, 3, 4, 5],
            auto_create_next_sprint: false,
            enable_sprint_kickoff: true,
            enable_daily_standup: false,
            enable_sprint_review: true,
          }
    );
    setEditingReport(true);
  };

  const handleSaveReport = async () => {
    if (!reportForm) return;
    setSavingReport(true);
    try {
      await updateAiReportConfig(projectId, reportForm);
      setReportConfig(reportForm);
      setEditingReport(false);
    } catch (error) {
      console.error("Erro ao salvar config de relatório:", error);
    } finally {
      setSavingReport(false);
    }
  };

  const handleSelectReasoning = async (reasoningId: string) => {
    try {
      const [reasoning, items] = await Promise.all([
        getReasoningById(projectId, reasoningId),
        getReasoningActionItems(projectId, reasoningId).catch(() => []),
      ]);
      setSelectedReasoning(reasoning);
      setReasoningActionItems(items);
      if (reasoning && !reasoning.is_read) {
        updateReasoningInteraction(projectId, reasoningId, { isRead: true }).catch(() => {});
      }
    } catch (error) {
      console.error("Erro ao carregar reasoning:", error);
    }
  };

  const handleToggleActionItem = async (
    reasoningId: string,
    itemId: string,
    currentCompleted: boolean
  ) => {
    try {
      const updated = await updateReasoningActionItem(projectId, reasoningId, itemId, {
        isCompleted: !currentCompleted,
      });
      if (updated) {
        setReasoningActionItems((prev) =>
          prev.map((item) => (item.id === itemId ? updated : item))
        );
      }
    } catch (error) {
      console.error("Erro ao atualizar action item:", error);
    }
  };

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col overflow-y-auto bg-[#FAFAFA] dark:bg-[#0E0E11]">
      <div className="dark:border-surface-dark-border flex h-10 flex-none items-center justify-between border-b border-neutral-200 bg-white px-2 dark:bg-[#1d1d1b]">
        <button
          type="button"
          onClick={() => router.push(`/projects/${projectId}`)}
          className="inline-flex items-center gap-1.5 text-[11px] font-medium text-neutral-600 transition-colors hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-neutral-100"
        >
          <FaArrowLeft className="size-2.5" />
          Voltar ao board
        </button>
        <span className="text-[11px] font-medium text-neutral-500">Detalhes: {project.title}</span>
      </div>

      <div className="mx-auto flex w-full flex-col gap-2">
        {/* Seção: Geral */}
        <div className="bg-white p-3 dark:bg-[#1d1d1b]">
          <h2 className="mb-2 text-xs font-semibold tracking-wide text-neutral-600 uppercase dark:text-neutral-400">
            Geral
          </h2>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="sm:col-span-2">
              <span className="mb-1 block text-[10px] text-neutral-500">Título</span>
              <input
                value={formData.title}
                onChange={(e) => handleChange("title", e.target.value)}
                className={inputCls}
                disabled={!canEdit}
              />
            </label>

            <label className="sm:col-span-2">
              <span className="mb-1 block text-[10px] text-neutral-500">Descrição</span>
              <textarea
                value={formData.description}
                onChange={(e) => handleChange("description", e.target.value)}
                className={`${inputCls} min-h-[60px]`}
                disabled={!canEdit}
              />
            </label>

            <label>
              <span className="mb-1 block text-[10px] text-neutral-500">Status</span>
              <select
                value={formData.status}
                onChange={(e) => handleChange("status", e.target.value)}
                className={selectCls}
                disabled={!canEdit}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="mb-1 block text-[10px] text-neutral-500">Metodologia</span>
              <select
                value={formData.methodology}
                onChange={(e) => handleChange("methodology", e.target.value)}
                className={selectCls}
                disabled={!canEdit}
              >
                {METHODOLOGY_OPTIONS.map((m) => (
                  <option key={m} value={m}>
                    {METHODOLOGY_LABELS[m]}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="mb-1 block text-[10px] text-neutral-500">Prioridade</span>
              <select
                value={formData.priority}
                onChange={(e) => handleChange("priority", e.target.value)}
                className={selectCls}
                disabled={!canEdit}
              >
                {LEVEL_OPTIONS.map((l) => (
                  <option key={l} value={l}>
                    {LEVEL_LABELS[l]}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="mb-1 block text-[10px] text-neutral-500">Complexidade</span>
              <select
                value={formData.complexity}
                onChange={(e) => handleChange("complexity", e.target.value)}
                className={selectCls}
                disabled={!canEdit}
              >
                {LEVEL_OPTIONS.map((l) => (
                  <option key={l} value={l}>
                    {LEVEL_LABELS[l]}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="mb-1 block text-[10px] text-neutral-500">Tempo estimado</span>
              <input
                value={formData.estimated_time}
                onChange={(e) => handleChange("estimated_time", e.target.value)}
                className={inputCls}
                disabled={!canEdit}
              />
            </label>

            <label>
              <span className="mb-1 block text-[10px] text-neutral-500">Cor</span>
              <input
                type="color"
                value={formData.color}
                onChange={(e) => handleChange("color", e.target.value)}
                className="dark:border-surface-dark-border-strong h-8 w-full rounded-md border border-neutral-200 bg-white px-1 py-0.5 dark:bg-[#1d1d1b]"
                disabled={!canEdit}
              />
            </label>

            <div className="sm:col-span-2">
              <span className="mb-1 block text-[10px] text-neutral-500">Ícone do Projeto</span>
              <div className="flex items-center gap-3">
                {iconPreview ? (
                  <div className="dark:border-surface-dark-border-strong relative h-12 w-12 overflow-hidden rounded-md border border-neutral-200">
                    <img
                      src={
                        iconPreview.startsWith("http") || iconPreview.startsWith("blob")
                          ? iconPreview
                          : `https://spaces.weavenotes.com/${iconPreview}`
                      }
                      alt="Ícone do Projeto"
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/default-project-icon.png";
                      }}
                    />
                  </div>
                ) : (
                  <div className="dark:border-surface-dark-border-strong flex h-12 w-12 items-center justify-center rounded-md border border-neutral-200 bg-neutral-50 text-neutral-400 dark:bg-[#1d1d1b]">
                    <FaArrowLeft className="size-4 opacity-0" />
                  </div>
                )}
                {canEdit && (
                  <div className="flex gap-2">
                    <label className="cursor-pointer rounded-md bg-neutral-100 px-3 py-1.5 text-[11px] font-medium text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700">
                      Mudar Ícone
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleIconChange}
                      />
                    </label>
                    {iconPreview && (
                      <button
                        type="button"
                        onClick={handleRemoveIcon}
                        className="rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-[11px] font-medium text-red-600 hover:bg-red-100 dark:border-red-900/50 dark:bg-red-900/10 dark:hover:bg-red-900/20"
                      >
                        Remover
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            <label className="flex cursor-pointer items-center gap-2 self-end pb-1">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={formData.active}
                  onChange={(e) => handleChange("active", e.target.checked)}
                  disabled={!canEdit}
                  className="peer sr-only"
                />
                <div className="peer-checked:bg-brand-primary-500 h-5 w-9 rounded-full bg-neutral-200 transition-colors peer-disabled:opacity-50 dark:bg-neutral-700"></div>
                <div className="absolute top-[2px] left-[2px] h-4 w-4 rounded-full bg-white transition-all peer-checked:translate-x-full"></div>
              </div>
              <span className="text-xs text-neutral-600 dark:text-neutral-300">Projeto ativo</span>
            </label>
          </div>

          <div className="dark:border-surface-dark-border mt-2 flex items-center justify-between border-t border-neutral-200 pt-2">
            {isOwner && (
              <button type="button" onClick={handleDeleteProject} className={btnDangerCls}>
                <FaTrash className="size-2.5" /> Eliminar
              </button>
            )}
            {canEdit && (
              <div className="ml-auto flex items-center gap-2 text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                {saving ? (
                  <>
                    <FaSpinner className="text-brand-primary-500 size-3 animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : isDirty ? (
                  <span>Edições pendentes...</span>
                ) : (
                  <>
                    <FaCheck className="size-3 text-green-500" />
                    <span>Salvo automaticamente</span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Seção: Tags */}
        <div className="bg-white p-3 dark:bg-[#1d1d1b]">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-xs font-semibold tracking-wide text-neutral-600 uppercase dark:text-neutral-400">
              Tags ({projectTags.length})
            </h2>
          </div>

          {canEdit && (
            <div className="dark:border-surface-dark-border flex items-end gap-1.5 border-b border-neutral-100 pb-2">
              <label className="flex-1">
                <span className="mb-0.5 block text-[10px] text-neutral-500">Nova Tag</span>
                <input
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  placeholder="Ex: Urgente"
                  className={inputCls}
                />
              </label>
              <label>
                <span className="mb-0.5 block text-[10px] text-neutral-500">Cor</span>
                <input
                  type="color"
                  value={newTagColor}
                  onChange={(e) => setNewTagColor(e.target.value)}
                  className="dark:border-surface-dark-border-strong h-7 w-8 rounded-md border border-neutral-200 bg-white p-0 dark:bg-[#1d1d1b]"
                />
              </label>
              <button
                type="button"
                onClick={handleCreateTag}
                disabled={saving || !newTagName.trim()}
                className={btnPrimaryCls}
              >
                Adicionar
              </button>
            </div>
          )}

          <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
            {projectTags.map((tag) => (
              <div
                key={tag.id}
                className="dark:border-surface-dark-border flex items-center gap-1.5 rounded-md border border-neutral-100 bg-neutral-50 px-2 py-1.5 dark:bg-[#1d1d1b]/50"
              >
                {editingTagId === tag.id ? (
                  <>
                    <input
                      type="color"
                      value={editingTagColor}
                      onChange={(e) => setEditingTagColor(e.target.value)}
                      className="h-5 w-5 rounded border border-neutral-200 p-0"
                    />
                    <input
                      value={editingTagName}
                      onChange={(e) => setEditingTagName(e.target.value)}
                      className={`${inputCls} flex-1 py-1`}
                      autoFocus
                    />
                    <button onClick={() => handleUpdateTag(tag.id)} className="text-green-600">
                      <FaCheck className="size-2.5" />
                    </button>
                    <button onClick={() => setEditingTagId(null)} className="text-neutral-400">
                      <FaTimes className="size-2.5" />
                    </button>
                  </>
                ) : (
                  <>
                    <span
                      className="size-2.5 flex-none rounded-full"
                      style={{ backgroundColor: tag.color_hex || "#6366f1" }}
                    />
                    <span className="flex-1 text-[11px] text-neutral-700 dark:text-neutral-200">
                      {tag.name}
                    </span>
                    {canEdit && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingTagId(tag.id);
                            setEditingTagName(tag.name);
                            setEditingTagColor(tag.color_hex || "#6366f1");
                          }}
                          className="text-neutral-400 hover:text-neutral-600"
                        >
                          <FaPen className="size-2" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteTag(tag.id)}
                          className="text-neutral-400 hover:text-red-500"
                        >
                          <FaTrash className="size-2" />
                        </button>
                      </>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Seção: Prioridades */}
        <div className="bg-white p-3 dark:bg-[#1d1d1b]">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-xs font-semibold tracking-wide text-neutral-600 uppercase dark:text-neutral-400">
              Prioridades ({taskPriorities.length})
            </h2>
          </div>

          {canEdit && (
            <div className="dark:border-surface-dark-border flex items-end gap-1.5 border-b border-neutral-100 pb-2">
              <label className="flex-1">
                <span className="mb-0.5 block text-[10px] text-neutral-500">Nova Prioridade</span>
                <input
                  value={newPriorityName}
                  onChange={(e) => setNewPriorityName(e.target.value)}
                  placeholder="Ex: Crítica"
                  className={inputCls}
                />
              </label>
              <label>
                <span className="mb-0.5 block text-[10px] text-neutral-500">Cor</span>
                <input
                  type="color"
                  value={newPriorityColor}
                  onChange={(e) => setNewPriorityColor(e.target.value)}
                  className="dark:border-surface-dark-border-strong h-7 w-8 rounded-md border border-neutral-200 bg-white p-0 dark:bg-[#1d1d1b]"
                />
              </label>
              <label>
                <span className="mb-0.5 block text-[10px] text-neutral-500">Ordem</span>
                <input
                  type="number"
                  value={newPriorityLevel}
                  onChange={(e) => setNewPriorityLevel(Number(e.target.value))}
                  className={`${inputCls} w-12`}
                />
              </label>
              <button
                type="button"
                onClick={handleCreatePriority}
                disabled={saving || !newPriorityName.trim()}
                className={btnPrimaryCls}
              >
                Adicionar
              </button>
            </div>
          )}

          <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
            {taskPriorities.map((priority) => (
              <div
                key={priority.id}
                className="dark:border-surface-dark-border flex items-center gap-1.5 rounded-md border border-neutral-100 bg-neutral-50 px-2 py-1.5 dark:bg-[#1d1d1b]/50"
              >
                {editingPriorityId === priority.id ? (
                  <>
                    <input
                      type="color"
                      value={editingPriorityColor}
                      onChange={(e) => setEditingPriorityColor(e.target.value)}
                      className="h-5 w-5 rounded border border-neutral-200 p-0"
                    />
                    <input
                      value={editingPriorityName}
                      onChange={(e) => setEditingPriorityName(e.target.value)}
                      className={`${inputCls} flex-1 py-1`}
                      autoFocus
                    />
                    <input
                      type="number"
                      value={editingPriorityLevel}
                      onChange={(e) => setEditingPriorityLevel(Number(e.target.value))}
                      className={`${inputCls} w-10 py-1`}
                    />
                    <button
                      onClick={() => handleUpdatePriority(priority.id)}
                      className="text-green-600"
                    >
                      <FaCheck className="size-2.5" />
                    </button>
                    <button onClick={() => setEditingPriorityId(null)} className="text-neutral-400">
                      <FaTimes className="size-2.5" />
                    </button>
                  </>
                ) : (
                  <>
                    <span
                      className="size-2.5 flex-none rounded-full"
                      style={{ backgroundColor: priority.color_hex || "#ef4444" }}
                    />
                    <span className="flex-1 text-[11px] text-neutral-700 dark:text-neutral-200">
                      {priority.name}
                    </span>
                    <span className="text-[9px] text-neutral-400">#{priority.sort_order}</span>
                    {canEdit && (
                      <>
                        <button
                          onClick={() => {
                            setEditingPriorityId(priority.id);
                            setEditingPriorityName(priority.name);
                            setEditingPriorityColor(priority.color_hex || "#ef4444");
                            setEditingPriorityLevel(priority.sort_order ?? 0);
                          }}
                          className="text-neutral-400 hover:text-neutral-600"
                        >
                          <FaPen className="size-2" />
                        </button>
                        <button
                          onClick={() => handleDeletePriority(priority.id)}
                          className="text-neutral-400 hover:text-red-500"
                        >
                          <FaTrash className="size-2" />
                        </button>
                      </>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Seção: Etapas */}
        <div className="bg-white p-3 dark:bg-[#1d1d1b]">
          <div className="mb-2">
            <h2 className="text-xs font-semibold tracking-wide text-neutral-600 uppercase dark:text-neutral-400">
              Etapas do Board ({stages.length})
            </h2>
          </div>

          <div className="grid gap-1.5 sm:grid-cols-3">
            {stages
              .sort((a, b) => a.position - b.position)
              .map((stage) => (
                <div
                  key={stage.id}
                  className="dark:border-surface-dark-border flex items-center justify-between rounded-md border border-neutral-100 bg-neutral-50 px-2 py-1.5 dark:bg-[#1d1d1b]/50"
                >
                  <div className="flex items-center gap-1.5">
                    <span
                      className="size-2.5 flex-none rounded-full"
                      style={{ backgroundColor: stage.color || "#a3a3a3" }}
                    />
                    <p className="text-[11px] font-medium text-neutral-700 dark:text-neutral-200">
                      {stage.name}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] text-neutral-400">Pos {stage.position}</span>
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => handleDeleteStage(stage.id)}
                        className="text-neutral-400 hover:text-red-500"
                        title="Eliminar etapa"
                      >
                        <FaTrash className="size-2" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Seção: Colaboradores */}
        <div className="bg-white p-3 dark:bg-[#1d1d1b]">
          <h2 className="mb-2 text-xs font-semibold tracking-wide text-neutral-600 uppercase dark:text-neutral-400">
            Colaboradores ({collaborators.length})
          </h2>

          {canEdit && (
            <div className="dark:border-surface-dark-border mb-2 border-b border-neutral-100 pb-2">
              <div className="relative">
                <FaSearch className="absolute top-1/2 left-2 size-2.5 -translate-y-1/2 text-neutral-400" />
                <input
                  value={collabSearch}
                  onChange={(e) => setCollabSearch(e.target.value)}
                  placeholder="Procurar usuário..."
                  className={`${inputCls} pl-6`}
                />
              </div>

              {searchingUsers && (
                <div className="mt-1 flex items-center gap-1 text-[10px] text-neutral-400">
                  <FaSpinner className="size-2.5 animate-spin" /> Buscando...
                </div>
              )}

              {searchResults.length > 0 && (
                <div className="dark:border-surface-dark-border mt-1 max-h-32 space-y-1 overflow-y-auto rounded-md border border-neutral-200 p-1">
                  {searchResults.map((u) => (
                    <div
                      key={u.id}
                      className="flex items-center justify-between rounded bg-neutral-50 p-1.5 dark:bg-[#1d1d1b]/50"
                    >
                      <div className="flex items-center gap-1.5">
                        <div className="flex size-5 items-center justify-center rounded bg-neutral-200 text-[9px] font-bold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                          {(u.name || u.username).charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-[10px] font-medium text-neutral-700 dark:text-neutral-200">
                            {u.name || u.username}
                          </p>
                          <p className="text-[9px] text-neutral-400">{u.email}</p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleAddCollaborator(u.id, "viewer")}
                          disabled={addingCollab === u.id}
                          className="dark:border-surface-dark-border-strong rounded border border-neutral-200 px-1.5 py-0.5 text-[9px] hover:bg-neutral-100 dark:hover:bg-neutral-800"
                        >
                          Leitor
                        </button>
                        <button
                          onClick={() => handleAddCollaborator(u.id, "admin")}
                          disabled={addingCollab === u.id}
                          className="dark:border-surface-dark-border-strong rounded border border-neutral-200 px-1.5 py-0.5 text-[9px] hover:bg-neutral-100 dark:hover:bg-neutral-800"
                        >
                          Admin
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="grid gap-1.5 sm:grid-cols-2">
            {collaborators.map((collab) => (
              <div
                key={collab.user_id}
                className="dark:border-surface-dark-border flex items-center justify-between rounded-md border border-neutral-100 bg-neutral-50 px-2 py-1.5 dark:bg-[#1d1d1b]/50"
              >
                <div className="flex items-center gap-1.5 overflow-hidden">
                  <div className="flex size-6 flex-shrink-0 items-center justify-center rounded bg-neutral-200 text-[10px] font-bold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                    {(collab.name || collab.username || "?").charAt(0).toUpperCase()}
                  </div>
                  <div className="overflow-hidden">
                    <p className="truncate text-[11px] font-medium text-neutral-700 dark:text-neutral-200">
                      {collab.name || collab.username}
                    </p>
                    <p className="truncate text-[9px] text-neutral-400">{collab.email}</p>
                  </div>
                </div>
                <div className="flex flex-shrink-0 items-center gap-1.5">
                  {canEdit ? (
                    <select
                      value={collab.permission}
                      onChange={(e) =>
                        handleUpdateCollabPermission(
                          collab.user_id,
                          e.target.value as "admin" | "viewer"
                        )
                      }
                      className="dark:border-surface-dark-border-strong rounded border border-neutral-200 bg-white px-1 py-0.5 text-[10px] focus:outline-none dark:bg-[#1d1d1b]"
                    >
                      <option value="viewer">Leitor</option>
                      <option value="admin">Admin</option>
                    </select>
                  ) : (
                    <span className="text-[9px] text-neutral-500">
                      {collab.permission === "admin" ? "Admin" : "Leitor"}
                    </span>
                  )}
                  {canEdit && (
                    <button
                      onClick={() => handleRemoveCollaborator(collab.user_id)}
                      className="text-neutral-400 hover:text-red-500"
                    >
                      <FaTrash className="size-2.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Seção: Sprints */}
        <div className="bg-white p-3 dark:bg-[#1d1d1b]">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-xs font-semibold tracking-wide text-neutral-600 uppercase dark:text-neutral-400">
              Sprints ({sprints.length})
            </h2>
            {canEdit && (
              <button
                type="button"
                onClick={() => setShowCreateSprint(!showCreateSprint)}
                className={btnPrimaryCls}
              >
                <FaPlus className="size-2" /> Nova Sprint
              </button>
            )}
          </div>

          {activeSprint && (
            <div className="mb-2 rounded-md border border-green-200 bg-green-50 p-2 dark:border-green-900/50 dark:bg-green-900/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <FaPlay className="size-2 text-green-600 dark:text-green-400" />
                  <span className="text-[11px] font-semibold text-green-700 dark:text-green-300">
                    Sprint ativa: {activeSprint.title || `Sprint ${activeSprint.sprint_number}`}
                  </span>
                </div>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => handleCompleteSprint(activeSprint.id)}
                    className="rounded border border-green-300 bg-white px-1.5 py-0.5 text-[9px] font-medium text-green-700 hover:bg-green-100 dark:border-green-800 dark:bg-green-900/30 dark:text-green-300 dark:hover:bg-green-900/50"
                  >
                    <FaFlag className="mr-1 inline size-2" />
                    Concluir
                  </button>
                )}
              </div>
              <div className="mt-1 flex gap-3 text-[10px] text-green-600 dark:text-green-400">
                <span>Início: {new Date(activeSprint.start_date).toLocaleDateString("pt-BR")}</span>
                <span>Fim: {new Date(activeSprint.end_date).toLocaleDateString("pt-BR")}</span>
              </div>
              {activeSprint.goal && (
                <p className="mt-1 text-[10px] text-green-600 dark:text-green-400/80">
                  {activeSprint.goal}
                </p>
              )}
            </div>
          )}

          {showCreateSprint && canEdit && (
            <div className="dark:border-surface-dark-border mb-2 rounded-md border border-neutral-200 bg-neutral-50 p-2 dark:bg-[#1d1d1b]/50">
              <div className="grid gap-1.5 sm:grid-cols-2">
                <label>
                  <span className="mb-0.5 block text-[10px] text-neutral-500">Título</span>
                  <input
                    value={sprintForm.title}
                    onChange={(e) => setSprintForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder="Sprint X"
                    className={inputCls}
                  />
                </label>
                <label>
                  <span className="mb-0.5 block text-[10px] text-neutral-500">Objetivo</span>
                  <input
                    value={sprintForm.goal}
                    onChange={(e) => setSprintForm((f) => ({ ...f, goal: e.target.value }))}
                    placeholder="Opcional"
                    className={inputCls}
                  />
                </label>
                <label>
                  <span className="mb-0.5 block text-[10px] text-neutral-500">Data início *</span>
                  <input
                    type="date"
                    value={sprintForm.start_date}
                    onChange={(e) => setSprintForm((f) => ({ ...f, start_date: e.target.value }))}
                    className={inputCls}
                  />
                </label>
                <label>
                  <span className="mb-0.5 block text-[10px] text-neutral-500">Data fim *</span>
                  <input
                    type="date"
                    value={sprintForm.end_date}
                    onChange={(e) => setSprintForm((f) => ({ ...f, end_date: e.target.value }))}
                    className={inputCls}
                  />
                </label>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <label className="flex items-center gap-1.5 text-[10px] text-neutral-600 dark:text-neutral-300">
                  <input
                    type="checkbox"
                    checked={sprintForm.activate}
                    onChange={(e) => setSprintForm((f) => ({ ...f, activate: e.target.checked }))}
                    className="rounded border-neutral-300"
                  />
                  Ativar imediatamente
                </label>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setShowCreateSprint(false)}
                    className={btnSecondaryCls}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateSprint}
                    disabled={creatingSprint || !sprintForm.start_date || !sprintForm.end_date}
                    className={btnPrimaryCls}
                  >
                    {creatingSprint ? <FaSpinner className="size-2.5 animate-spin" /> : "Criar"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {sprints.length === 0 ? (
            <p className="text-[10px] text-neutral-400">Nenhuma sprint criada.</p>
          ) : (
            <div className="grid gap-1.5">
              {sprints
                .filter((s) => s.id !== activeSprint?.id)
                .sort(
                  (a: any, b: any) =>
                    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                )
                .map((sprint: any) => (
                  <div
                    key={sprint.id}
                    className="dark:border-surface-dark-border flex items-center justify-between rounded-md border border-neutral-100 bg-neutral-50 px-2 py-1.5 dark:bg-[#1d1d1b]/50"
                  >
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`size-2 rounded-full ${sprint.status === "completed" ? "bg-green-500" : sprint.status === "active" ? "bg-blue-500" : "bg-neutral-400"}`}
                      />
                      <span className="text-[11px] font-medium text-neutral-700 dark:text-neutral-200">
                        {sprint.title || `Sprint ${sprint.sprint_number}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] text-neutral-400">
                        {new Date(sprint.start_date).toLocaleDateString("pt-BR")} -{" "}
                        {new Date(sprint.end_date).toLocaleDateString("pt-BR")}
                      </span>
                      <span
                        className={`rounded px-1 py-0.5 text-[8px] font-semibold ${sprint.status === "completed" ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400" : sprint.status === "active" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400" : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"}`}
                      >
                        {sprint.status === "completed"
                          ? "Concluída"
                          : sprint.status === "active"
                            ? "Ativa"
                            : "Planeada"}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Seção: AI Report Config */}
        <div className="bg-white p-3 dark:bg-[#1d1d1b]">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-xs font-semibold tracking-wide text-neutral-600 uppercase dark:text-neutral-400">
              Relatórios & IA
            </h2>
            {canEdit && !editingReport && (
              <button type="button" onClick={handleEditReport} className={btnSecondaryCls}>
                <FaPen className="size-2" /> {reportConfig ? "Editar" : "Configurar"}
              </button>
            )}
          </div>

          {!reportConfigLoaded ? (
            <div className="flex items-center gap-1 text-[10px] text-neutral-400">
              <FaSpinner className="size-2.5 animate-spin" /> A carregar...
            </div>
          ) : editingReport && reportForm ? (
            <div className="dark:border-surface-dark-border space-y-2 rounded-md border border-neutral-200 bg-neutral-50 p-2 dark:bg-[#1d1d1b]/50">
              <div className="grid gap-1.5 sm:grid-cols-2">
                <label>
                  <span className="mb-0.5 block text-[10px] text-neutral-500">Hora (UTC)</span>
                  <input
                    type="text"
                    value={reportForm.report_time_utc ?? "09:00"}
                    onChange={(e) =>
                      setReportForm((f: any) => ({ ...f, report_time_utc: e.target.value }))
                    }
                    placeholder="HH:mm"
                    className={inputCls}
                  />
                </label>
                <label>
                  <span className="mb-0.5 block text-[10px] text-neutral-500">
                    Duração sprint (dias)
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={90}
                    value={reportForm.default_sprint_duration_days ?? 14}
                    onChange={(e) =>
                      setReportForm((f: any) => ({
                        ...f,
                        default_sprint_duration_days: Number(e.target.value) || 14,
                      }))
                    }
                    className={inputCls}
                  />
                </label>
                <div>
                  <span className="mb-0.5 block text-[10px] text-neutral-500">Canais</span>
                  <div className="flex gap-3">
                    {(["in_app", "email"] as const).map((ch) => (
                      <label
                        key={ch}
                        className="flex items-center gap-1 text-[10px] text-neutral-600 dark:text-neutral-300"
                      >
                        <input
                          type="checkbox"
                          checked={(reportForm.channels ?? []).includes(ch)}
                          onChange={(e) => {
                            const cur = new Set(reportForm.channels ?? []);
                            if (e.target.checked) cur.add(ch);
                            else cur.delete(ch);
                            setReportForm((f: any) => ({ ...f, channels: Array.from(cur) }));
                          }}
                          className="rounded border-neutral-300"
                        />
                        {ch === "in_app" ? "Na app" : "Email"}
                      </label>
                    ))}
                  </div>
                </div>
                <label>
                  <span className="mb-0.5 block text-[10px] text-neutral-500">Destinatários</span>
                  <select
                    value={reportForm.recipient_scope ?? "all_members"}
                    onChange={(e) =>
                      setReportForm((f: any) => ({ ...f, recipient_scope: e.target.value }))
                    }
                    className={selectCls}
                  >
                    <option value="owner_only">Apenas dono</option>
                    <option value="all_members">Todos os membros</option>
                    <option value="custom">Personalizado</option>
                  </select>
                </label>
              </div>
              <div className="flex flex-wrap gap-3">
                {(
                  [
                    ["enable_sprint_kickoff", "Kickoff de sprint"],
                    ["enable_daily_standup", "Daily standup"],
                    ["enable_sprint_review", "Review de sprint"],
                    ["auto_create_next_sprint", "Criar próxima sprint automaticamente"],
                  ] as const
                ).map(([key, label]) => (
                  <label
                    key={key}
                    className="flex items-center gap-1 text-[10px] text-neutral-600 dark:text-neutral-300"
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(reportForm[key])}
                      onChange={(e) =>
                        setReportForm((f: any) => ({ ...f, [key]: e.target.checked }))
                      }
                      className="rounded border-neutral-300"
                    />
                    {label}
                  </label>
                ))}
              </div>
              <div className="dark:border-surface-dark-border flex items-center justify-between border-t border-neutral-200 pt-2">
                <label className="flex items-center gap-1.5 text-[10px] text-neutral-600 dark:text-neutral-300">
                  <input
                    type="checkbox"
                    checked={reportForm.enabled ?? true}
                    onChange={(e) =>
                      setReportForm((f: any) => ({ ...f, enabled: e.target.checked }))
                    }
                    className="rounded border-neutral-300"
                  />
                  Relatórios ativos
                </label>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setEditingReport(false)}
                    className={btnSecondaryCls}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveReport}
                    disabled={savingReport}
                    className={btnPrimaryCls}
                  >
                    {savingReport ? (
                      <FaSpinner className="size-2.5 animate-spin" />
                    ) : (
                      <FaCheck className="size-2" />
                    )}
                    Guardar
                  </button>
                </div>
              </div>
            </div>
          ) : reportConfig ? (
            <div className="space-y-1 text-[10px] text-neutral-600 dark:text-neutral-400">
              <div className="flex items-center gap-2">
                <span
                  className={`size-2 rounded-full ${reportConfig.enabled ? "bg-green-500" : "bg-neutral-400"}`}
                />
                <span>{reportConfig.enabled ? "Relatórios ativos" : "Relatórios desativados"}</span>
              </div>
              <p>
                Hora UTC: {reportConfig.report_time_utc || "09:00"} | Sprint:{" "}
                {reportConfig.default_sprint_duration_days || 14} dias
              </p>
              <p>
                Canais:{" "}
                {(reportConfig.channels || [])
                  .map((c: string) => (c === "in_app" ? "Na app" : "Email"))
                  .join(", ") || "Nenhum"}
              </p>
              <p>
                Destinatários:{" "}
                {reportConfig.recipient_scope === "owner_only"
                  ? "Apenas dono"
                  : reportConfig.recipient_scope === "all_members"
                    ? "Todos os membros"
                    : "Personalizado"}
              </p>
            </div>
          ) : (
            <p className="text-[10px] text-neutral-400">
              Nenhuma configuração de relatório. Clique em Configurar para ativar.
            </p>
          )}
        </div>

        {/* Seção: AI Reasonings */}
        <div className="bg-white p-3 dark:bg-[#1d1d1b]">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-xs font-semibold tracking-wide text-neutral-600 uppercase dark:text-neutral-400">
              Análises IA ({reasonings.length})
            </h2>
            {canEdit && (
              <div className="flex flex-wrap gap-1.5">
                <Link
                  href={`/weave-engine/compose?projectId=${projectId}&from=project&intent=insight`}
                  className={btnPrimaryCls}
                >
                  <FaPlus className="size-2" /> Publicar insight
                </Link>
                <Link
                  href={`/weave-engine/compose?projectId=${projectId}&from=project&intent=instructions`}
                  className={btnSecondaryCls}
                >
                  Instruções do engine
                </Link>
              </div>
            )}
          </div>

          {selectedReasoning && (
            <div className="mb-2 rounded-md border border-indigo-200 bg-indigo-50 p-2 dark:border-indigo-900/50 dark:bg-indigo-900/10">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-300">
                  {selectedReasoning.title}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedReasoning(null);
                    setReasoningActionItems([]);
                  }}
                  className="text-indigo-400 hover:text-indigo-600"
                >
                  <FaTimes className="size-2.5" />
                </button>
              </div>
              {selectedReasoning.content && (
                <p className="mb-2 text-[10px] leading-relaxed whitespace-pre-wrap text-indigo-600 dark:text-indigo-300/80">
                  {selectedReasoning.content}
                </p>
              )}
              {reasoningActionItems.length > 0 && (
                <div className="space-y-1 border-t border-indigo-200 pt-1.5 dark:border-indigo-800">
                  <span className="text-[9px] font-semibold tracking-wider text-indigo-500 uppercase">
                    Itens de ação
                  </span>
                  {reasoningActionItems.map((item: any) => (
                    <label
                      key={item.id}
                      className="flex cursor-pointer items-start gap-1.5 rounded px-1 py-0.5 text-[10px] text-indigo-700 transition-colors hover:bg-indigo-100 dark:text-indigo-300 dark:hover:bg-indigo-900/20"
                    >
                      <input
                        type="checkbox"
                        checked={item.is_completed}
                        onChange={() =>
                          handleToggleActionItem(selectedReasoning.id, item.id, item.is_completed)
                        }
                        className="mt-0.5 rounded border-indigo-300"
                      />
                      <span className={item.is_completed ? "line-through opacity-60" : ""}>
                        {item.description || item.id}
                      </span>
                    </label>
                  ))}
                </div>
              )}
              <div className="mt-1.5 text-[9px] text-indigo-400">
                {selectedReasoning.reasoning_type && (
                  <span className="mr-2">Tipo: {selectedReasoning.reasoning_type}</span>
                )}
                Criado em: {new Date(selectedReasoning.created_at).toLocaleDateString("pt-BR")}
              </div>
            </div>
          )}

          {reasonings.length === 0 ? (
            <p className="text-[10px] text-neutral-400">Nenhuma análise IA disponível.</p>
          ) : (
            <div className="grid gap-1.5">
              {reasonings.map((reasoning: any) => (
                <button
                  key={reasoning.id}
                  type="button"
                  onClick={() => handleSelectReasoning(reasoning.id)}
                  className={`flex items-center justify-between rounded-md border px-2 py-1.5 text-left transition-colors ${
                    selectedReasoning?.id === reasoning.id
                      ? "border-indigo-300 bg-indigo-50 dark:border-indigo-800 dark:bg-indigo-900/20"
                      : "dark:border-surface-dark-border dark:hover:border-surface-dark-border-strong border-neutral-100 bg-neutral-50 hover:border-neutral-200 dark:bg-[#1d1d1b]/50"
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    {!reasoning.is_read && <span className="size-1.5 rounded-full bg-indigo-500" />}
                    <span className="text-[11px] font-medium text-neutral-700 dark:text-neutral-200">
                      {reasoning.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {reasoning.reasoning_type && (
                      <span className="rounded bg-neutral-100 px-1 py-0.5 text-[8px] text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                        {reasoning.reasoning_type}
                      </span>
                    )}
                    <span className="text-[9px] text-neutral-400">
                      {new Date(reasoning.created_at).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
