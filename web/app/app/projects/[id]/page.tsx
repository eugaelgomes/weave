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

// Mapeamento de nomes de ícones para componentes
const iconMap: Record<string, React.ReactNode> = {
  folder: <FaFolder className="h-6 w-6 sm:h-8 sm:w-8" />,
  default: <FaFolder className="h-6 w-6 sm:h-8 sm:w-8" />,
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

  // Estado do projeto
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Estado de edição
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

  // Estado de colaboradores
  const [collaborators, setCollaborators] = useState<ProjectCollaborator[]>([]);
  const [showAddCollaborator, setShowAddCollaborator] = useState(false);
  const [collaboratorSearch, setCollaboratorSearch] = useState("");
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);

  // Estado de notas
  const [projectNotes, setProjectNotes] = useState<ProjectNote[]>([]);
  const [showAddNote, setShowAddNote] = useState(false);
  const [availableNotes, setAvailableNotes] = useState<
    Array<{ id: string; title: string; content?: string; status?: string; tags?: string[] }>
  >([]);

  // Estado de stages e view type
  const [stages, setStages] = useState<ProjectStage[]>([]);
  const [activeView, setActiveView] = useState<"board" | "list" | "calendar" | "timeline" | "gantt">("board");

  // Carregar projeto
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

          // Carregar colaboradores
          const collabData = await getCollaborators(projectId);
          setCollaborators(collabData);

          // Carregar notas
          const notesData = await getProjectNotes(projectId);
          setProjectNotes(notesData);

          // Carregar stages
          try {
            const stagesData = await getProjectStages(projectId);
            setStages(stagesData);
          } catch {
            setStages([]);
          }

          // Definir view ativa baseada no default_view do projeto
          if (projectData.default_view) {
            setActiveView(projectData.default_view);
          }
        }
      } catch (error) {
        console.error("Erro ao carregar projeto:", error);
      } finally {
        setLoading(false);
      }
    };

    loadProject();
  }, [projectId, getProjectById, getCollaborators, getProjectNotes, getProjectStages]);

  // Buscar usuários para colaboradores
  useEffect(() => {
    if (collaboratorSearch.length < 2) {
      setSearchResults([]);
      return;
    }

    const searchTimeout = setTimeout(async () => {
      try {
        setSearchingUsers(true);
        const results = await searchUsers(collaboratorSearch);
        // Filtrar usuários já colaboradores
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

  // Preparar notas disponíveis
  useEffect(() => {
    if (showAddNote) {
      const available = notes
        .filter((note) => !projectNotes.some((pn: ProjectNote) => pn.id === note.id))
        .map((note) => ({
          id: note.id,
          title: note.title,
          tags: note.tags,
        }));
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

      // Recarregar projeto
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

    const confirmed = window.confirm(
      `Tem certeza que deseja deletar o projeto "${project.title}"?`
    );
    if (!confirmed) return;

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
    const confirmed = window.confirm("Tem certeza que deseja remover este colaborador?");
    if (!confirmed) return;

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
    const confirmed = window.confirm("Tem certeza que deseja remover esta nota do projeto?");
    if (!confirmed) return;

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
      <div className="flex h-48 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-yellow-500"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
          <p className="text-lg text-neutral-800 dark:text-neutral-200">Projeto não encontrado</p>
          <button
            onClick={() => router.push("/app/projects")}
            className="mt-4 rounded-md bg-neutral-200 px-4 py-2 text-sm text-neutral-800 transition-colors hover:bg-neutral-300 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
          >
            Voltar para Projetos
          </button>
        </div>
      </div>
    );
  }

  const isOwner = project.user_id === user?.id;
  const canEdit =
    isOwner ||
    collaborators.some(
      (c: ProjectCollaborator) => c.user_id === user?.id && c.permission === "admin"
    );

  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto sm:space-y-4">
        {/* Header */}
        <div className="flex flex-col gap-3 rounded-md border border-neutral-200 bg-neutral-50 p-3 sm:flex-row sm:items-center sm:justify-between sm:px-4 sm:py-2 dark:border-neutral-800 dark:bg-neutral-950">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/app/projects")}
              className="flex items-center gap-2 rounded-md bg-neutral-200 px-3 py-1.5 text-sm font-medium text-neutral-600 transition-all hover:bg-neutral-300 hover:text-neutral-800 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700 dark:hover:text-neutral-200"
            >
              <FaArrowLeft className="h-3 w-3" />
              <span>Voltar</span>
            </button>
            <div className="hidden h-4 w-px bg-neutral-300 sm:block dark:bg-neutral-700"></div>
            <span className="hidden text-sm font-medium text-neutral-600 sm:block dark:text-neutral-400">
              Detalhes do Projeto
            </span>
          </div>

          <div className="flex items-center gap-2">
            {canEdit && (
              <>
                {!isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-2 rounded-md bg-yellow-500 px-3 py-1.5 text-sm font-semibold text-neutral-950 transition-all hover:bg-yellow-600"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Editar
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="rounded-md border border-neutral-300 bg-neutral-100 px-3 py-1.5 text-sm font-medium text-neutral-600 transition-all hover:bg-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex items-center gap-2 rounded-md bg-yellow-500 px-3 py-1.5 text-sm font-semibold text-neutral-950 transition-all hover:bg-yellow-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {saving ? (
                        <>
                          <FaSpinner className="h-4 w-4 animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        <>
                          <FaSave className="h-4 w-4" />
                          Salvar Alterações
                        </>
                      )}
                    </button>
                  </>
                )}
              </>
            )}

            {isOwner && (
              <button
                onClick={handleDelete}
                className="rounded-md bg-red-500/10 p-2 text-red-500 transition-all hover:bg-red-500/20 dark:text-red-400"
                title="Deletar projeto"
              >
                <FaTrash className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-[1fr_320px]">
          {/* Coluna Principal */}
          <div className="space-y-3 sm:space-y-4">
            {/* Informações do Projeto */}
            <div
              className="rounded-md border border-neutral-200 bg-neutral-50 p-4 transition-all sm:p-6 dark:border-neutral-800 dark:bg-neutral-950"
              style={{
                borderColor: project.properties?.color
                  ? `${project.properties.color}40`
                  : undefined,
              }}
            >
              {!isEditing ? (
                <>
                  {/* Cabeçalho do Projeto */}
                  <div className="mb-4 flex items-start gap-3 sm:mb-6 sm:gap-4">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-600 sm:h-16 sm:w-16 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
                      {getProjectIcon(project.properties?.icon ?? undefined)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h1 className="mb-2 text-xl font-bold text-neutral-900 sm:mb-3 sm:text-2xl lg:text-3xl dark:text-neutral-100">
                        {project.title}
                      </h1>
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                        {/* Status Badge */}
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold uppercase ${
                            project.status === "open"
                              ? "bg-cyan-500/20 text-cyan-400"
                              : project.status === "in_progress"
                                ? "bg-blue-500/20 text-blue-400"
                                : project.status === "completed"
                                  ? "bg-green-500/20 text-green-400"
                                  : project.status === "paused"
                                    ? "bg-yellow-500/20 text-yellow-400"
                                    : "bg-neutral-700/20 text-neutral-400"
                          }`}
                        >
                          {project.status === "open"
                            ? "Aberto"
                            : project.status === "in_progress"
                              ? "Em Andamento"
                              : project.status === "completed"
                                ? "Concluído"
                                : project.status === "paused"
                                  ? "Pausado"
                                  : "Arquivado"}
                        </span>

                        {/* Prioridade */}
                        {project.properties?.priority && (
                          <div
                            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 ${
                              project.properties.priority === "alta"
                                ? "bg-red-500/20 text-red-400"
                                : project.properties.priority === "media"
                                  ? "bg-yellow-500/20 text-yellow-400"
                                  : "bg-blue-500/20 text-blue-400"
                            }`}
                          >
                            <AlertCircle className="h-3.5 w-3.5" />
                            <span className="text-xs font-semibold capitalize">
                              {project.properties.priority}
                            </span>
                          </div>
                        )}

                        {/* Complexidade */}
                        {project.properties?.complexity && (
                          <div
                            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 ${
                              project.properties.complexity === "alta"
                                ? "bg-red-500/20 text-red-400"
                                : project.properties.complexity === "media"
                                  ? "bg-yellow-500/20 text-yellow-400"
                                  : "bg-green-500/20 text-green-400"
                            }`}
                          >
                            <Zap className="h-3.5 w-3.5" />
                            <span className="text-xs font-semibold capitalize">
                              {project.properties.complexity}
                            </span>
                          </div>
                        )}

                        {/* Tempo Estimado */}
                        {project.properties?.estimated_time && (
                          <div className="flex items-center gap-1.5 rounded-md bg-neutral-200 px-2 py-1 sm:px-3 sm:py-1.5 dark:bg-neutral-800">
                            <Clock className="h-3 w-3 text-neutral-500 sm:h-3.5 sm:w-3.5 dark:text-neutral-400" />
                            <span className="text-[10px] font-medium text-neutral-600 sm:text-xs dark:text-neutral-300">
                              {new Date(project.properties.estimated_time).toLocaleDateString(
                                "pt-BR",
                                {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                }
                              )}
                            </span>
                          </div>
                        )}

                        {/* Metodologia */}
                        <div className="flex items-center gap-1.5 rounded-md bg-purple-500/20 px-3 py-1.5">
                          <Activity className="h-3.5 w-3.5 text-purple-400" />
                          <span className="text-xs font-semibold text-purple-400">
                            {project.methodology === "scrum"
                              ? "Scrum"
                              : project.methodology === "kanban"
                                ? "Kanban"
                                : project.methodology === "waterfall"
                                  ? "Waterfall"
                                  : "Personalizado"}
                          </span>
                        </div>

                        {/* Visualização Padrão */}
                        <div className="flex items-center gap-1.5 rounded-md bg-indigo-500/20 px-3 py-1.5">
                          <Folder className="h-3.5 w-3.5 text-indigo-400" />
                          <span className="text-xs font-semibold text-indigo-400">
                            {project.default_view === "board"
                              ? "Quadro"
                              : project.default_view === "list"
                                ? "Lista"
                                : project.default_view === "calendar"
                                  ? "Calendário"
                                  : project.default_view === "timeline"
                                    ? "Timeline"
                                    : "Gantt"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Tags */}
                  {project.properties?.tags && project.properties.tags.length > 0 && (
                    <div className="mb-4 sm:mb-6">
                      <h3 className="mb-2 font-mono text-[10px] font-bold tracking-widest text-neutral-500 uppercase dark:text-neutral-600">
                        Tags
                      </h3>
                      <div className="flex flex-wrap gap-1.5 sm:gap-2">
                        {project.properties.tags.map((tag, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center gap-1 rounded-md bg-neutral-200 px-2 py-1 text-[11px] font-medium text-neutral-600 sm:px-3 sm:py-1.5 sm:text-xs dark:bg-neutral-800 dark:text-neutral-300"
                            style={{
                              backgroundColor: project.properties?.color
                                ? `${project.properties.color}20`
                                : undefined,
                              color: project.properties?.color || undefined,
                            }}
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Descrição */}
                  {project.description && (
                    <div className="mb-4 sm:mb-6">
                      <h3 className="mb-2 font-mono text-[10px] font-bold tracking-widest text-neutral-500 uppercase dark:text-neutral-600">
                        Descrição
                      </h3>
                      <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
                        {project.description}
                      </p>
                    </div>
                  )}

                  {/* Progresso */}
                  <div className="mb-4 rounded-lg border border-neutral-200 bg-white p-3 sm:mb-6 sm:p-4 dark:border-neutral-800 dark:bg-neutral-900">
                    <div className="mb-2 flex items-center justify-between sm:mb-3">
                      <h3 className="font-mono text-[10px] font-bold tracking-widest text-neutral-500 uppercase dark:text-neutral-600">
                        Progresso do Projeto
                      </h3>
                      <span
                        className="font-mono text-base font-bold sm:text-lg"
                        style={{ color: project.properties?.color || "#eab308" }}
                      >
                        {project.properties?.progress || 0}%
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-200 sm:h-3 dark:bg-neutral-800">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${project.properties?.progress || 0}%`,
                          background: project.properties?.color
                            ? `linear-gradient(to right, ${project.properties.color}, ${project.properties.color}dd)`
                            : "linear-gradient(to right, #eab308, #facc15)",
                        }}
                      ></div>
                    </div>
                  </div>

                  {/* Metadata */}
                  <div className="grid grid-cols-1 gap-2 rounded-lg border border-neutral-200 bg-white p-3 text-xs sm:grid-cols-2 sm:gap-3 sm:p-4 dark:border-neutral-800 dark:bg-neutral-900">
                    <div className="group flex items-center gap-2 rounded-md p-2 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800">
                      <Clock className="h-4 w-4 text-neutral-400 dark:text-neutral-500" />
                      <div>
                        <span className="font-semibold text-neutral-500 dark:text-neutral-500">
                          Criado em:
                        </span>
                        <p className="text-neutral-700 dark:text-neutral-300">
                          {new Date(project.created_at).toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "long",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="group flex items-center gap-2 rounded-md p-2 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800">
                      <TrendingUp className="h-4 w-4 text-neutral-400 dark:text-neutral-500" />
                      <div>
                        <span className="font-semibold text-neutral-500 dark:text-neutral-500">
                          Atualizado em:
                        </span>
                        <p className="text-neutral-700 dark:text-neutral-300">
                          {new Date(project.updated_at).toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "long",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  {/* Título */}
                  <div>
                    <label className="mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-wider text-neutral-500 uppercase dark:text-neutral-400">
                      <FileText className="h-3.5 w-3.5" />
                      Título do Projeto
                    </label>
                    <input
                      type="text"
                      value={editedTitle}
                      onChange={(e) => setEditedTitle(e.target.value)}
                      className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 transition-colors focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 focus:outline-none sm:px-4 sm:py-2.5 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                      placeholder="Nome do projeto"
                    />
                  </div>

                  {/* Descrição */}
                  <div>
                    <label className="mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-wider text-neutral-500 uppercase dark:text-neutral-400">
                      <AlignLeft className="h-3.5 w-3.5" />
                      Descrição
                    </label>
                    <textarea
                      value={editedDescription}
                      onChange={(e) => setEditedDescription(e.target.value)}
                      rows={4}
                      className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 transition-colors focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 focus:outline-none sm:px-4 sm:py-2.5 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                      placeholder="Descreva os objetivos e detalhes do projeto..."
                    />
                  </div>

                  {/* Grid de selects */}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                    {/* Status */}
                    <div>
                      <label className="mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-wider text-neutral-500 uppercase dark:text-neutral-400">
                        <Activity className="h-3.5 w-3.5" />
                        Status
                      </label>
                      <select
                        value={editedStatus}
                        onChange={(e) =>
                          setEditedStatus(
                            e.target.value as
                              | "open"
                              | "in_progress"
                              | "paused"
                              | "completed"
                              | "archived"
                          )
                        }
                        className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-900 transition-colors focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 focus:outline-none sm:px-4 sm:py-2.5 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                      >
                        <option value="open">● Aberto</option>
                        <option value="in_progress">● Em Andamento</option>
                        <option value="paused">● Pausado</option>
                        <option value="completed">✓ Concluído</option>
                        <option value="archived">○ Arquivado</option>
                      </select>
                    </div>

                    {/* Prioridade */}
                    <div>
                      <label className="mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-wider text-neutral-500 uppercase dark:text-neutral-400">
                        <Flag className="h-3.5 w-3.5" />
                        Prioridade
                      </label>
                      <select
                        value={editedPriority}
                        onChange={(e) =>
                          setEditedPriority(e.target.value as "alta" | "media" | "baixa")
                        }
                        className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-900 transition-colors focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 focus:outline-none sm:px-4 sm:py-2.5 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                      >
                        <option value="baixa">↓ Baixa</option>
                        <option value="media">→ Média</option>
                        <option value="alta">↑ Alta</option>
                      </select>
                    </div>

                    {/* Complexidade */}
                    <div>
                      <label className="mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-wider text-neutral-500 uppercase dark:text-neutral-400">
                        <Zap className="h-3.5 w-3.5" />
                        Complexidade
                      </label>
                      <select
                        value={editedComplexity}
                        onChange={(e) =>
                          setEditedComplexity(e.target.value as "alta" | "media" | "baixa")
                        }
                        className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-900 transition-colors focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 focus:outline-none sm:px-4 sm:py-2.5 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                      >
                        <option value="baixa">↓ Baixa</option>
                        <option value="media">→ Média</option>
                        <option value="alta">↑ Alta</option>
                      </select>
                    </div>

                    {/* Ícone */}
                    <div>
                      <label className="mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-wider text-neutral-500 uppercase dark:text-neutral-400">
                        <Sparkles className="h-3.5 w-3.5" />
                        Ícone
                      </label>
                      <select
                        value={editedIcon}
                        onChange={(e) => setEditedIcon(e.target.value)}
                        className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-900 transition-colors focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 focus:outline-none sm:px-4 sm:py-2.5 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                      >
                        <option value="folder">Pasta</option>
                      </select>
                    </div>

                    {/* Metodologia */}
                    <div>
                      <label className="mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-wider text-neutral-500 uppercase dark:text-neutral-400">
                        <Activity className="h-3.5 w-3.5" />
                        Metodologia
                      </label>
                      <select
                        value={editedMethodology}
                        onChange={(e) =>
                          setEditedMethodology(
                            e.target.value as "scrum" | "kanban" | "waterfall" | "custom"
                          )
                        }
                        className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-900 transition-colors focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 focus:outline-none sm:px-4 sm:py-2.5 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                      >
                        <option value="kanban">▣ Kanban</option>
                        <option value="scrum">► Scrum</option>
                        <option value="waterfall">≋ Waterfall</option>
                        <option value="custom">⚙ Personalizado</option>
                      </select>
                    </div>

                    {/* Visualização Padrão */}
                    <div>
                      <label className="mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-wider text-neutral-500 uppercase dark:text-neutral-400">
                        <Folder className="h-3.5 w-3.5" />
                        Visualização Padrão
                      </label>
                      <select
                        value={editedDefaultView}
                        onChange={(e) =>
                          setEditedDefaultView(
                            e.target.value as "board" | "list" | "calendar" | "timeline" | "gantt"
                          )
                        }
                        className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-900 transition-colors focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 focus:outline-none sm:px-4 sm:py-2.5 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                      >
                        <option value="board">▦ Quadro</option>
                        <option value="list">☰ Lista</option>
                        <option value="calendar">▦ Calendário</option>
                        <option value="timeline">⏱ Timeline</option>
                        <option value="gantt">▬ Gantt</option>
                      </select>
                    </div>
                  </div>

                  {/* Cor */}
                  <div>
                    <label className="mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-wider text-neutral-500 uppercase dark:text-neutral-400">
                      <Palette className="h-3.5 w-3.5" />
                      Cor do Projeto
                    </label>
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="relative">
                        <input
                          type="color"
                          value={editedColor}
                          onChange={(e) => setEditedColor(e.target.value)}
                          className="h-10 w-14 cursor-pointer rounded-lg border-2 border-neutral-300 bg-white transition-colors hover:border-yellow-500 sm:h-12 sm:w-16 dark:border-neutral-700 dark:bg-neutral-800"
                          title="Selecione uma cor"
                        />
                      </div>
                      <input
                        type="text"
                        value={editedColor}
                        onChange={(e) => setEditedColor(e.target.value)}
                        className="flex-1 rounded-lg border border-neutral-300 bg-white px-3 py-2 font-mono text-sm text-neutral-900 transition-colors focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 focus:outline-none sm:px-4 sm:py-2.5 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                        placeholder="#000000"
                        pattern="^#[0-9A-Fa-f]{6}$"
                      />
                    </div>
                  </div>

                  {/* Data estimada */}
                  <div>
                    <label className="mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-wider text-neutral-500 uppercase dark:text-neutral-400">
                      <Clock className="h-3.5 w-3.5" />
                      Data Estimada de Conclusão
                    </label>
                    <input
                      type="datetime-local"
                      value={editedEstimatedTime}
                      onChange={(e) => setEditedEstimatedTime(e.target.value)}
                      className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 transition-colors focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 focus:outline-none sm:px-4 sm:py-2.5 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                    />
                  </div>

                  {/* Tags */}
                  <div>
                    <label className="mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-wider text-neutral-500 uppercase dark:text-neutral-400">
                      <Tag className="h-3.5 w-3.5" />
                      Tags do Projeto
                    </label>
                    <div className="space-y-2 sm:space-y-3">
                      {/* Tags existentes */}
                      {editedTags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 sm:gap-2">
                          {editedTags.map((tag, index) => (
                            <span
                              key={index}
                              className="group flex items-center gap-1 rounded-full bg-yellow-500/20 px-2 py-1 text-[11px] font-medium text-yellow-600 transition-all hover:bg-yellow-500/30 sm:gap-1.5 sm:px-3 sm:py-1.5 sm:text-xs dark:text-yellow-400"
                            >
                              #{tag}
                              <button
                                type="button"
                                onClick={() =>
                                  setEditedTags(editedTags.filter((_, i) => i !== index))
                                }
                                className="rounded-full bg-yellow-500/20 p-0.5 text-yellow-600 opacity-70 transition-all hover:bg-red-500/30 hover:text-red-500 hover:opacity-100 dark:text-yellow-400 dark:hover:text-red-400"
                                title="Remover tag"
                              >
                                <FaTimes className="h-2 w-2 sm:h-2.5 sm:w-2.5" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                      {/* Adicionar nova tag */}
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Hash className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-neutral-400 dark:text-neutral-500" />
                          <input
                            type="text"
                            value={newTag}
                            onChange={(e) => setNewTag(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && newTag.trim()) {
                                e.preventDefault();
                                if (!editedTags.includes(newTag.trim())) {
                                  setEditedTags([...editedTags, newTag.trim()]);
                                }
                                setNewTag("");
                              }
                            }}
                            placeholder="Digite uma tag e pressione Enter"
                            className="w-full rounded-lg border border-neutral-300 bg-white py-2 pr-3 pl-10 text-sm text-neutral-900 transition-colors focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 focus:outline-none sm:py-2.5 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (newTag.trim() && !editedTags.includes(newTag.trim())) {
                              setEditedTags([...editedTags, newTag.trim()]);
                              setNewTag("");
                            }
                          }}
                          className="rounded-lg bg-yellow-500 px-3 py-2 text-sm font-semibold text-neutral-950 transition-all hover:bg-yellow-600 disabled:cursor-not-allowed disabled:opacity-50 sm:px-4 sm:py-2.5"
                          disabled={!newTag.trim() || editedTags.includes(newTag.trim())}
                          title="Adicionar tag"
                        >
                          Adicionar
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Visualização do Projeto - Seletor de View + Stages */}
            <div className="rounded-md border border-neutral-200 bg-neutral-50 p-4 sm:p-6 dark:border-neutral-800 dark:bg-neutral-950">
              {/* Header com seletor de view */}
              <div className="mb-3 flex flex-col gap-3 border-b border-neutral-200 pb-3 sm:mb-4 sm:flex-row sm:items-center sm:justify-between dark:border-neutral-800">
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-md border border-yellow-400/20 bg-yellow-400/10 text-yellow-500 dark:text-yellow-400">
                    <LayoutGrid className="h-3.5 w-3.5" />
                  </div>
                  <h2 className="font-mono text-[10px] font-bold tracking-widest text-neutral-500 uppercase dark:text-neutral-500">
                    Visualização
                  </h2>
                </div>

                {/* View Type Buttons */}
                <div className="flex items-center gap-1 rounded-lg border border-neutral-200 bg-white p-1 dark:border-neutral-700 dark:bg-neutral-900">
                  {[
                    { value: "board" as const, label: "Quadro", icon: <Columns3 className="h-3.5 w-3.5" /> },
                    { value: "list" as const, label: "Lista", icon: <List className="h-3.5 w-3.5" /> },
                    { value: "calendar" as const, label: "Calendário", icon: <Calendar className="h-3.5 w-3.5" /> },
                    { value: "timeline" as const, label: "Timeline", icon: <Timer className="h-3.5 w-3.5" /> },
                    { value: "gantt" as const, label: "Gantt", icon: <GanttChart className="h-3.5 w-3.5" /> },
                  ].map((view) => (
                    <button
                      key={view.value}
                      onClick={() => setActiveView(view.value)}
                      title={view.label}
                      className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all ${
                        activeView === view.value
                          ? "bg-yellow-500/15 text-yellow-600 shadow-sm dark:bg-yellow-500/20 dark:text-yellow-400"
                          : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
                      }`}
                    >
                      {view.icon}
                      <span className="hidden sm:inline">{view.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Conteúdo da View */}
              {activeView === "board" && stages.length > 0 ? (
                <div className="-mx-1 flex gap-3 overflow-x-auto pb-2">
                  {stages
                    .sort((a, b) => a.position - b.position)
                    .map((stage) => {
                      const stageNotes = projectNotes.filter(
                        (note) => note.project_stage_id === stage.id
                      );
                      const isDoneStage = stage.properties?.is_done;
                      return (
                        <div
                          key={stage.id}
                          className="flex w-[260px] flex-shrink-0 flex-col rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900"
                        >
                          {/* Stage Header */}
                          <div className="flex items-center justify-between border-b border-neutral-200 px-3 py-2.5 dark:border-neutral-800">
                            <div className="flex items-center gap-2">
                              <div
                                className="h-2.5 w-2.5 rounded-full"
                                style={{ backgroundColor: stage.color || "#737373" }}
                              />
                              <span className="text-xs font-bold text-neutral-700 dark:text-neutral-200">
                                {stage.name}
                              </span>
                              {isDoneStage && (
                                <CheckCircle2 className="h-3 w-3 text-green-500" />
                              )}
                            </div>
                            <span className="rounded-full bg-neutral-100 px-2 py-0.5 font-mono text-[10px] font-bold text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                              {stageNotes.length}
                            </span>
                          </div>

                          {/* Stage Content */}
                          <div className="flex-1 space-y-2 p-2">
                            {stageNotes.length === 0 ? (
                              <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-neutral-200 py-6 dark:border-neutral-800">
                                <FileText className="mb-1.5 h-5 w-5 text-neutral-300 dark:text-neutral-700" />
                                <p className="text-[10px] text-neutral-400 dark:text-neutral-600">
                                  Sem notas neste estágio
                                </p>
                              </div>
                            ) : (
                              stageNotes.map((note) => (
                                <div
                                  key={note.id}
                                  className="group rounded-md border border-neutral-200 bg-neutral-50 p-2.5 transition-all hover:border-neutral-300 hover:shadow-sm dark:border-neutral-800 dark:bg-neutral-950 dark:hover:border-neutral-700"
                                >
                                  <div className="mb-1.5 flex items-start justify-between gap-2">
                                    <p className="flex-1 text-xs font-medium text-neutral-700 dark:text-neutral-200">
                                      {note.title}
                                    </p>
                                    <GripVertical className="h-3 w-3 flex-shrink-0 text-neutral-300 dark:text-neutral-700" />
                                  </div>
                                  {note.tags && note.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                      {note.tags.slice(0, 3).map((tag, i) => (
                                        <span
                                          key={i}
                                          className="rounded bg-neutral-200/70 px-1.5 py-0.5 text-[9px] font-medium text-neutral-500 dark:bg-neutral-800/70 dark:text-neutral-400"
                                        >
                                          #{tag}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))
                            )}
                          </div>

                          {/* WIP Limit indicator */}
                          {stage.properties?.wip_limit && (
                            <div className="border-t border-neutral-200 px-3 py-1.5 dark:border-neutral-800">
                              <p className={`text-[10px] font-medium ${
                                stageNotes.length >= stage.properties.wip_limit
                                  ? "text-red-500"
                                  : "text-neutral-400 dark:text-neutral-600"
                              }`}>
                                WIP: {stageNotes.length}/{stage.properties.wip_limit}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              ) : activeView === "board" && stages.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-neutral-300 py-10 dark:border-neutral-800">
                  <Columns3 className="mb-3 h-10 w-10 text-neutral-300 dark:text-neutral-700" />
                  <p className="mb-1 text-sm font-medium text-neutral-500 dark:text-neutral-400">
                    Nenhum estágio configurado
                  </p>
                  <p className="text-xs text-neutral-400 dark:text-neutral-600">
                    Configure estágios para visualizar o quadro Kanban
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-neutral-300 py-10 dark:border-neutral-800">
                  <LayoutGrid className="mb-3 h-10 w-10 text-neutral-300 dark:text-neutral-700" />
                  <p className="mb-1 text-sm font-medium text-neutral-500 dark:text-neutral-400">
                    Visualização &quot;{activeView === "list" ? "Lista" : activeView === "calendar" ? "Calendário" : activeView === "timeline" ? "Timeline" : "Gantt"}&quot; em breve
                  </p>
                  <p className="text-xs text-neutral-400 dark:text-neutral-600">
                    Por enquanto, utilize a visualização Quadro
                  </p>
                </div>
              )}
            </div>

            {/* Notas do Projeto */}
            <div className="rounded-md border border-neutral-200 bg-neutral-50 p-4 sm:p-6 dark:border-neutral-800 dark:bg-neutral-950">
              {/* Header da seção */}
              <div className="mb-3 flex items-center justify-between border-b border-neutral-200 pb-3 sm:mb-4 dark:border-neutral-800">
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-md border border-blue-400/20 bg-blue-400/10 text-blue-500 dark:text-blue-400">
                    <FileText className="h-3.5 w-3.5" />
                  </div>
                  <h2 className="font-mono text-[10px] font-bold tracking-widest text-neutral-500 uppercase dark:text-neutral-500">
                    Notas Associadas
                  </h2>
                  <span className="rounded-full bg-blue-500/20 px-2 py-0.5 font-mono text-xs font-bold text-blue-500 dark:text-blue-400">
                    {String(projectNotes.length).padStart(2, "0")}
                  </span>
                </div>
                {canEdit && (
                  <button
                    onClick={() => setShowAddNote(true)}
                    className="flex items-center gap-1.5 rounded-md bg-blue-500/20 px-2 py-1.5 text-[11px] font-medium text-blue-500 transition-all hover:bg-blue-500/30 sm:px-3 sm:py-2 sm:text-xs dark:text-blue-400"
                  >
                    <FaPlus className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                    Adicionar
                  </button>
                )}
              </div>

              {projectNotes.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-neutral-300 bg-white py-8 sm:py-12 dark:border-neutral-800 dark:bg-neutral-900">
                  <FileText className="mb-3 h-10 w-10 text-neutral-300 sm:h-12 sm:w-12 dark:text-neutral-700" />
                  <p className="mb-1 text-sm font-medium text-neutral-500 dark:text-neutral-400">
                    Nenhuma nota associada
                  </p>
                  <p className="text-xs text-neutral-400 dark:text-neutral-600">
                    Adicione notas para organizar o projeto
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2 sm:gap-3">
                  {projectNotes.map((note) => (
                    <div
                      key={note.id}
                      className="group relative overflow-hidden rounded-lg border border-neutral-200 bg-white transition-all hover:border-neutral-300 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700 dark:hover:shadow-neutral-900/50"
                    >
                      <div className="p-3 sm:p-4">
                        <div className="mb-2 flex items-start justify-between gap-2 sm:gap-3">
                          <h3 className="flex-1 text-sm font-semibold text-neutral-700 group-hover:text-neutral-900 dark:text-neutral-200 dark:group-hover:text-white">
                            {note.title}
                          </h3>
                          <div className="flex items-center gap-2">
                            {note.status && (
                              <span
                                className={`rounded-md px-2 py-1 text-[10px] font-bold uppercase ${
                                  note.status === "done"
                                    ? "bg-green-500/20 text-green-400"
                                    : note.status === "open"
                                      ? "bg-cyan-500/20 text-cyan-400"
                                      : note.status === "in-progress"
                                        ? "bg-blue-500/20 text-blue-400"
                                        : "bg-neutral-800 text-neutral-400"
                                }`}
                              >
                                {note.status === "done"
                                  ? "Concluída"
                                  : note.status === "open"
                                    ? "Aberta"
                                    : note.status === "in-progress"
                                      ? "Em progresso"
                                      : note.status}
                              </span>
                            )}
                            {canEdit && (
                              <button
                                onClick={() => handleRemoveNote(note.id)}
                                className="rounded-md bg-red-500/10 p-1.5 text-red-500 opacity-0 transition-all group-hover:opacity-100 hover:bg-red-500/20 dark:text-red-400"
                                title="Remover nota"
                              >
                                <FaTimes className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </div>
                        {note.tags && note.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 sm:gap-1.5">
                            {note.tags.slice(0, 5).map((tag, i) => (
                              <span
                                key={i}
                                className="inline-flex items-center rounded-md bg-neutral-200/70 px-1.5 py-0.5 text-[10px] font-medium text-neutral-500 dark:bg-neutral-800/70 dark:text-neutral-400"
                              >
                                #{tag}
                              </span>
                            ))}
                            {note.tags.length > 5 && (
                              <span className="inline-flex items-center rounded-md bg-neutral-200/70 px-1.5 py-0.5 text-[10px] font-medium text-neutral-400 dark:bg-neutral-800/70 dark:text-neutral-500">
                                +{note.tags.length - 5}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Coluna Lateral */}
          <div className="space-y-3 sm:space-y-4">
            {/* Colaboradores */}
            <div className="rounded-md border border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-950">
              {/* Header da seção */}
              <div className="flex items-center justify-between border-b border-neutral-200 bg-white px-4 py-2.5 dark:border-neutral-800 dark:bg-neutral-900/50">
                <div className="flex items-center gap-2">
                  <div className="flex h-5 w-5 items-center justify-center rounded-md border border-purple-400/20 bg-purple-400/10 text-purple-500 dark:text-purple-400">
                    <Users className="h-3 w-3" />
                  </div>
                  <h3 className="font-mono text-[10px] font-bold tracking-widest text-neutral-500 uppercase dark:text-neutral-500">
                    Equipe
                  </h3>
                </div>
                {isOwner && (
                  <button
                    onClick={() => setShowAddCollaborator(true)}
                    className="rounded-md bg-purple-500/20 p-1.5 text-purple-500 transition-all hover:bg-purple-500/30 dark:text-purple-400"
                    title="Adicionar colaborador"
                  >
                    <FaUserPlus className="h-3 w-3" />
                  </button>
                )}
              </div>

              <div className="p-3 sm:p-4">
                {/* Owner */}
                {project.owner && (
                  <div className="mb-3 overflow-hidden rounded-lg border border-yellow-500/30 bg-gradient-to-br from-yellow-500/10 to-white p-3 dark:to-neutral-950">
                    <div className="mb-2 flex items-center gap-2 sm:gap-3">
                      {project.owner.avatar_url ? (
                        <Image
                          src={getStorageUrl(project.owner.avatar_url)}
                          alt={project.owner.name || project.owner.username}
                          className="h-8 w-8 rounded-full border-2 border-yellow-500/50 object-cover sm:h-10 sm:w-10"
                          height={40}
                          width={40}
                        />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-yellow-500/50 bg-yellow-500 text-xs font-bold text-neutral-950 sm:h-10 sm:w-10 sm:text-sm">
                          {project.owner.name?.charAt(0).toUpperCase() ||
                            project.owner.username.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-neutral-800 sm:text-sm dark:text-neutral-100">
                          {project.owner.name || project.owner.username}
                        </p>
                        <p className="truncate text-[10px] text-neutral-500">
                          {project.owner.email}
                        </p>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-md bg-yellow-500/20 px-2 py-1 text-[10px] font-bold text-yellow-600 dark:text-yellow-400">
                      <Folder className="h-3 w-3" />
                      PROPRIETÁRIO
                    </span>
                  </div>
                )}

                {/* Colaboradores */}
                {collaborators.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-neutral-300 bg-white py-6 sm:py-8 dark:border-neutral-800 dark:bg-neutral-900">
                    <Users className="mb-2 h-6 w-6 text-neutral-300 sm:h-8 sm:w-8 dark:text-neutral-700" />
                    <p className="text-xs text-neutral-400 dark:text-neutral-500">
                      Nenhum colaborador
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {collaborators.map((collab) => (
                      <div
                        key={collab.user_id}
                        className="group rounded-lg border border-neutral-200 bg-white p-2.5 transition-all hover:border-neutral-300 hover:bg-neutral-50 sm:p-3 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700 dark:hover:bg-neutral-800"
                      >
                        <div className="mb-2 flex items-center gap-2 sm:gap-3">
                          {collab.avatar_url ? (
                            <Image
                              src={getStorageUrl(collab.avatar_url)}
                              alt={collab.name || collab.username}
                              className="h-7 w-7 rounded-full object-cover sm:h-8 sm:w-8"
                              height={32}
                              width={32}
                            />
                          ) : (
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-200 text-[10px] font-bold text-neutral-600 sm:h-8 sm:w-8 sm:text-xs dark:bg-neutral-700 dark:text-neutral-200">
                              {collab.name?.charAt(0).toUpperCase() ||
                                collab.username.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-medium text-neutral-700 dark:text-neutral-200">
                              {collab.name || collab.username}
                            </p>
                            <p className="truncate text-[10px] text-neutral-400 dark:text-neutral-500">
                              {collab.email}
                            </p>
                          </div>
                          {isOwner && (
                            <button
                              onClick={() => handleRemoveCollaborator(collab.user_id)}
                              className="rounded-md bg-red-500/10 p-1.5 text-red-500 opacity-0 transition-all group-hover:opacity-100 hover:bg-red-500/20 dark:text-red-400"
                              title="Remover colaborador"
                            >
                              <FaTimes className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                        {isOwner ? (
                          <select
                            value={collab.permission}
                            onChange={(e) =>
                              handleUpdatePermission(
                                collab.user_id,
                                e.target.value as "admin" | "viewer"
                              )
                            }
                            className="w-full rounded-md border border-neutral-200 bg-neutral-50 px-2 py-1.5 text-[10px] font-medium text-neutral-600 transition-colors focus:border-purple-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
                          >
                            <option value="viewer">◉ Visualizador</option>
                            <option value="admin">★ Administrador</option>
                          </select>
                        ) : (
                          <span
                            className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-bold ${
                              collab.permission === "admin"
                                ? "bg-blue-500/20 text-blue-500 dark:text-blue-400"
                                : "bg-neutral-200 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"
                            }`}
                          >
                            {collab.permission === "admin" ? (
                              <>
                                <FaKey className="h-2.5 w-2.5" /> ADMIN
                              </>
                            ) : (
                              <>
                                <FaEye className="h-2.5 w-2.5" /> VIEWER
                              </>
                            )}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Estatísticas */}
            <div className="rounded-md border border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-950">
              {/* Header da seção */}
              <div className="flex items-center gap-2 border-b border-neutral-200 bg-white px-4 py-2.5 dark:border-neutral-800 dark:bg-neutral-900/50">
                <div className="flex h-5 w-5 items-center justify-center rounded-md border border-green-400/20 bg-green-400/10 text-green-500 dark:text-green-400">
                  <TrendingUp className="h-3 w-3" />
                </div>
                <h3 className="font-mono text-[10px] font-bold tracking-widest text-neutral-500 uppercase dark:text-neutral-500">
                  Estatísticas
                </h3>
              </div>

              <div className="flex flex-col">
                <div className="group flex items-center justify-between px-4 py-3 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-900">
                  <div className="flex items-center gap-2">
                    <div className="flex h-5 w-5 items-center justify-center rounded-md border border-blue-400/20 bg-blue-400/10 text-blue-500 dark:text-blue-400">
                      <FileText className="h-3 w-3" />
                    </div>
                    <span className="text-xs font-medium text-neutral-500 transition-colors group-hover:text-neutral-700 dark:text-neutral-400 dark:group-hover:text-neutral-200">
                      Notas
                    </span>
                  </div>
                  <div className="mx-3 hidden h-px flex-1 border-b border-dashed border-neutral-300 opacity-30 sm:block dark:border-neutral-800"></div>
                  <span className="font-mono text-sm font-bold text-blue-500 dark:text-blue-400">
                    {String(projectNotes.length).padStart(2, "0")}
                  </span>
                </div>
                <div className="group flex items-center justify-between px-4 py-3 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-900">
                  <div className="flex items-center gap-2">
                    <div className="flex h-5 w-5 items-center justify-center rounded-md border border-purple-400/20 bg-purple-400/10 text-purple-500 dark:text-purple-400">
                      <Users className="h-3 w-3" />
                    </div>
                    <span className="text-xs font-medium text-neutral-500 transition-colors group-hover:text-neutral-700 dark:text-neutral-400 dark:group-hover:text-neutral-200">
                      Colaboradores
                    </span>
                  </div>
                  <div className="mx-3 hidden h-px flex-1 border-b border-dashed border-neutral-300 opacity-30 sm:block dark:border-neutral-800"></div>
                  <span className="font-mono text-sm font-bold text-purple-500 dark:text-purple-400">
                    {String(collaborators.length).padStart(2, "0")}
                  </span>
                </div>
                <div className="group flex items-center justify-between px-4 py-3 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-900">
                  <div className="flex items-center gap-2">
                    <div className="flex h-5 w-5 items-center justify-center rounded-md border border-green-400/20 bg-green-400/10 text-green-500 dark:text-green-400">
                      <TrendingUp className="h-3 w-3" />
                    </div>
                    <span className="text-xs font-medium text-neutral-500 transition-colors group-hover:text-neutral-700 dark:text-neutral-400 dark:group-hover:text-neutral-200">
                      Progresso
                    </span>
                  </div>
                  <div className="mx-3 hidden h-px flex-1 border-b border-dashed border-neutral-300 opacity-30 sm:block dark:border-neutral-800"></div>
                  <span className="font-mono text-sm font-bold text-green-500 dark:text-green-400">
                    {project.properties?.progress || 0}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal: Adicionar Colaborador */}
        {showAddCollaborator && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm dark:bg-black/70">
            <div className="w-full max-w-md rounded-xl border border-neutral-200 bg-white p-4 shadow-2xl sm:p-6 dark:border-neutral-800 dark:bg-neutral-900">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-base font-bold text-neutral-800 sm:text-lg dark:text-neutral-100">
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
                  <FaTimes className="h-4 w-4" />
                </button>
              </div>

              <div className="relative mb-4">
                <FaSearch className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-neutral-400 dark:text-neutral-500" />
                <input
                  type="text"
                  value={collaboratorSearch}
                  onChange={(e) => setCollaboratorSearch(e.target.value)}
                  placeholder="Buscar por nome ou email..."
                  className="w-full rounded-lg border border-neutral-300 bg-neutral-50 py-2.5 pr-3 pl-10 text-sm text-neutral-900 transition-colors placeholder:text-neutral-400 focus:border-purple-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder:text-neutral-600"
                  autoFocus
                />
              </div>

              {searchingUsers && (
                <div className="flex flex-col items-center justify-center py-8">
                  <FaSpinner className="mb-2 h-6 w-6 animate-spin text-purple-500 dark:text-purple-400" />
                  <p className="text-xs text-neutral-400 dark:text-neutral-500">
                    Buscando usuários...
                  </p>
                </div>
              )}

              {searchResults.length > 0 && (
                <div className="max-h-80 space-y-2 overflow-y-auto rounded-lg">
                  {searchResults.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between rounded-lg border border-neutral-200 bg-neutral-50 p-3 transition-all hover:border-neutral-300 hover:bg-white dark:border-neutral-800 dark:bg-neutral-950 dark:hover:border-neutral-700 dark:hover:bg-neutral-900"
                    >
                      <div className="flex items-center gap-2 sm:gap-3">
                        {user.avatar_url ? (
                          <Image
                            src={getStorageUrl(user.avatar_url)}
                            alt={user.name || user.username}
                            className="h-8 w-8 rounded-full object-cover sm:h-10 sm:w-10"
                            height={40}
                            width={40}
                          />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-500/20 text-xs font-bold text-purple-500 sm:h-10 sm:w-10 sm:text-sm dark:text-purple-400">
                            {user.name?.charAt(0).toUpperCase() ||
                              user.username.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium text-neutral-700 sm:text-sm dark:text-neutral-200">
                            {user.name || user.username}
                          </p>
                          <p className="truncate text-[10px] text-neutral-400 dark:text-neutral-500">
                            {user.email}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1 sm:gap-2">
                        <button
                          onClick={() => handleAddCollaborator(user.id, "viewer")}
                          className="flex items-center gap-1 rounded-md bg-neutral-200 px-2 py-1 text-[10px] font-medium text-neutral-600 transition-all hover:bg-neutral-300 sm:px-3 sm:py-1.5 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
                          title="Adicionar como visualizador"
                        >
                          <FaEye className="h-3 w-3" /> Viewer
                        </button>
                        <button
                          onClick={() => handleAddCollaborator(user.id, "admin")}
                          className="flex items-center gap-1 rounded-md bg-blue-500/20 px-2 py-1 text-[10px] font-medium text-blue-500 transition-all hover:bg-blue-500/30 sm:px-3 sm:py-1.5 dark:text-blue-400"
                          title="Adicionar como administrador"
                        >
                          <FaKey className="h-3 w-3" /> Admin
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {collaboratorSearch.length >= 2 && !searchingUsers && searchResults.length === 0 && (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-neutral-300 py-8 dark:border-neutral-800">
                  <Users className="mb-2 h-8 w-8 text-neutral-300 dark:text-neutral-700" />
                  <p className="text-sm text-neutral-500">Nenhum usuário encontrado</p>
                  <p className="text-xs text-neutral-400 dark:text-neutral-600">
                    Tente buscar por outro nome ou email
                  </p>
                </div>
              )}

              {collaboratorSearch.length < 2 && searchResults.length === 0 && !searchingUsers && (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-neutral-300 py-8 dark:border-neutral-800">
                  <FaSearch className="mb-2 h-8 w-8 text-neutral-300 dark:text-neutral-700" />
                  <p className="text-sm text-neutral-500">Digite pelo menos 2 caracteres</p>
                  <p className="text-xs text-neutral-400 dark:text-neutral-600">
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
            <div className="w-full max-w-md rounded-xl border border-neutral-200 bg-white p-4 shadow-2xl sm:p-6 dark:border-neutral-800 dark:bg-neutral-900">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-base font-bold text-neutral-800 sm:text-lg dark:text-neutral-100">
                  <FileText className="h-4 w-4 text-yellow-500 sm:h-5 sm:w-5 dark:text-yellow-400" />
                  Adicionar Nota ao Projeto
                </h3>
                <button
                  onClick={() => setShowAddNote(false)}
                  className="rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 dark:text-neutral-500 dark:hover:bg-neutral-800 dark:hover:text-neutral-300"
                >
                  <FaTimes className="h-4 w-4" />
                </button>
              </div>

              {availableNotes.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-neutral-300 py-10 sm:py-12 dark:border-neutral-800">
                  <FileText className="mb-3 h-10 w-10 text-neutral-300 sm:h-12 sm:w-12 dark:text-neutral-700" />
                  <p className="mb-1 text-sm font-medium text-neutral-500 dark:text-neutral-400">
                    Nenhuma nota disponível
                  </p>
                  <p className="text-xs text-neutral-400 dark:text-neutral-600">
                    Todas as suas notas já estão neste projeto
                  </p>
                </div>
              ) : (
                <>
                  <p className="mb-3 text-xs text-neutral-400 dark:text-neutral-500">
                    Selecione uma nota para adicionar ao projeto
                  </p>
                  <div className="max-h-96 space-y-2 overflow-y-auto rounded-lg">
                    {availableNotes.map((note) => (
                      <button
                        key={note.id}
                        onClick={() => handleAddNote(note.id)}
                        className="group w-full rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-left transition-all hover:border-yellow-500/30 hover:bg-white dark:border-neutral-800 dark:bg-neutral-950 dark:hover:bg-neutral-900"
                      >
                        <div className="mb-2 flex items-start justify-between gap-2">
                          <p className="flex-1 text-sm font-medium text-neutral-700 group-hover:text-yellow-500 dark:text-neutral-200 dark:group-hover:text-yellow-400">
                            {note.title}
                          </p>
                          <Plus className="h-4 w-4 text-neutral-400 transition-colors group-hover:text-yellow-500 dark:text-neutral-600 dark:group-hover:text-yellow-400" />
                        </div>

                        {note.content && (
                          <p className="mb-2 line-clamp-2 text-xs text-neutral-400 dark:text-neutral-500">
                            {note.content.substring(0, 100)}...
                          </p>
                        )}

                        {note.tags && note.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {note.tags.slice(0, 4).map((tag, i) => (
                              <span
                                key={i}
                                className="rounded-full bg-neutral-200 px-2 py-0.5 text-[10px] text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"
                              >
                                #{tag}
                              </span>
                            ))}
                            {note.tags.length > 4 && (
                              <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-[10px] text-neutral-400 dark:bg-neutral-800 dark:text-neutral-500">
                                +{note.tags.length - 4}
                              </span>
                            )}
                          </div>
                        )}

                        {note.status && (
                          <div className="mt-2 flex items-center gap-1.5">
                            <div
                              className={`h-1.5 w-1.5 rounded-full ${
                                note.status === "published"
                                  ? "bg-green-400"
                                  : note.status === "draft"
                                    ? "bg-yellow-400"
                                    : "bg-neutral-500"
                              }`}
                            />
                            <span className="text-[10px] text-neutral-400 capitalize dark:text-neutral-500">
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
    </div>
  );
}
