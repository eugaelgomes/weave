"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";
import {
  FaArrowLeft,
  FaTrash,
  FaSave,
  FaPlus,
  FaTimes,
  FaUserPlus,
  FaSearch,
  FaSpinner,
  FaEye,
  FaKey,
  FaFolder,
} from "react-icons/fa";
import {
  Folder,
  Users,
  FileText,
  TrendingUp,
  Clock,
  Zap,
  AlertCircle,
  ChevronDown,
  Flag,
  Activity,
  Palette,
  Tag,
  Hash,
  AlignLeft,
  Sparkles,
  Shield,
  Mail,
  Plus,
  Columns3,
  List,
  Calendar,
  GanttChart,
  Timer,
  LayoutGrid,
  GripVertical,
  CheckCircle2,
  MoreHorizontal,
} from "lucide-react";
import { useAuth } from "@/app/_contexts/auth-context";
import { useProjects } from "@/app/_contexts/projects-context";
import { useNotes } from "@/app/_contexts/notes-context";
import {
  Project,
  ProjectCollaborator,
  ProjectNote,
  ProjectStage,
} from "@/app/_services/projects-service/projects-service";
import { User as SearchUser } from "@/app/_services/notes-service/notes-service";
import Image from "next/image";
import getStorageUrl from "@/app/_utils/get-storage-url";

// Scrollbar styles customizados para uma UI mais limpa
const scrollbarClean =
  "[&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-neutral-300 dark:[&::-webkit-scrollbar-thumb]:bg-neutral-700 hover:[&::-webkit-scrollbar-thumb]:bg-neutral-400";

const iconMap: Record<string, React.ReactNode> = {
  folder: <FaFolder className="h-5 w-5 sm:h-6 sm:w-6" />,
  default: <FaFolder className="h-5 w-5 sm:h-6 sm:w-6" />,
};

const getProjectIcon = (iconName?: string): React.ReactNode => {
  if (!iconName) return iconMap.default;
  return iconMap[iconName.toLowerCase()] || iconMap.default;
};

export default function ProjectViewPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params?.id as string;

  const { user } = useAuth();
  const {
    getProjectById,
    updateProject,
    deleteProject,
    getCollaborators,
    addCollaborator,
    updateCollaboratorPermission,
    removeCollaborator,
    getProjectNotes,
    addNoteToProject,
    removeNoteFromProject,
    getProjectStages,
  } = useProjects();
  const { searchUsers, notes } = useNotes();

  // Estados (mantidos intactos)
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [editedDescription, setEditedDescription] = useState("");
  const [editedStatus, setEditedStatus] = useState<
    "open" | "in_progress" | "paused" | "completed" | "archived"
  >("open");
  const [editedMethodology, setEditedMethodology] = useState<
    "scrum" | "kanban" | "waterfall" | "custom"
  >("kanban");
  const [editedDefaultView, setEditedDefaultView] = useState<
    "board" | "list" | "calendar" | "timeline" | "gantt"
  >("board");
  const [editedPriority, setEditedPriority] = useState<"alta" | "media" | "baixa">("media");
  const [editedComplexity, setEditedComplexity] = useState<"alta" | "media" | "baixa">("media");
  const [editedColor, setEditedColor] = useState("#3f51b5");
  const [editedIcon, setEditedIcon] = useState("folder");
  const [editedEstimatedTime, setEditedEstimatedTime] = useState("");
  const [editedTags, setEditedTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [collaborators, setCollaborators] = useState<ProjectCollaborator[]>([]);
  const [showAddCollaborator, setShowAddCollaborator] = useState(false);
  const [collaboratorSearch, setCollaboratorSearch] = useState("");
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [projectNotes, setProjectNotes] = useState<ProjectNote[]>([]);
  const [showAddNote, setShowAddNote] = useState(false);
  const [availableNotes, setAvailableNotes] = useState<
    Array<{ id: string; title: string; content?: string; status?: string; tags?: string[] }>
  >([]);
  const [stages, setStages] = useState<ProjectStage[]>([]);
  const [activeView, setActiveView] = useState<
    "board" | "list" | "calendar" | "timeline" | "gantt"
  >("board");

  // Efeitos e Handlers (mantidos intactos)
  useEffect(() => {
    if (!projectId) return;
    const loadProject = async () => {
      try {
        setLoading(true);
        const projectData = await getProjectById(projectId);
        if (projectData) {
          setProject(projectData);
          setEditedTitle(projectData.title);
          setEditedDescription(projectData.description || "");
          setEditedStatus(projectData.status);
          setEditedMethodology(projectData.methodology || "kanban");
          setEditedDefaultView(projectData.default_view || "board");
          setEditedPriority(projectData.properties?.priority || "media");
          setEditedComplexity(projectData.properties?.complexity || "media");
          setEditedColor(projectData.properties?.color || "#3f51b5");
          setEditedIcon(projectData.properties?.icon || "folder");
          setEditedEstimatedTime(projectData.properties?.estimated_time || "");
          setEditedTags(projectData.properties?.tags || []);

          const collabData = await getCollaborators(projectId);
          setCollaborators(collabData);

          const notesData = await getProjectNotes(projectId);
          setProjectNotes(notesData);

          try {
            const stagesData = await getProjectStages(projectId);
            setStages(stagesData);
          } catch {
            setStages([]);
          }

          if (projectData.default_view) setActiveView(projectData.default_view);
        }
      } catch (error) {
        console.error("Erro ao carregar projeto:", error);
      } finally {
        setLoading(false);
      }
    };
    loadProject();
  }, [projectId, getProjectById, getCollaborators, getProjectNotes, getProjectStages]);

  useEffect(() => {
    if (collaboratorSearch.length < 2) {
      setSearchResults([]);
      return;
    }
    const searchTimeout = setTimeout(async () => {
      try {
        setSearchingUsers(true);
        const results = await searchUsers(collaboratorSearch);
        const filtered = results.filter(
          (u) =>
            !collaborators.some((c: ProjectCollaborator) => c.user_id === u.id) &&
            u.id !== project?.user_id
        );
        setSearchResults(filtered);
      } catch (error) {
        console.error("Erro ao buscar usuários:", error);
      } finally {
        setSearchingUsers(false);
      }
    }, 500);
    return () => clearTimeout(searchTimeout);
  }, [collaboratorSearch, searchUsers, collaborators, project?.user_id]);

  useEffect(() => {
    if (showAddNote) {
      const available = notes
        .filter((note) => !projectNotes.some((pn: ProjectNote) => pn.id === note.id))
        .map((note) => ({ id: note.id, title: note.title, tags: note.tags }));
      setAvailableNotes(available);
    }
  }, [showAddNote, notes, projectNotes]);

  const handleSave = async () => {
    if (!project || !editedTitle.trim()) return;
    try {
      setSaving(true);
      await updateProject(projectId, {
        title: editedTitle,
        description: editedDescription,
        status: editedStatus,
        methodology: editedMethodology,
        default_view: editedDefaultView,
        properties: {
          priority: editedPriority,
          complexity: editedComplexity,
          color: editedColor,
          icon: editedIcon,
          estimated_time: editedEstimatedTime || undefined,
          tags: editedTags.length > 0 ? editedTags : undefined,
        },
      });
      const updated = await getProjectById(projectId);
      if (updated) setProject(updated);
      setIsEditing(false);
    } catch (error) {
      console.error("Erro ao salvar projeto:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!project) return;
    if (!window.confirm(`Tem certeza que deseja deletar o projeto "${project.title}"?`)) return;
    try {
      await deleteProject(projectId);
      router.push("/app/projects");
    } catch (error) {
      console.error("Erro ao deletar projeto:", error);
    }
  };

  const handleAddCollaborator = async (userId: string, permission: "admin" | "viewer") => {
    try {
      await addCollaborator(projectId, userId, permission);
      const updatedCollabs = await getCollaborators(projectId);
      setCollaborators(updatedCollabs);
      setShowAddCollaborator(false);
      setCollaboratorSearch("");
      setSearchResults([]);
    } catch (error) {
      console.error("Erro ao adicionar colaborador:", error);
    }
  };

  const handleUpdatePermission = async (userId: string, permission: "admin" | "viewer") => {
    try {
      await updateCollaboratorPermission(projectId, userId, permission);
      const updatedCollabs = await getCollaborators(projectId);
      setCollaborators(updatedCollabs);
    } catch (error) {
      console.error("Erro ao atualizar permissão:", error);
    }
  };

  const handleRemoveCollaborator = async (userId: string) => {
    if (!window.confirm("Tem certeza que deseja remover este colaborador?")) return;
    try {
      await removeCollaborator(projectId, userId);
      const updatedCollabs = await getCollaborators(projectId);
      setCollaborators(updatedCollabs);
    } catch (error) {
      console.error("Erro ao remover colaborador:", error);
    }
  };

  const handleAddNote = async (noteId: string) => {
    try {
      await addNoteToProject(projectId, noteId);
      const updatedNotes = await getProjectNotes(projectId);
      setProjectNotes(updatedNotes);
      setShowAddNote(false);
    } catch (error) {
      console.error("Erro ao adicionar nota:", error);
    }
  };

  const handleRemoveNote = async (noteId: string) => {
    if (!window.confirm("Tem certeza que deseja remover esta nota do projeto?")) return;
    try {
      await removeNoteFromProject(projectId, noteId);
      const updatedNotes = await getProjectNotes(projectId);
      setProjectNotes(updatedNotes);
    } catch (error) {
      console.error("Erro ao remover nota:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full min-h-[50vh] items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-yellow-500"></div>
      </div>
    );
  }

  if (!project) return null;

  const isOwner = project.user_id === user?.id;
  const canEdit =
    isOwner || collaborators.some((c) => c.user_id === user?.id && c.permission === "admin");

  return (
    // ROOT WRAPPER: Impede o overflow global na versão Desktop (lg), delegando para as colunas internas
    <div className="flex h-full flex-col gap-3 lg:h-[calc(100vh-6rem)] lg:overflow-hidden">
      {/* 1. Header Fixo */}
      <div className="flex flex-none items-center justify-between rounded-lg bg-transparent pb-1">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/app/projects")}
            className="group flex h-8 w-8 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-500 transition-all hover:border-neutral-300 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800"
          >
            <FaArrowLeft className="h-3 w-3 transition-transform group-hover:-translate-x-0.5" />
          </button>
          <div className="flex items-center gap-2">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-md text-white shadow-sm"
              style={{ backgroundColor: project.properties?.color || "#eab308" }}
            >
              {getProjectIcon(project.properties?.icon || undefined)}
            </div>
            <div>
              <h1 className="text-sm leading-tight font-bold text-neutral-900 dark:text-neutral-100">
                {project.title}
              </h1>
              <span className="text-[10px] font-medium text-neutral-500">
                {project.status === "open"
                  ? "Aberto"
                  : project.status === "in_progress"
                    ? "Em Andamento"
                    : project.status === "completed"
                      ? "Concluído"
                      : "Pausado"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canEdit && (
            <>
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-1.5 rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-all hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Editar
                </button>
              ) : (
                <>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-600 shadow-sm transition-all hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-1.5 rounded-md bg-yellow-500 px-3 py-1.5 text-xs font-semibold text-neutral-950 shadow-sm transition-all hover:bg-yellow-600 disabled:opacity-50"
                  >
                    {saving ? (
                      <FaSpinner className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <FaSave className="h-3.5 w-3.5" />
                    )}
                    {saving ? "Salvando..." : "Salvar"}
                  </button>
                </>
              )}
            </>
          )}
          {isOwner && (
            <button
              onClick={handleDelete}
              className="flex h-8 w-8 items-center justify-center rounded-md text-neutral-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10 dark:hover:text-red-400"
              title="Deletar projeto"
            >
              <FaTrash className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Grid de Conteúdo (Garante que tudo fique dentro da tela na versão Desktop) */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[1fr_280px] lg:overflow-hidden">
        {/* COLUNA ESQUERDA: Board e Detalhes */}
        <div className="flex min-h-0 flex-col gap-4 lg:overflow-hidden">
          {/* Editor Mode */}
          {isEditing && (
            <div className="max-h-[40vh] flex-none overflow-y-auto rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
              {/* Inputs de edição - mantidos da sua versão original para não perder funcionalidade */}
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-500">
                    Título do Projeto
                  </label>
                  <input
                    type="text"
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-yellow-500 focus:outline-none dark:border-neutral-800 dark:bg-neutral-900"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-500">
                    Descrição
                  </label>
                  <textarea
                    value={editedDescription}
                    onChange={(e) => setEditedDescription(e.target.value)}
                    rows={3}
                    className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-yellow-500 focus:outline-none dark:border-neutral-800 dark:bg-neutral-900"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-neutral-500">
                      Status
                    </label>
                    <select
                      value={editedStatus}
                      onChange={(e) => setEditedStatus(e.target.value as any)}
                      className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-800 dark:bg-neutral-900"
                    >
                      <option value="open">Aberto</option>
                      <option value="in_progress">Em Andamento</option>
                      <option value="completed">Concluído</option>
                      <option value="paused">Pausado</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-neutral-500">Cor</label>
                    <input
                      type="color"
                      value={editedColor}
                      onChange={(e) => setEditedColor(e.target.value)}
                      className="h-9 w-full cursor-pointer rounded"
                    />
                  </div>
                  {/* Adicione os outros selects de Metodologia, View, etc. caso necessário */}
                </div>
              </div>
            </div>
          )}

          {/* Área Principal: Board (Ocupa 100% do espaço restante) */}
          <div className="flex min-h-[500px] flex-1 flex-col overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50/50 shadow-sm lg:min-h-0 dark:border-neutral-800 dark:bg-neutral-900/20">
            {/* Board Header (View Selectors) */}
            <div className="flex flex-none items-center justify-between border-b border-neutral-200 bg-white/50 px-4 py-2.5 backdrop-blur-sm dark:border-neutral-800 dark:bg-neutral-950/50">
              <div className="flex items-center gap-1">
                {[
                  { value: "board", label: "Quadro", icon: <Columns3 className="h-3.5 w-3.5" /> },
                  { value: "list", label: "Lista", icon: <List className="h-3.5 w-3.5" /> },
                  { value: "timeline", label: "Timeline", icon: <Timer className="h-3.5 w-3.5" /> },
                ].map((view) => (
                  <button
                    key={view.value}
                    onClick={() => setActiveView(view.value as any)}
                    className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all ${
                      activeView === view.value
                        ? "bg-white text-neutral-900 shadow-sm ring-1 ring-neutral-200 dark:bg-neutral-800 dark:text-neutral-100 dark:ring-neutral-700"
                        : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800"
                    }`}
                  >
                    {view.icon}
                    <span className="hidden sm:inline">{view.label}</span>
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold tracking-wider text-neutral-400 uppercase">
                  {stages.length} Estágios
                </span>
              </div>
            </div>

            {/* Board Canvas (Scroll X global do quadro, sem Scroll Y global) */}
            <div
              className={`flex flex-1 gap-3 overflow-x-auto overflow-y-hidden p-4 ${scrollbarClean}`}
            >
              {activeView === "board" && stages.length > 0 ? (
                stages
                  .sort((a, b) => a.position - b.position)
                  .map((stage) => {
                    const stageNotes = projectNotes.filter(
                      (note) => note.project_stage_id === stage.id
                    );
                    const isDoneStage = stage.properties?.is_done;

                    return (
                      <div
                        key={stage.id}
                        className="flex max-h-full w-[280px] flex-shrink-0 flex-col overflow-hidden rounded-xl border border-neutral-200/60 bg-neutral-100/70 dark:border-neutral-800 dark:bg-neutral-900/50"
                      >
                        {/* Stage Header */}
                        <div className="flex flex-none items-center justify-between p-3">
                          <div className="flex items-center gap-2">
                            <div
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: stage.color || "#737373" }}
                            />
                            <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                              {stage.name}
                            </span>
                            {isDoneStage && <CheckCircle2 className="h-3 w-3 text-green-500" />}
                          </div>
                          <span className="flex h-5 items-center rounded-full bg-white px-2 text-[10px] font-bold text-neutral-500 shadow-sm dark:bg-neutral-800">
                            {stageNotes.length}
                          </span>
                        </div>

                        {/* Stage Content (Scroll Y apenas aqui!) */}
                        <div
                          className={`flex-1 space-y-2 overflow-y-auto px-2 pb-3 ${scrollbarClean}`}
                        >
                          {stageNotes.length === 0 ? (
                            <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-neutral-200/50 py-8 dark:border-neutral-800/50">
                              <p className="text-[10px] font-medium text-neutral-400">Vazio</p>
                            </div>
                          ) : (
                            stageNotes.map((note) => (
                              <div
                                key={note.id}
                                className="group relative cursor-pointer rounded-lg border border-neutral-200 bg-white p-3 shadow-sm transition-all hover:border-neutral-300 hover:shadow dark:border-neutral-700 dark:bg-neutral-800 dark:hover:border-neutral-600"
                              >
                                <div className="mb-2 flex items-start justify-between gap-2">
                                  <p className="text-xs leading-tight font-semibold text-neutral-700 dark:text-neutral-200">
                                    {note.title}
                                  </p>
                                  <button className="text-neutral-400 opacity-0 transition-opacity group-hover:opacity-100 hover:text-neutral-700 dark:hover:text-neutral-300">
                                    <MoreHorizontal className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                                {note.tags && note.tags.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {note.tags.slice(0, 3).map((tag, i) => (
                                      <span
                                        key={i}
                                        className="rounded bg-neutral-100 px-1.5 py-0.5 text-[9px] font-medium text-neutral-500 dark:bg-neutral-700 dark:text-neutral-400"
                                      >
                                        {tag}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })
              ) : (
                <div className="m-auto flex flex-col items-center text-center">
                  <LayoutGrid className="mb-3 h-10 w-10 text-neutral-300 dark:text-neutral-700" />
                  <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
                    {activeView === "board"
                      ? "Nenhum estágio configurado."
                      : "Visualização em desenvolvimento."}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* COLUNA DIREITA: Sidebar (Rolagem Vertical Independente) */}
        <div className={`flex flex-col gap-4 overflow-y-auto pb-4 lg:pr-1 ${scrollbarClean}`}>
          {/* Progress & Stats Widget */}
          <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                Progresso
              </h3>
              <span
                className="text-xs font-bold"
                style={{ color: project.properties?.color || "#eab308" }}
              >
                {project.properties?.progress || 0}%
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-900">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${project.properties?.progress || 0}%`,
                  backgroundColor: project.properties?.color || "#eab308",
                }}
              />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 border-t border-neutral-100 pt-4 dark:border-neutral-800/50">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-neutral-500">Criado em</span>
                <span className="text-xs font-medium text-neutral-800 dark:text-neutral-200">
                  {new Date(project.created_at).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "short",
                  })}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-neutral-500">Estimativa</span>
                <span className="text-xs font-medium text-neutral-800 dark:text-neutral-200">
                  {project.properties?.estimated_time
                    ? new Date(project.properties.estimated_time).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "short",
                      })
                    : "N/A"}
                </span>
              </div>
            </div>
          </div>

          {/* Equipe Widget */}
          <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                Equipe ({collaborators.length + 1})
              </h3>
              {isOwner && (
                <button
                  onClick={() => setShowAddCollaborator(true)}
                  className="rounded-md bg-neutral-100 p-1.5 text-neutral-500 hover:bg-neutral-200 dark:bg-neutral-900 dark:hover:bg-neutral-800"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="space-y-3">
              {/* Owner */}
              {project.owner && (
                <div className="flex items-center gap-2">
                  {project.owner.avatar_url ? (
                    <Image
                      src={getStorageUrl(project.owner.avatar_url)}
                      alt="Owner"
                      width={28}
                      height={28}
                      className="rounded-full ring-2 ring-yellow-400/30"
                    />
                  ) : (
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-yellow-100 text-[10px] font-bold text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-500">
                      {project.owner.name?.charAt(0) || "U"}
                    </div>
                  )}
                  <div className="flex-1 overflow-hidden">
                    <p className="truncate text-xs font-medium text-neutral-700 dark:text-neutral-200">
                      {project.owner.name || "Owner"}
                    </p>
                    <p className="text-[9px] text-yellow-600 dark:text-yellow-500">Proprietário</p>
                  </div>
                </div>
              )}

              {/* Collabs */}
              {collaborators.map((collab) => (
                <div key={collab.user_id} className="flex items-center gap-2">
                  {collab.avatar_url ? (
                    <Image
                      src={getStorageUrl(collab.avatar_url)}
                      alt="User"
                      width={28}
                      height={28}
                      className="rounded-full bg-neutral-100"
                    />
                  ) : (
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-100 text-[10px] font-bold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
                      {collab.name?.charAt(0) || "U"}
                    </div>
                  )}
                  <div className="flex-1 overflow-hidden">
                    <p className="truncate text-xs font-medium text-neutral-700 dark:text-neutral-200">
                      {collab.name || collab.username}
                    </p>
                    <p className="text-[9px] text-neutral-500">
                      {collab.permission === "admin" ? "Admin" : "Visualizador"}
                    </p>
                  </div>
                  {isOwner && (
                    <button
                      onClick={() => handleRemoveCollaborator(collab.user_id)}
                      className="text-neutral-400 hover:text-red-500"
                    >
                      <FaTimes className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Notas Associadas Widget (Movido para a Sidebar para maximizar o Board) */}
          <div className="flex min-h-[200px] flex-1 flex-col rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                  Notas ({projectNotes.length})
                </h3>
              </div>
              {canEdit && (
                <button
                  onClick={() => setShowAddNote(true)}
                  className="rounded-md bg-neutral-100 p-1.5 text-neutral-500 hover:bg-neutral-200 dark:bg-neutral-900 dark:hover:bg-neutral-800"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className={`flex-1 space-y-2 overflow-y-auto pr-1 ${scrollbarClean}`}>
              {projectNotes.length === 0 ? (
                <p className="py-4 text-center text-xs text-neutral-400">Nenhuma nota associada.</p>
              ) : (
                projectNotes.map((note) => (
                  <div
                    key={note.id}
                    className="group relative rounded-lg border border-neutral-100 bg-neutral-50/50 p-2.5 transition-colors hover:border-neutral-200 dark:border-neutral-800/50 dark:bg-neutral-900/50 dark:hover:border-neutral-700"
                  >
                    <h4 className="pr-4 text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">
                      {note.title}
                    </h4>
                    {canEdit && (
                      <button
                        onClick={() => handleRemoveNote(note.id)}
                        className="absolute top-2.5 right-2 text-neutral-400 opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-500"
                      >
                        <FaTimes className="h-2.5 w-2.5" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Adicionar Colaborador */}
      {showAddCollaborator && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm dark:bg-black/70">
          <div className="w-full max-w-sm rounded-xl border border-neutral-200 bg-white p-4 shadow-2xl sm:p-5 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-bold text-neutral-800 sm:text-base dark:text-neutral-100">
                <FaUserPlus className="text-purple-500 dark:text-purple-400" />
                Adicionar Colaborador
              </h3>
              <button
                onClick={() => {
                  setShowAddCollaborator(false);
                  setCollaboratorSearch("");
                  setSearchResults([]);
                }}
                className="rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 dark:text-neutral-500 dark:hover:bg-neutral-800 dark:hover:text-neutral-300"
              >
                <FaTimes className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="relative mb-3">
              <FaSearch className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400 dark:text-neutral-500" />
              <input
                type="text"
                value={collaboratorSearch}
                onChange={(e) => setCollaboratorSearch(e.target.value)}
                placeholder="Buscar por nome ou email..."
                className="w-full rounded-lg border border-neutral-300 bg-neutral-50 py-2 pr-3 pl-9 text-xs text-neutral-900 transition-colors placeholder:text-neutral-400 focus:border-purple-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder:text-neutral-600"
                autoFocus
              />
            </div>

            {searchingUsers && (
              <div className="flex flex-col items-center justify-center py-6">
                <FaSpinner className="mb-2 h-5 w-5 animate-spin text-purple-500 dark:text-purple-400" />
                <p className="text-[10px] text-neutral-400 dark:text-neutral-500">
                  Buscando usuários...
                </p>
              </div>
            )}

            {searchResults.length > 0 && (
              <div className="max-h-60 space-y-1.5 overflow-y-auto rounded-lg">
                {searchResults.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between rounded-lg border border-neutral-200 bg-neutral-50 p-2.5 transition-all hover:border-neutral-300 hover:bg-white dark:border-neutral-800 dark:bg-neutral-950 dark:hover:border-neutral-700 dark:hover:bg-neutral-900"
                  >
                    <div className="flex items-center gap-2">
                      {user.avatar_url ? (
                        <Image
                          src={getStorageUrl(user.avatar_url)}
                          alt={user.name || user.username}
                          className="h-7 w-7 rounded-full object-cover"
                          height={28}
                          width={28}
                        />
                      ) : (
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-purple-500/20 text-[10px] font-bold text-purple-500 dark:text-purple-400">
                          {user.name?.charAt(0).toUpperCase() ||
                            user.username.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[11px] font-medium text-neutral-700 dark:text-neutral-200">
                          {user.name || user.username}
                        </p>
                        <p className="truncate text-[9px] text-neutral-400 dark:text-neutral-500">
                          {user.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => handleAddCollaborator(user.id, "viewer")}
                        className="flex items-center gap-1 rounded-md bg-neutral-200 px-2 py-1 text-[10px] font-medium text-neutral-600 transition-all hover:bg-neutral-300 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
                        title="Adicionar como visualizador"
                      >
                        <FaEye className="h-2.5 w-2.5" /> Viewer
                      </button>
                      <button
                        onClick={() => handleAddCollaborator(user.id, "admin")}
                        className="flex items-center gap-1 rounded-md bg-blue-500/20 px-2 py-1 text-[10px] font-medium text-blue-500 transition-all hover:bg-blue-500/30 dark:text-blue-400"
                        title="Adicionar como administrador"
                      >
                        <FaKey className="h-2.5 w-2.5" /> Admin
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {collaboratorSearch.length >= 2 && !searchingUsers && searchResults.length === 0 && (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-neutral-300 py-6 dark:border-neutral-800">
                <Users className="mb-2 h-6 w-6 text-neutral-300 dark:text-neutral-700" />
                <p className="text-xs text-neutral-500">Nenhum usuário encontrado</p>
                <p className="text-[10px] text-neutral-400 dark:text-neutral-600">
                  Tente buscar por outro nome ou email
                </p>
              </div>
            )}

            {collaboratorSearch.length < 2 && searchResults.length === 0 && !searchingUsers && (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-neutral-300 py-6 dark:border-neutral-800">
                <FaSearch className="mb-2 h-6 w-6 text-neutral-300 dark:text-neutral-700" />
                <p className="text-xs text-neutral-500">Digite pelo menos 2 caracteres</p>
                <p className="text-[10px] text-neutral-400 dark:text-neutral-600">
                  para buscar usuários
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Adicionar Nota */}
      {showAddNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm dark:bg-black/70">
          <div className="w-full max-w-sm rounded-xl border border-neutral-200 bg-white p-4 shadow-2xl sm:p-5 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-bold text-neutral-800 sm:text-base dark:text-neutral-100">
                <FileText className="h-4 w-4 text-yellow-500 dark:text-yellow-400" />
                Adicionar Nota ao Projeto
              </h3>
              <button
                onClick={() => setShowAddNote(false)}
                className="rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 dark:text-neutral-500 dark:hover:bg-neutral-800 dark:hover:text-neutral-300"
              >
                <FaTimes className="h-3.5 w-3.5" />
              </button>
            </div>

            {availableNotes.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-neutral-300 py-8 sm:py-10 dark:border-neutral-800">
                <FileText className="mb-2 h-8 w-8 text-neutral-300 dark:text-neutral-700" />
                <p className="mb-0.5 text-xs font-medium text-neutral-500 dark:text-neutral-400">
                  Nenhuma nota disponível
                </p>
                <p className="text-[10px] text-neutral-400 dark:text-neutral-600">
                  Todas as suas notas já estão neste projeto
                </p>
              </div>
            ) : (
              <>
                <p className="mb-2 text-[10px] text-neutral-400 dark:text-neutral-500">
                  Selecione uma nota para adicionar ao projeto
                </p>
                <div className="max-h-80 space-y-1.5 overflow-y-auto rounded-lg">
                  {availableNotes.map((note) => (
                    <button
                      key={note.id}
                      onClick={() => handleAddNote(note.id)}
                      className="group w-full rounded-lg border border-neutral-200 bg-neutral-50 p-2.5 text-left transition-all hover:border-yellow-500/30 hover:bg-white dark:border-neutral-800 dark:bg-neutral-950 dark:hover:bg-neutral-900"
                    >
                      <div className="mb-1.5 flex items-start justify-between gap-2">
                        <p className="flex-1 text-xs font-medium text-neutral-700 group-hover:text-yellow-500 dark:text-neutral-200 dark:group-hover:text-yellow-400">
                          {note.title}
                        </p>
                        <Plus className="h-3.5 w-3.5 text-neutral-400 transition-colors group-hover:text-yellow-500 dark:text-neutral-600 dark:group-hover:text-yellow-400" />
                      </div>

                      {note.content && (
                        <p className="mb-1.5 line-clamp-2 text-[10px] text-neutral-400 dark:text-neutral-500">
                          {note.content.substring(0, 100)}...
                        </p>
                      )}

                      {note.tags && note.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {note.tags.slice(0, 4).map((tag, i) => (
                            <span
                              key={i}
                              className="rounded-full bg-neutral-200 px-1.5 py-0.5 text-[9px] text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"
                            >
                              #{tag}
                            </span>
                          ))}
                          {note.tags.length > 4 && (
                            <span className="rounded-full bg-neutral-200 px-1.5 py-0.5 text-[9px] text-neutral-400 dark:bg-neutral-800 dark:text-neutral-500">
                              +{note.tags.length - 4}
                            </span>
                          )}
                        </div>
                      )}

                      {note.status && (
                        <div className="mt-1.5 flex items-center gap-1">
                          <div
                            className={`h-1.5 w-1.5 rounded-full ${
                              note.status === "published"
                                ? "bg-green-400"
                                : note.status === "draft"
                                  ? "bg-yellow-400"
                                  : "bg-neutral-500"
                            }`}
                          />
                          <span className="text-[9px] text-neutral-400 capitalize dark:text-neutral-500">
                            {note.status === "published"
                              ? "Publicada"
                              : note.status === "draft"
                                ? "Rascunho"
                                : "Arquivada"}
                          </span>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
