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
} from "react-icons/fa";
import Image from "next/image";
import { useAuth } from "@/app/_contexts/auth-context";
import { useProjects } from "@/app/_contexts/projects-context";
import { useNotes } from "@/app/_contexts/notes-context";
import getStorageUrl from "@/app/_utils/get-storage-url";

const STATUS_OPTIONS = ["open", "in_progress", "paused", "completed", "archived"] as const;
const METHODOLOGY_OPTIONS = ["kanban", "scrum", "waterfall", "custom"] as const;
const VIEW_OPTIONS = ["board", "list", "calendar", "timeline", "gantt"] as const;
const LEVEL_OPTIONS = ["alta", "media", "baixa"] as const;

const STATUS_LABELS: Record<string, string> = {
  open: "Aberto",
  in_progress: "Em progresso",
  paused: "Pausado",
  completed: "Concluído",
  archived: "Arquivado",
};

const METHODOLOGY_LABELS: Record<string, string> = {
  kanban: "Kanban",
  scrum: "Scrum",
  waterfall: "Waterfall",
  custom: "Personalizado",
};

const VIEW_LABELS: Record<string, string> = {
  board: "Board",
  list: "Lista",
  calendar: "Calendário",
  timeline: "Timeline",
  gantt: "Gantt",
};

const LEVEL_LABELS: Record<string, string> = {
  alta: "Alta",
  media: "Média",
  baixa: "Baixa",
};

const inputCls =
  "w-full rounded-md border border-neutral-200 bg-white px-2 py-1.5 text-xs text-neutral-800 transition-colors focus:border-neutral-400 focus:outline-none dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100";
const selectCls = inputCls;
const btnPrimaryCls =
  "bg-brand-primary-500 inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-semibold text-neutral-900 transition-colors hover:bg-yellow-500 disabled:opacity-50";
const btnSecondaryCls =
  "inline-flex items-center gap-1.5 rounded-md border border-neutral-200 px-2 py-1.5 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800";
const btnDangerCls =
  "inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10";
const cardCls =
  "rounded-md border border-neutral-200 bg-white p-2 shadow-sm dark:border-neutral-800 dark:bg-neutral-900";

export default function ProjectDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params?.id as string;
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
    createProjectTag,
    updateProjectTag,
    deleteProjectTag,
    createTaskPriority,
    updateTaskPriority,
    deleteTaskPriority,
    addCollaborator,
    updateCollaboratorPermission,
    removeCollaborator,
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

  const loadAllData = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const [projectData, collabData, stagesData, tagsData, prioritiesData] =
        await Promise.all([
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
  ]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  useEffect(() => {
    if (!project) return;
    setFormData({
      title: project.title || "",
      description: project.description || "",
      status: project.status || "open",
      methodology: project.methodology || "kanban",
      default_view: project.default_view || "board",
      active: project.active ?? true,
      color: project.properties?.color || "#eab308",
      priority: project.properties?.priority || "media",
      complexity: project.properties?.complexity || "media",
      estimated_time: project.properties?.estimated_time || "",
    });
  }, [project]);

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

  if (loading || !formData) {
    return (
      <div className="flex min-h-[50vh] flex-1 items-center justify-center">
        <div className="border-primary-500 h-4 w-4 animate-spin rounded-full border-b-2" />
      </div>
    );
  }

  if (!project) return null;

  const isOwner = project.user_id === user?.id;
  const canEdit =
    isOwner || collaborators.some((c) => c.user_id === user?.id && c.permission === "admin");

  const handleChange = (key: string, value: string | boolean) => {
    setFormData((prev: any) => ({ ...prev, [key]: value }));
  };

  const handleSaveGeneral = async () => {
    if (!canEdit) return;
    setSaving(true);
    try {
      const payload = {
        title: formData.title,
        description: formData.description || undefined,
        status: formData.status as (typeof STATUS_OPTIONS)[number],
        methodology: formData.methodology as (typeof METHODOLOGY_OPTIONS)[number],
        default_view: formData.default_view as (typeof VIEW_OPTIONS)[number],
        active: formData.active,
        properties: {
          ...project.properties,
          color: formData.color,
          priority: formData.priority as (typeof LEVEL_OPTIONS)[number],
          complexity: formData.complexity as (typeof LEVEL_OPTIONS)[number],
          estimated_time: formData.estimated_time || null,
        },
      };
      const updated = await updateProject(project.id, payload);
      if (updated) setProject(updated);
    } catch (error) {
      console.error("Erro ao salvar projeto:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!isOwner) return;
    if (!window.confirm("Confirmar eliminação do projeto? Ação irreversível.")) return;
    try {
      await deleteProject(project.id);
      router.push("/app/projects");
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

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col overflow-y-auto bg-[#FAFAFA] dark:bg-[#0E0E11]">
      <div className="flex h-10 flex-none items-center justify-between border-b border-neutral-200 bg-white px-2 dark:border-neutral-800 dark:bg-neutral-900">
        <button
          type="button"
          onClick={() => router.push(`/app/projects/${projectId}`)}
          className="inline-flex items-center gap-1.5 text-[11px] font-medium text-neutral-600 transition-colors hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-neutral-100"
        >
          <FaArrowLeft className="size-2.5" />
          Voltar ao board
        </button>
        <span className="text-[11px] font-medium text-neutral-500">
          Detalhes: {project.title}
        </span>
      </div>

      <div className="mx-auto flex w-full max-w-4xl flex-col gap-2 p-2">
        {/* Seção: Geral */}
        <div className={cardCls}>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-600 dark:text-neutral-400">
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
              <span className="mb-1 block text-[10px] text-neutral-500">Visualização</span>
              <select
                value={formData.default_view}
                onChange={(e) => handleChange("default_view", e.target.value)}
                className={selectCls}
                disabled={!canEdit}
              >
                {VIEW_OPTIONS.map((v) => (
                  <option key={v} value={v}>
                    {VIEW_LABELS[v]}
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
                className="h-8 w-full rounded-md border border-neutral-200 bg-white px-1 py-0.5 dark:border-neutral-700 dark:bg-neutral-950"
                disabled={!canEdit}
              />
            </label>

            <label className="flex items-center gap-1.5 self-end pb-1">
              <input
                type="checkbox"
                checked={formData.active}
                onChange={(e) => handleChange("active", e.target.checked)}
                disabled={!canEdit}
              />
              <span className="text-xs text-neutral-600 dark:text-neutral-300">Projeto ativo</span>
            </label>
          </div>

          <div className="mt-2 flex items-center justify-between border-t border-neutral-200 pt-2 dark:border-neutral-800">
            {isOwner && (
              <button
                type="button"
                onClick={handleDeleteProject}
                className={btnDangerCls}
              >
                <FaTrash className="size-2.5" /> Eliminar
              </button>
            )}
            {canEdit && (
              <button
                type="button"
                onClick={handleSaveGeneral}
                disabled={saving || !formData.title.trim()}
                className={`${btnPrimaryCls} ml-auto`}
              >
                {saving && <FaSpinner className="size-2.5 animate-spin" />}
                Salvar alterações
              </button>
            )}
          </div>
        </div>

        {/* Seção: Tags */}
        <div className={cardCls}>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-600 dark:text-neutral-400">
              Tags ({projectTags.length})
            </h2>
          </div>

          {canEdit && (
            <div className="flex items-end gap-1.5 pb-2 border-b border-neutral-100 dark:border-neutral-800">
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
                  className="h-7 w-8 rounded-md border border-neutral-200 bg-white p-0 dark:border-neutral-700 dark:bg-neutral-950"
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
                className="flex items-center gap-1.5 rounded-md border border-neutral-100 bg-neutral-50 px-2 py-1.5 dark:border-neutral-800 dark:bg-neutral-900/50"
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
                    <button onClick={() => handleUpdateTag(tag.id)} className="text-green-600"><FaCheck className="size-2.5" /></button>
                    <button onClick={() => setEditingTagId(null)} className="text-neutral-400"><FaTimes className="size-2.5" /></button>
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
                          onClick={() => { setEditingTagId(tag.id); setEditingTagName(tag.name); setEditingTagColor(tag.color_hex || "#6366f1"); }}
                          className="text-neutral-400 hover:text-neutral-600"
                        ><FaPen className="size-2" /></button>
                        <button
                          type="button"
                          onClick={() => handleDeleteTag(tag.id)}
                          className="text-neutral-400 hover:text-red-500"
                        ><FaTrash className="size-2" /></button>
                      </>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Seção: Prioridades */}
        <div className={cardCls}>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-600 dark:text-neutral-400">
              Prioridades ({taskPriorities.length})
            </h2>
          </div>

          {canEdit && (
            <div className="flex items-end gap-1.5 pb-2 border-b border-neutral-100 dark:border-neutral-800">
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
                  className="h-7 w-8 rounded-md border border-neutral-200 bg-white p-0 dark:border-neutral-700 dark:bg-neutral-950"
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
                className="flex items-center gap-1.5 rounded-md border border-neutral-100 bg-neutral-50 px-2 py-1.5 dark:border-neutral-800 dark:bg-neutral-900/50"
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
                    <button onClick={() => handleUpdatePriority(priority.id)} className="text-green-600"><FaCheck className="size-2.5" /></button>
                    <button onClick={() => setEditingPriorityId(null)} className="text-neutral-400"><FaTimes className="size-2.5" /></button>
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
                          onClick={() => { setEditingPriorityId(priority.id); setEditingPriorityName(priority.name); setEditingPriorityColor(priority.color_hex || "#ef4444"); setEditingPriorityLevel(priority.sort_order ?? 0); }}
                          className="text-neutral-400 hover:text-neutral-600"
                        ><FaPen className="size-2" /></button>
                        <button
                          onClick={() => handleDeletePriority(priority.id)}
                          className="text-neutral-400 hover:text-red-500"
                        ><FaTrash className="size-2" /></button>
                      </>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Seção: Etapas */}
        <div className={cardCls}>
          <div className="mb-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-600 dark:text-neutral-400">
              Etapas do Board ({stages.length})
            </h2>
          </div>

          <div className="grid gap-1.5 sm:grid-cols-3">
            {stages
              .sort((a, b) => a.position - b.position)
              .map((stage) => (
                <div
                  key={stage.id}
                  className="flex items-center justify-between rounded-md border border-neutral-100 bg-neutral-50 px-2 py-1.5 dark:border-neutral-800 dark:bg-neutral-900/50"
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
                  <span className="text-[9px] text-neutral-400">Pos {stage.position}</span>
                </div>
              ))}
          </div>
        </div>

        {/* Seção: Colaboradores */}
        <div className={cardCls}>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-600 dark:text-neutral-400">
            Colaboradores ({collaborators.length})
          </h2>

          {canEdit && (
            <div className="mb-2 border-b border-neutral-100 pb-2 dark:border-neutral-800">
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
                <div className="mt-1 max-h-32 space-y-1 overflow-y-auto rounded-md border border-neutral-200 p-1 dark:border-neutral-800">
                  {searchResults.map((u) => (
                    <div
                      key={u.id}
                      className="flex items-center justify-between rounded bg-neutral-50 p-1.5 dark:bg-neutral-950/50"
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
                          className="rounded border border-neutral-200 px-1.5 py-0.5 text-[9px] hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
                        >
                          Leitor
                        </button>
                        <button
                          onClick={() => handleAddCollaborator(u.id, "admin")}
                          disabled={addingCollab === u.id}
                          className="rounded border border-neutral-200 px-1.5 py-0.5 text-[9px] hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
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
                className="flex items-center justify-between rounded-md border border-neutral-100 bg-neutral-50 px-2 py-1.5 dark:border-neutral-800 dark:bg-neutral-900/50"
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
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {canEdit ? (
                    <select
                      value={collab.permission}
                      onChange={(e) =>
                        handleUpdateCollabPermission(
                          collab.user_id,
                          e.target.value as "admin" | "viewer"
                        )
                      }
                      className="rounded border border-neutral-200 bg-white px-1 py-0.5 text-[10px] focus:outline-none dark:border-neutral-700 dark:bg-neutral-950"
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
      </div>
    </div>
  );
}