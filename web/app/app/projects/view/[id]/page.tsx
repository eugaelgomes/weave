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
} from "lucide-react";
import { useAuth } from "@/app/contexts/AuthContext";
import { useProjects } from "@/app/contexts/ProjectsContext";
import { useNotes } from "@/app/contexts/NotesContext";
import {
  Project,
  ProjectCollaborator,
  ProjectNote,
} from "@/app/services/projects-service/ProjectsService";
import { User as SearchUser } from "@/app/services/notes-service/NotesService";
import Image from "next/image";

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
  const [editedStatus, setEditedStatus] = useState<"ativo" | "arquivado" | "concluído">("ativo");
  const [editedPriority, setEditedPriority] = useState<"alta" | "media" | "baixa">("media");
  const [editedComplexity, setEditedComplexity] = useState<"alta" | "media" | "baixa">("media");
  const [editedColor, setEditedColor] = useState("#3f51b5");
  const [editedIcon, setEditedIcon] = useState("📁");
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
    Array<{ id: string; title: string; tags?: string[] }>
  >([]);

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
          setEditedPriority(projectData.properties?.priority || "media");
          setEditedComplexity(projectData.properties?.complexity || "media");
          setEditedColor(projectData.properties?.color || "#3f51b5");
          setEditedIcon(projectData.properties?.icon || "📁");
          setEditedEstimatedTime(projectData.properties?.estimated_time || "");
          setEditedTags(projectData.properties?.tags || []);

          // Carregar colaboradores
          const collabData = await getCollaborators(projectId);
          setCollaborators(collabData);

          // Carregar notas
          const notesData = await getProjectNotes(projectId);
          setProjectNotes(notesData);
        }
      } catch (error) {
        console.error("Erro ao carregar projeto:", error);
      } finally {
        setLoading(false);
      }
    };

    loadProject();
  }, [projectId, getProjectById, getCollaborators, getProjectNotes]);

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
          (u) => !collaborators.some((c) => c.user_id === u.id) && u.id !== project?.user_id
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
        .filter((note) => !projectNotes.some((pn) => pn.id === note.id))
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
      <div className="flex min-h-screen items-center justify-center bg-neutral-950">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-yellow-500"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-950">
        <div className="text-center">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
          <p className="text-lg text-neutral-200">Projeto não encontrado</p>
          <button
            onClick={() => router.push("/app/projects")}
            className="mt-4 rounded-md bg-neutral-800 px-4 py-2 text-sm text-neutral-200 transition-colors hover:bg-neutral-700"
          >
            Voltar para Projetos
          </button>
        </div>
      </div>
    );
  }

  const isOwner = project.user_id === user?.id;
  const canEdit =
    isOwner || collaborators.some((c) => c.user_id === user?.id && c.permission === "admin");

  return (
    <div className="min-h-screen bg-neutral-950">
      <div className="mx-auto max-w-6xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between rounded-md border border-neutral-800 bg-neutral-900 p-4">
          <button
            onClick={() => router.push("/app/projects")}
            className="flex items-center gap-2 text-sm text-neutral-400 transition-colors hover:text-neutral-200"
          >
            <FaArrowLeft />
            <span>Voltar</span>
          </button>

          <div className="flex items-center gap-2">
            {canEdit && (
              <>
                {!isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="rounded-md bg-yellow-500 px-4 py-2 text-sm font-medium text-neutral-950 transition-colors hover:bg-yellow-600"
                  >
                    Editar Projeto
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="rounded-md bg-neutral-800 px-4 py-2 text-sm text-neutral-200 transition-colors hover:bg-neutral-700"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex items-center gap-2 rounded-md bg-yellow-500 px-4 py-2 text-sm font-medium text-neutral-950 transition-colors hover:bg-yellow-600 disabled:opacity-50"
                    >
                      {saving ? <FaSpinner className="animate-spin" /> : <FaSave />}
                      Salvar
                    </button>
                  </>
                )}
              </>
            )}

            {isOwner && (
              <button
                onClick={handleDelete}
                className="rounded-md bg-red-500/20 p-2 text-red-400 transition-colors hover:bg-red-500/30"
              >
                <FaTrash />
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
          {/* Coluna Principal */}
          <div className="space-y-4">
            {/* Informações do Projeto */}
            <div className="rounded-md border border-neutral-800 bg-neutral-900 p-6">
              {!isEditing ? (
                <>
                  <div className="mb-4 flex items-start gap-3">
                    {project.properties?.icon && (
                      <span className="text-4xl">{project.properties.icon}</span>
                    )}
                    <div className="flex-1">
                      <h1 className="mb-2 text-2xl font-bold text-neutral-100">{project.title}</h1>
                      <div className="flex flex-wrap items-center gap-3">
                        <span
                          className={`rounded-md px-2 py-1 text-xs font-bold uppercase ${
                            project.status === "ativo"
                              ? "bg-blue-500/20 text-blue-400"
                              : project.status === "concluído"
                                ? "bg-green-500/20 text-green-400"
                                : "bg-neutral-800 text-neutral-400"
                          }`}
                        >
                          {project.status}
                        </span>

                        {project.properties?.priority && (
                          <div className="flex items-center gap-1.5 rounded-md border border-neutral-700 bg-neutral-800/50 px-2 py-1">
                            <AlertCircle className="h-3 w-3 text-neutral-400" />
                            <span className="text-xs text-neutral-400">
                              Prioridade: {project.properties.priority}
                            </span>
                          </div>
                        )}

                        {project.properties?.complexity && (
                          <div className="flex items-center gap-1.5 rounded-md border border-neutral-700 bg-neutral-800/50 px-2 py-1">
                            <Zap className="h-3 w-3 text-neutral-400" />
                            <span className="text-xs text-neutral-400">
                              Complexidade: {project.properties.complexity}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Tags */}
                  {project.properties?.tags && project.properties.tags.length > 0 && (
                    <div className="mb-4 flex flex-wrap gap-2">
                      {project.properties.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="rounded-full bg-yellow-500/20 px-3 py-1 text-xs font-medium text-yellow-400"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {project.description && (
                    <p className="mb-4 text-sm leading-relaxed text-neutral-400">
                      {project.description}
                    </p>
                  )}

                  {/* Progresso */}
                  <div className="mb-4">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-medium text-neutral-500">
                        Progresso do Projeto
                      </span>
                      <span className="text-sm font-bold text-neutral-300">
                        {project.properties?.progress || 0}%
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-800">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-yellow-500 to-yellow-400 transition-all"
                        style={{ width: `${project.properties?.progress || 0}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Metadata */}
                  <div className="grid grid-cols-2 gap-4 border-t border-neutral-800 pt-4 text-xs text-neutral-500">
                    <div>
                      <span className="font-medium">Criado em:</span>{" "}
                      {new Date(project.created_at).toLocaleDateString("pt-BR")}
                    </div>
                    <div>
                      <span className="font-medium">Atualizado em:</span>{" "}
                      {new Date(project.updated_at).toLocaleDateString("pt-BR")}
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  {/* Título */}
                  <div>
                    <label className="mb-1 block text-xs font-medium text-neutral-400">
                      Título
                    </label>
                    <input
                      type="text"
                      value={editedTitle}
                      onChange={(e) => setEditedTitle(e.target.value)}
                      className="w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-100 focus:border-yellow-500 focus:outline-none"
                    />
                  </div>

                  {/* Descrição */}
                  <div>
                    <label className="mb-1 block text-xs font-medium text-neutral-400">
                      Descrição
                    </label>
                    <textarea
                      value={editedDescription}
                      onChange={(e) => setEditedDescription(e.target.value)}
                      rows={4}
                      className="w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-100 focus:border-yellow-500 focus:outline-none"
                    />
                  </div>

                  {/* Grid de selects */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Status */}
                    <div>
                      <label className="mb-1 block text-xs font-medium text-neutral-400">
                        Status
                      </label>
                      <select
                        value={editedStatus}
                        onChange={(e) =>
                          setEditedStatus(e.target.value as "ativo" | "arquivado" | "concluído")
                        }
                        className="w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-100 focus:border-yellow-500 focus:outline-none"
                      >
                        <option value="ativo">Ativo</option>
                        <option value="concluído">Concluído</option>
                        <option value="arquivado">Arquivado</option>
                      </select>
                    </div>

                    {/* Prioridade */}
                    <div>
                      <label className="mb-1 block text-xs font-medium text-neutral-400">
                        Prioridade
                      </label>
                      <select
                        value={editedPriority}
                        onChange={(e) =>
                          setEditedPriority(e.target.value as "alta" | "media" | "baixa")
                        }
                        className="w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-100 focus:border-yellow-500 focus:outline-none"
                      >
                        <option value="baixa">Baixa</option>
                        <option value="media">Média</option>
                        <option value="alta">Alta</option>
                      </select>
                    </div>

                    {/* Complexidade */}
                    <div>
                      <label className="mb-1 block text-xs font-medium text-neutral-400">
                        Complexidade
                      </label>
                      <select
                        value={editedComplexity}
                        onChange={(e) =>
                          setEditedComplexity(e.target.value as "alta" | "media" | "baixa")
                        }
                        className="w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-100 focus:border-yellow-500 focus:outline-none"
                      >
                        <option value="baixa">Baixa</option>
                        <option value="media">Média</option>
                        <option value="alta">Alta</option>
                      </select>
                    </div>

                    {/* Ícone */}
                    <div>
                      <label className="mb-1 block text-xs font-medium text-neutral-400">
                        Ícone (Emoji)
                      </label>
                      <input
                        type="text"
                        value={editedIcon}
                        onChange={(e) => setEditedIcon(e.target.value)}
                        className="w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-100 focus:border-yellow-500 focus:outline-none"
                        placeholder="📁"
                      />
                    </div>
                  </div>

                  {/* Cor */}
                  <div>
                    <label className="mb-1 block text-xs font-medium text-neutral-400">
                      Cor do Projeto
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={editedColor}
                        onChange={(e) => setEditedColor(e.target.value)}
                        className="h-10 w-20 cursor-pointer rounded-md border border-neutral-700 bg-neutral-800"
                      />
                      <input
                        type="text"
                        value={editedColor}
                        onChange={(e) => setEditedColor(e.target.value)}
                        className="flex-1 rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-100 focus:border-yellow-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Data estimada */}
                  <div>
                    <label className="mb-1 block text-xs font-medium text-neutral-400">
                      Data Estimada de Conclusão
                    </label>
                    <input
                      type="datetime-local"
                      value={editedEstimatedTime}
                      onChange={(e) => setEditedEstimatedTime(e.target.value)}
                      className="w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-100 focus:border-yellow-500 focus:outline-none"
                    />
                  </div>

                  {/* Tags */}
                  <div>
                    <label className="mb-1 block text-xs font-medium text-neutral-400">
                      Tags
                    </label>
                    <div className="space-y-2">
                      {/* Tags existentes */}
                      {editedTags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {editedTags.map((tag, index) => (
                            <span
                              key={index}
                              className="group flex items-center gap-1 rounded-full bg-yellow-500/20 px-3 py-1 text-xs font-medium text-yellow-400"
                            >
                              {tag}
                              <button
                                type="button"
                                onClick={() => setEditedTags(editedTags.filter((_, i) => i !== index))}
                                className="ml-1 text-yellow-400 opacity-50 transition-opacity hover:opacity-100"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                      {/* Adicionar nova tag */}
                      <div className="flex gap-2">
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
                          className="flex-1 rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-100 focus:border-yellow-500 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (newTag.trim() && !editedTags.includes(newTag.trim())) {
                              setEditedTags([...editedTags, newTag.trim()]);
                              setNewTag("");
                            }
                          }}
                          className="rounded-md bg-yellow-500 px-4 py-2 text-sm font-medium text-neutral-950 transition-colors hover:bg-yellow-600"
                        >
                          Adicionar
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Notas do Projeto */}
            <div className="rounded-md border border-neutral-800 bg-neutral-900 p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-lg font-semibold text-neutral-100">
                  <FileText className="h-5 w-5" />
                  Notas ({projectNotes.length})
                </h2>
                {canEdit && (
                  <button
                    onClick={() => setShowAddNote(true)}
                    className="flex items-center gap-2 rounded-md bg-neutral-800 px-3 py-1.5 text-xs text-neutral-200 transition-colors hover:bg-neutral-700"
                  >
                    <FaPlus />
                    Adicionar Nota
                  </button>
                )}
              </div>

              {projectNotes.length === 0 ? (
                <p className="text-center text-sm text-neutral-500">
                  Nenhuma nota associada a este projeto
                </p>
              ) : (
                <div className="space-y-2">
                  {projectNotes.map((note) => (
                    <div
                      key={note.id}
                      className="group flex items-center justify-between rounded-md border border-neutral-800 bg-neutral-950 p-3 transition-colors hover:border-neutral-700"
                    >
                      <div className="flex-1">
                        <h3 className="mb-1 text-sm font-medium text-neutral-200">{note.title}</h3>
                        {note.tags && note.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {note.tags.slice(0, 3).map((tag, i) => (
                              <span
                                key={i}
                                className="rounded-full bg-neutral-800 px-2 py-0.5 text-[10px] text-neutral-400"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {note.status && (
                          <span
                            className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${
                              note.status === "done"
                                ? "bg-green-500/20 text-green-400"
                                : note.status === "open"
                                  ? "bg-blue-500/20 text-blue-400"
                                  : "bg-neutral-800 text-neutral-400"
                            }`}
                          >
                            {note.status}
                          </span>
                        )}
                        {canEdit && (
                          <button
                            onClick={() => handleRemoveNote(note.id)}
                            className="opacity-0 transition-opacity group-hover:opacity-100"
                          >
                            <FaTimes className="text-red-400 hover:text-red-300" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Coluna Lateral */}
          <div className="space-y-4">
            {/* Colaboradores */}
            <div className="rounded-md border border-neutral-800 bg-neutral-900 p-4">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-neutral-100">
                  <Users className="h-4 w-4" />
                  Colaboradores
                </h2>
                {isOwner && (
                  <button
                    onClick={() => setShowAddCollaborator(true)}
                    className="rounded-md bg-neutral-800 p-1.5 text-neutral-400 transition-colors hover:bg-neutral-700"
                  >
                    <FaUserPlus className="h-3 w-3" />
                  </button>
                )}
              </div>

              {/* Owner */}
              {project.owner && (
                <div className="mb-3 rounded-md border border-neutral-800 bg-neutral-950 p-3">
                  <div className="mb-1 flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-500 text-sm font-bold text-neutral-950">
                      {project.owner.name?.charAt(0) || project.owner.username.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-medium text-neutral-200">
                        {project.owner.name || project.owner.username}
                      </p>
                      <p className="text-[10px] text-neutral-500">{project.owner.email}</p>
                    </div>
                  </div>
                  <span className="inline-block rounded-md bg-yellow-500/20 px-2 py-0.5 text-[10px] font-bold text-yellow-400">
                    PROPRIETÁRIO
                  </span>
                </div>
              )}

              {/* Colaboradores */}
              {collaborators.length === 0 ? (
                <p className="text-center text-xs text-neutral-500">Nenhum colaborador</p>
              ) : (
                <div className="space-y-2">
                  {collaborators.map((collab) => (
                    <div
                      key={collab.user_id}
                      className="group rounded-md border border-neutral-800 bg-neutral-950 p-3"
                    >
                      <div className="mb-2 flex items-center gap-2">
                        {collab.avatar_url ? (
                          <Image
                            src={collab.avatar_url}
                            alt={collab.name || collab.username}
                            className="h-8 w-8 rounded-full object-cover"
                            height={32}
                            width={32}
                          />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-700 text-xs font-bold text-neutral-200">
                            {collab.name?.charAt(0) || collab.username.charAt(0)}
                          </div>
                        )}
                        <div className="flex-1">
                          <p className="text-xs font-medium text-neutral-200">
                            {collab.name || collab.username}
                          </p>
                          <p className="text-[10px] text-neutral-500">{collab.email}</p>
                        </div>
                        {isOwner && (
                          <button
                            onClick={() => handleRemoveCollaborator(collab.user_id)}
                            className="opacity-0 transition-opacity group-hover:opacity-100"
                          >
                            <FaTimes className="text-xs text-red-400 hover:text-red-300" />
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
                          className="w-full rounded-md border border-neutral-700 bg-neutral-800 px-2 py-1 text-[10px] text-neutral-300"
                        >
                          <option value="viewer">Visualizador</option>
                          <option value="admin">Administrador</option>
                        </select>
                      ) : (
                        <span
                          className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-bold ${
                            collab.permission === "admin"
                              ? "bg-blue-500/20 text-blue-400"
                              : "bg-neutral-800 text-neutral-400"
                          }`}
                        >
                          {collab.permission === "admin" ? "ADMIN" : "VIEWER"}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Estatísticas */}
            <div className="rounded-md border border-neutral-800 bg-neutral-900 p-4">
              <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-neutral-100">
                <TrendingUp className="h-4 w-4" />
                Estatísticas
              </h2>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-neutral-400">Total de Notas</span>
                  <span className="font-mono text-sm font-bold text-neutral-200">
                    {projectNotes.length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-neutral-400">Colaboradores</span>
                  <span className="font-mono text-sm font-bold text-neutral-200">
                    {collaborators.length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-neutral-400">Progresso</span>
                  <span className="font-mono text-sm font-bold text-yellow-400">
                    {project.properties?.progress || 0}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Adicionar Colaborador */}
      {showAddCollaborator && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-md border border-neutral-800 bg-neutral-900 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-neutral-100">Adicionar Colaborador</h3>
              <button
                onClick={() => {
                  setShowAddCollaborator(false);
                  setCollaboratorSearch("");
                  setSearchResults([]);
                }}
                className="text-neutral-400 hover:text-neutral-200"
              >
                <FaTimes />
              </button>
            </div>

            <div className="relative mb-4">
              <FaSearch className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-neutral-500" />
              <input
                type="text"
                value={collaboratorSearch}
                onChange={(e) => setCollaboratorSearch(e.target.value)}
                placeholder="Buscar por nome ou email..."
                className="w-full rounded-md border border-neutral-700 bg-neutral-800 py-2 pr-3 pl-10 text-sm text-neutral-100 focus:border-yellow-500 focus:outline-none"
              />
            </div>

            {searchingUsers && (
              <div className="flex justify-center py-4">
                <FaSpinner className="h-5 w-5 animate-spin text-neutral-500" />
              </div>
            )}

            {searchResults.length > 0 && (
              <div className="max-h-60 space-y-2 overflow-y-auto">
                {searchResults.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between rounded-md border border-neutral-800 bg-neutral-950 p-3"
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-700 text-xs font-bold text-neutral-200">
                        {user.name?.charAt(0) || user.username.charAt(0)}
                      </div>
                      <div>
                        <p className="text-xs font-medium text-neutral-200">
                          {user.name || user.username}
                        </p>
                        <p className="text-[10px] text-neutral-500">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleAddCollaborator(user.id, "viewer")}
                        className="rounded-md bg-neutral-800 px-2 py-1 text-[10px] text-neutral-300 transition-colors hover:bg-neutral-700"
                      >
                        Viewer
                      </button>
                      <button
                        onClick={() => handleAddCollaborator(user.id, "admin")}
                        className="rounded-md bg-blue-500/20 px-2 py-1 text-[10px] text-blue-400 transition-colors hover:bg-blue-500/30"
                      >
                        Admin
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {collaboratorSearch.length >= 2 && !searchingUsers && searchResults.length === 0 && (
              <p className="py-4 text-center text-sm text-neutral-500">Nenhum usuário encontrado</p>
            )}
          </div>
        </div>
      )}

      {/* Modal: Adicionar Nota */}
      {showAddNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-md border border-neutral-800 bg-neutral-900 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-neutral-100">Adicionar Nota</h3>
              <button
                onClick={() => setShowAddNote(false)}
                className="text-neutral-400 hover:text-neutral-200"
              >
                <FaTimes />
              </button>
            </div>

            {availableNotes.length === 0 ? (
              <p className="py-4 text-center text-sm text-neutral-500">
                Nenhuma nota disponível para adicionar
              </p>
            ) : (
              <div className="max-h-96 space-y-2 overflow-y-auto">
                {availableNotes.map((note) => (
                  <button
                    key={note.id}
                    onClick={() => handleAddNote(note.id)}
                    className="w-full rounded-md border border-neutral-800 bg-neutral-950 p-3 text-left transition-colors hover:border-neutral-700 hover:bg-neutral-900"
                  >
                    <p className="mb-1 text-sm font-medium text-neutral-200">{note.title}</p>
                    {note.tags && note.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {note.tags.slice(0, 3).map((tag, i) => (
                          <span
                            key={i}
                            className="rounded-full bg-neutral-800 px-2 py-0.5 text-[10px] text-neutral-400"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
