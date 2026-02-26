"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Search, Filter, Plus, X, SortAsc, RefreshCw, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { useNotes } from "../../contexts/NotesContext";
import { deleteNotes } from "@/app/services/notes-service/NotesService";
import { getCollaboratorDisplayName, getCollaboratorAvatarUrl } from "@/app/utils/collaborators";
import { getTagColor } from "@/app/utils/tag-colors";
import Pagination from "../components/ui/pagination";
import { formatDate } from "@/app/utils/format";
import { FiCheckSquare } from "react-icons/fi";

interface PaginationData {
  currentPage: number;
  totalPages: number;
  total: number;
}

type SortBy = "updated_at" | "title" | "created_at";
type SortOrder = "asc" | "desc";

const NotesWithPagination = () => {
  const router = useRouter();

  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedCollaborators, setSelectedCollaborators] = useState<string[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState<boolean>(false);

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage] = useState<number>(10);

  const [sortBy, setSortBy] = useState<SortBy>("updated_at");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  const [selectionMode, setSelectionMode] = useState<boolean>(false);
  const [selectedNotes, setSelectedNotes] = useState<Set<string>>(new Set());

  const { notes: allNotes, loading: isLoading, error, createNote, refreshNotes } = useNotes();

  const debouncedSearch = searchTerm;

  // Filtragem e Ordenação
  const filteredNotes = React.useMemo(() => {
    let result = allNotes;

    if (debouncedSearch.trim()) {
      const searchLower = debouncedSearch.toLowerCase();
      result = result.filter(
        (note) =>
          note.title.toLowerCase().includes(searchLower) ||
          note.description?.toLowerCase().includes(searchLower) ||
          note.tags?.some((tag) => tag.toLowerCase().includes(searchLower))
      );
    }

    // Tags
    if (selectedTags.length > 0) {
      result = result.filter((note) =>
        selectedTags.every((selectedTag) => note.tags?.includes(selectedTag))
      );
    }

    // Colaboradores
    if (selectedCollaborators.length > 0) {
      result = result.filter((note) =>
        selectedCollaborators.some((selectedCollab) =>
          note.collaborators?.some((c) =>
            getCollaboratorDisplayName(c).toLowerCase().includes(selectedCollab.toLowerCase())
          )
        )
      );
    }

    // Projetos
    if (selectedProjects.length > 0) {
      result = result.filter(
        (note) => note.project_id && selectedProjects.includes(note.project_id)
      );
    }

    // Ordenação
    result.sort((a, b) => {
      let aValue: string | Date = "";
      let bValue: string | Date = "";

      switch (sortBy) {
        case "title":
          aValue = a.title;
          bValue = b.title;
          break;
        case "created_at":
          aValue = new Date(a.created_at);
          bValue = new Date(b.created_at);
          break;
        case "updated_at":
        default:
          aValue = new Date(a.updated_at || a.created_at);
          bValue = new Date(b.updated_at || b.created_at);
          break;
      }

      if (sortOrder === "asc") {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return result;
  }, [
    allNotes,
    debouncedSearch,
    selectedTags,
    selectedCollaborators,
    selectedProjects,
    sortBy,
    sortOrder,
  ]);

  // Paginação
  const totalNotes = filteredNotes.length;
  const totalPages = Math.ceil(totalNotes / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const notes = filteredNotes.slice(startIndex, endIndex);

  const pagination: PaginationData = {
    currentPage: currentPage,
    totalPages: totalPages,
    total: totalNotes,
  };

  // Estados de Loading
  const isPreviousData = false;
  const showFullSkeleton = isLoading && !isPreviousData && notes.length === 0;
  const showOverlayLoading = isLoading && isPreviousData;
  const showListSkeleton = isLoading && !isPreviousData && debouncedSearch !== searchTerm;

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [currentPage, totalPages]);

  // =================== HANDLERS ===================
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    const container = document.getElementById("notes-container");
    if (container) container.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleTagToggle = (tag: string) => {
    setSelectedTags((prev) => {
      const newTags = prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag];
      setCurrentPage(1);
      return newTags;
    });
  };

  const handleCollaboratorToggle = (collaborator: string) => {
    setSelectedCollaborators((prev) => {
      const newCollabs = prev.includes(collaborator)
        ? prev.filter((c) => c !== collaborator)
        : [...prev, collaborator];
      setCurrentPage(1);
      return newCollabs;
    });
  };

  const handleProjectToggle = (projectId: string) => {
    setSelectedProjects((prev) => {
      const newProjects = prev.includes(projectId)
        ? prev.filter((p) => p !== projectId)
        : [...prev, projectId];
      setCurrentPage(1);
      return newProjects;
    });
  };

  const handleSortChange = (newSortBy: SortBy, newSortOrder: SortOrder = sortOrder) => {
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedTags([]);
    setSelectedCollaborators([]);
    setSelectedProjects([]);
    setCurrentPage(1);
    setShowFilters(false);
  };

  const handleCreateNote = async () => {
    try {
      const newNote = await createNote({
        title: "Nova Nota",
        description: "",
        tags: [],
      });
      if (newNote) router.push(`/app/notes/view/${newNote.id}`);
    } catch (error: any) {
      console.error("Erro:", error);

      // Verifica se é um erro de limite de plano
      if (error?.message?.includes("permite apenas") || error?.message?.includes("plano")) {
        toast.error("Limite do Plano Atingido", {
          description: error.message,
          duration: 6000,
          action: {
            label: "Ver Planos",
            onClick: () => router.push("/app/settings?tab=plan"),
          },
        });
      } else {
        toast.error("Erro ao criar nota", {
          description: error?.message || "Ocorreu um erro ao criar a nota. Tente novamente.",
        });
      }
    }
  };

  const handleRefresh = async () => {
    await refreshNotes();
  };

  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    setSelectedNotes(new Set());
  };

  const toggleNoteSelection = (noteId: string) => {
    const newSelected = new Set(selectedNotes);
    if (newSelected.has(noteId)) {
      newSelected.delete(noteId);
    } else {
      newSelected.add(noteId);
    }
    setSelectedNotes(newSelected);
  };

  const selectAllNotes = () => {
    if (selectedNotes.size === notes.length) {
      setSelectedNotes(new Set());
    } else {
      setSelectedNotes(new Set(notes.map((note) => note.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedNotes.size === 0) return;

    const confirmed = window.confirm(
      `Tem certeza que deseja excluir ${selectedNotes.size} nota(s)?`
    );

    if (confirmed) {
      try {
        const noteIds = Array.from(selectedNotes);
        await deleteNotes(noteIds);
        await refreshNotes();
        setSelectedNotes(new Set());
        setSelectionMode(false);
      } catch (error) {
        console.error("Erro ao excluir notas:", error);
        alert("Erro ao excluir notas selecionadas.");
      }
    }
  };

  const availableTags: string[] = [...new Set(allNotes.flatMap((note) => note.tags || []))].sort(
    (a, b) => a.toLowerCase().localeCompare(b.toLowerCase())
  );

  const availableCollaborators: string[] = [
    ...new Set(
      allNotes.flatMap(
        (note) => note.collaborators?.map((c) => getCollaboratorDisplayName(c)) || []
      )
    ),
  ].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));

  const availableProjects = React.useMemo(() => {
    const projects = new Map<string, { id: string; name: string }>();

    allNotes.forEach((note) => {
      if (note.project_id && note.project_name) {
        projects.set(note.project_id, { id: note.project_id, name: note.project_name });
      }
    });

    return Array.from(projects.values()).sort((a, b) =>
      a.name.toLowerCase().localeCompare(b.name.toLowerCase())
    );
  }, [allNotes]);

  // =================== RENDER ===================

  if (error) {
    return (
      <div className="flex h-full items-center justify-center bg-neutral-50 p-6 dark:bg-neutral-950">
        <div className="text-center">
          <p className="font-medium text-red-500 dark:text-red-400">Erro ao carregar notas</p>
          <button
            onClick={handleRefresh}
            className="mt-2 text-sm text-neutral-400 underline hover:text-neutral-900 dark:hover:text-white"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* =================== HEADER / TOOLBAR =================== */}
      <div className="flex flex-col rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 sm:px-4 dark:border-neutral-800 dark:bg-neutral-950">
        {/* Linha 1: Título e Ações */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-4">
            <h2 className="text-base font-semibold text-yellow-500 sm:text-lg">Notas</h2>
            <div className="h-4 w-px bg-neutral-200 dark:bg-neutral-800"></div>
            <div className="flex items-center gap-1 text-sm text-neutral-500 sm:gap-2">
              <span className="font-medium text-neutral-900 dark:text-neutral-200">
                {pagination.total}
              </span>
              <span className="text-xs">registros</span>
            </div>
            <button
              onClick={toggleSelectionMode}
              className={`flex items-center gap-2 rounded-md px-2 py-1 text-sm transition-colors ${
                selectionMode
                  ? "bg-yellow-50 text-yellow-600 dark:bg-yellow-500/10 dark:text-yellow-500"
                  : "text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              }`}
              title="Modo de seleção"
            >
              <FiCheckSquare size={18} />
            </button>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-neutral-200 bg-neutral-50 text-neutral-500 transition-colors hover:border-neutral-300 hover:text-neutral-900 disabled:opacity-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:border-neutral-700 dark:hover:text-neutral-200"
              title="Atualizar"
            >
              <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
            </button>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex h-9 shrink-0 items-center gap-1.5 rounded-md border px-2 text-sm font-medium transition-colors sm:gap-2 sm:px-3 ${
                showFilters ||
                selectedTags.length > 0 ||
                selectedCollaborators.length > 0 ||
                selectedProjects.length > 0
                  ? "border-yellow-500 bg-yellow-50 text-yellow-700 dark:border-yellow-500/30 dark:bg-yellow-500/10 dark:text-yellow-500"
                  : "border-neutral-200 bg-neutral-50 text-neutral-600 hover:border-neutral-300 hover:text-neutral-900 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:border-neutral-700 dark:hover:text-neutral-200"
              }`}
            >
              <Filter size={16} />
              <span className="hidden sm:inline">Filtrar</span>
              {(selectedTags.length > 0 ||
                selectedCollaborators.length > 0 ||
                selectedProjects.length > 0) && (
                <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-yellow-500 px-1.5 text-[10px] font-bold text-white">
                  {selectedTags.length + selectedCollaborators.length + selectedProjects.length}
                </span>
              )}
            </button>

            <button
              onClick={handleCreateNote}
              className="flex h-9 shrink-0 items-center gap-1 rounded-md bg-yellow-500 px-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-neutral-800 active:scale-95 sm:px-4 dark:bg-neutral-50 dark:text-neutral-950 dark:hover:bg-neutral-200"
            >
              <Plus size={16} />
              <span className="hidden sm:inline">Criar</span>
            </button>
          </div>
        </div>

        {/* Linha 2: Busca */}
        <div className="relative mt-2">
          <Search className="absolute top-1/2 left-3 -translate-y-1/2 text-neutral-400" size={16} />
          <input
            type="text"
            placeholder="Buscar notas..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="h-9 w-full rounded-md border border-neutral-200 bg-neutral-50 pr-8 pl-9 text-sm text-neutral-900 placeholder-neutral-400 transition-all focus:border-yellow-500 focus:bg-neutral-50 focus:ring-1 focus:ring-yellow-500 focus:outline-none dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100 dark:placeholder-neutral-500 dark:focus:border-yellow-500/50"
          />
          {(searchTerm !== debouncedSearch || isLoading) && (
            <div className="absolute top-1/2 right-3 -translate-y-1/2">
              <Loader2 size={14} className="animate-spin text-neutral-400" />
            </div>
          )}
        </div>

        {/* Linha 2: Painel de Filtros */}
        {showFilters && (
          <div className="animate-in slide-in-from-top-1 mt-4 max-h-[60vh] overflow-y-auto border-t border-neutral-100 pt-4 dark:border-neutral-800">
            <div className="flex flex-col gap-4 sm:gap-6">
              {/* Tags Group */}
              <div className="space-y-3">
                <span className="text-[10px] font-semibold tracking-wider text-neutral-500 uppercase">
                  Tags ({availableTags.length})
                </span>
                <div className="flex flex-wrap gap-2">
                  {availableTags.length > 0 ? (
                    availableTags.map((tag) => {
                      const colors = getTagColor(tag);
                      return (
                        <button
                          key={tag}
                          onClick={() => handleTagToggle(tag)}
                          className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                            selectedTags.includes(tag)
                              ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-neutral-50 dark:text-neutral-950"
                              : `${colors.border} ${colors.bg} ${colors.text} hover:opacity-80`
                          }`}
                        >
                          {tag}
                        </button>
                      );
                    })
                  ) : (
                    <span className="text-sm text-neutral-400 italic">Nenhuma tag disponível.</span>
                  )}
                </div>
              </div>

              {/* Colaboradores Group */}
              <div className="space-y-3">
                <span className="text-[10px] font-semibold tracking-wider text-neutral-500 uppercase">
                  Colaboradores ({availableCollaborators.length})
                </span>
                <div className="flex flex-wrap gap-2">
                  {availableCollaborators.length > 0 ? (
                    availableCollaborators.map((collaborator) => (
                      <button
                        key={collaborator}
                        onClick={() => handleCollaboratorToggle(collaborator)}
                        className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                          selectedCollaborators.includes(collaborator)
                            ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-neutral-50 dark:text-neutral-950"
                            : "border-neutral-200 bg-neutral-50 text-neutral-600 hover:border-neutral-300 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:border-neutral-700 dark:hover:bg-neutral-800"
                        }`}
                      >
                        {collaborator}
                      </button>
                    ))
                  ) : (
                    <span className="text-sm text-neutral-400 italic">
                      Nenhum colaborador disponível.
                    </span>
                  )}
                </div>
              </div>

              {/* Projetos Group - Só exibe se houver projetos */}
              {availableProjects.length > 0 && (
                <div className="space-y-3">
                  <span className="text-[10px] font-semibold tracking-wider text-neutral-500 uppercase">
                    Projetos ({availableProjects.length})
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {availableProjects.map((project) => (
                      <button
                        key={project.id}
                        onClick={() => handleProjectToggle(project.id)}
                        className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                          selectedProjects.includes(project.id)
                            ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-neutral-50 dark:text-neutral-950"
                            : "border-neutral-200 bg-neutral-50 text-neutral-600 hover:border-neutral-300 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:border-neutral-700 dark:hover:bg-neutral-800"
                        }`}
                      >
                        {project.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Ordenação */}
              <div className="space-y-3 border-t border-neutral-100 pt-4 sm:pt-6 dark:border-neutral-800">
                <div className="flex items-center justify-between">
                  <div className="w-full space-y-3 sm:w-auto sm:min-w-[240px]">
                    <span className="text-[10px] font-semibold tracking-wider text-neutral-500 uppercase">
                      Ordenação
                    </span>
                    <div className="flex gap-2">
                      <select
                        value={sortBy}
                        onChange={(e) => handleSortChange(e.target.value as SortBy)}
                        aria-label="Ordenar por"
                        className="h-9 flex-1 rounded-md border border-neutral-200 bg-neutral-50 px-3 text-sm text-neutral-700 focus:border-neutral-400 focus:outline-none dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300"
                      >
                        <option value="updated_at">Data de Atualização</option>
                        <option value="created_at">Data de Criação</option>
                        <option value="title">Título (A-Z)</option>
                      </select>
                      <button
                        onClick={() => setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))}
                        className="flex h-9 w-9 items-center justify-center rounded-md border border-neutral-200 bg-neutral-50 text-neutral-600 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800"
                        title={sortOrder === "asc" ? "Crescente" : "Decrescente"}
                      >
                        {sortOrder === "asc" ? (
                          <SortAsc size={16} className="rotate-180" />
                        ) : (
                          <SortAsc size={16} />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {(searchTerm ||
              selectedTags.length > 0 ||
              selectedCollaborators.length > 0 ||
              selectedProjects.length > 0) && (
              <div className="mt-4 flex justify-end border-t border-neutral-100 pt-3 dark:border-neutral-800">
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-1.5 text-xs font-medium text-red-500 transition-colors hover:text-red-600"
                >
                  <X size={12} /> Limpar Filtros
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* =================== BARRA DE AÇÕES EM LOTE =================== */}
      {selectionMode && selectedNotes.size > 0 && (
        <div className="animate-in slide-in-from-top-2 mt-3 flex flex-col gap-3 rounded-md border border-yellow-500/30 bg-yellow-50 px-3 py-3 shadow-sm sm:mt-4 sm:flex-row sm:items-center sm:justify-between sm:px-4 dark:border-yellow-500/20 dark:bg-yellow-500/10">
          <div className="flex items-center gap-2 sm:gap-3">
            <FiCheckSquare size={18} className="shrink-0 text-yellow-600 dark:text-yellow-500" />
            <span className="text-sm font-medium text-yellow-900 dark:text-yellow-500">
              {selectedNotes.size} nota(s) selecionada(s)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={selectAllNotes}
              className="text-xs font-medium text-yellow-700 underline hover:text-yellow-800 dark:text-yellow-500 dark:hover:text-yellow-400"
            >
              {selectedNotes.size === notes.length ? "Desmarcar" : "Selecionar todas"}
            </button>
            <div className="h-4 w-px bg-yellow-300 dark:bg-yellow-500/30"></div>
            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-1.5 rounded-md bg-red-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-600"
            >
              <Trash2 size={14} />
              <span className="hidden sm:inline">Excluir</span>
            </button>
            <button
              onClick={toggleSelectionMode}
              className="flex items-center gap-1.5 rounded-md border border-neutral-300 bg-neutral-50 px-3 py-1.5 text-xs font-semibold text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
            >
              <X size={14} />
              <span className="hidden sm:inline">Cancelar</span>
            </button>
          </div>
        </div>
      )}

      {/* =================== CONTEÚDO (LISTA) =================== */}
      <div
        id="notes-container"
        className="mt-3 flex-1 overflow-y-auto rounded-md border border-neutral-200 bg-neutral-50 shadow-sm sm:mt-4 dark:border-neutral-800 dark:bg-neutral-950"
      >
        <div className="mx-auto">
          {/* Headers da Lista - Visível apenas em desktop */}
          {notes.length > 0 && !showFullSkeleton && (
            <div className="hidden grid-cols-12 gap-4 rounded-md bg-neutral-50 p-2 px-4 text-[10px] font-semibold tracking-wider text-neutral-400 uppercase sm:grid dark:bg-neutral-950">
              <div className="col-span-4">Detalhes</div>
              <div className="col-span-2">Projeto</div>
              <div className="col-span-3">Tags</div>
              <div className="col-span-1 text-center">Colabs</div>
              <div className="col-span-2 text-right">Última atualização</div>
            </div>
          )}
          {showFullSkeleton || showListSkeleton ? (
            <div className="space-y-2 p-2 sm:space-y-3 sm:p-0">
              {Array.from({ length: itemsPerPage }).map((_, i) => (
                <div
                  key={i}
                  className="flex h-16 animate-pulse items-center gap-3 rounded-lg border border-neutral-200 bg-neutral-50 px-3 sm:h-20 sm:gap-4 sm:px-4 dark:border-neutral-800 dark:bg-neutral-900"
                >
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-2/3 rounded bg-neutral-100 sm:w-1/3 dark:bg-neutral-800"></div>
                    <div className="h-3 w-1/2 rounded bg-neutral-100 dark:bg-neutral-800"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : notes.length > 0 ? (
            <div className="relative space-y-1">
              {/* Overlay Loading */}
              {showOverlayLoading && (
                <div className="absolute inset-0 z-10 flex items-start justify-center bg-neutral-50/60 pt-10 backdrop-blur-[1px] dark:bg-neutral-950/60">
                  <Loader2 size={24} className="animate-spin text-neutral-900 dark:text-white" />
                </div>
              )}

              {notes.map((note) => {
                const isSelected = selectedNotes.has(note.id);
                return (
                  <div
                    key={note.id}
                    className={`group relative border-t transition-all ${
                      isSelected
                        ? "border-yellow-500 bg-yellow-50/50 ring-2 ring-yellow-500/20 dark:border-yellow-500/50 dark:bg-yellow-500/5 dark:ring-yellow-500/10"
                        : "border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-950"
                    }`}
                  >
                    {selectionMode && (
                      <div className="absolute top-1/2 left-2 z-10 -translate-y-1/2 sm:top-3 sm:left-3 sm:translate-y-0">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleNoteSelection(note.id)}
                          className="h-5 w-5 cursor-pointer rounded border-neutral-300 text-yellow-500 transition-colors focus:ring-2 focus:ring-yellow-500 focus:ring-offset-0 dark:border-neutral-600 dark:bg-neutral-800"
                        />
                      </div>
                    )}
                    <Link
                      href={selectionMode ? "#" : `/app/notes/view/${note.id}`}
                      onClick={(e) => {
                        if (selectionMode) {
                          e.preventDefault();
                          toggleNoteSelection(note.id);
                        }
                      }}
                      className="block"
                    >
                      {/* === Layout Mobile (card compacto) === */}
                      <article
                        className={`flex h-16 items-center gap-2 px-3 transition-all sm:hidden ${
                          selectionMode ? "pl-10" : ""
                        } ${!selectionMode && "active:bg-neutral-100 dark:active:bg-neutral-900"}`}
                      >
                        {/* Coluna esquerda: título + descrição */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <h3 className="truncate text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                              {note.title?.length > 40
                                ? `${note.title.slice(0, 40)}...`
                                : note.title || "Sem título"}
                            </h3>
                            {new Date(note.created_at).getTime() > Date.now() - 86400000 && (
                              <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-yellow-500"></span>
                            )}
                          </div>
                          <div className="mt-0.5 flex items-center gap-1.5 overflow-hidden">
                            {note.tags && note.tags.length > 0 ? (
                              <>
                                {note.tags.slice(0, 2).map((tag, i) => {
                                  const colors = getTagColor(tag);
                                  return (
                                    <span
                                      key={i}
                                      className={`inline-flex shrink-0 items-center rounded-md border px-1.5 py-0 text-[10px] font-medium ${colors.bg} ${colors.text} ${colors.border}`}
                                    >
                                      {tag}
                                    </span>
                                  );
                                })}
                                {note.tags.length > 2 && (
                                  <span className="shrink-0 text-[10px] text-neutral-400">
                                    +{note.tags.length - 2}
                                  </span>
                                )}
                              </>
                            ) : (
                              <span className="truncate text-xs text-neutral-400 dark:text-neutral-500">
                                {note.description || "Sem descrição"}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Coluna direita: colabs + data */}
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <span className="text-[11px] text-neutral-400 dark:text-neutral-500">
                            {formatDate(note.updated_at)}
                          </span>
                          <div className="flex items-center gap-1.5">
                            {note.project_name && (
                              <div className="flex items-center gap-1">
                                <div className="h-1.5 w-1.5 rounded-full bg-blue-500"></div>
                                <span className="max-w-[60px] truncate text-[10px] text-neutral-500">
                                  {note.project_name}
                                </span>
                              </div>
                            )}
                            {note.collaborators && note.collaborators.length > 0 && (
                              <div className="flex -space-x-1.5">
                                {note.collaborators.slice(0, 2).map((c, i) => {
                                  const avatar = getCollaboratorAvatarUrl(c);
                                  const name = getCollaboratorDisplayName(c);
                                  return (
                                    <div
                                      key={i}
                                      className="relative flex h-5 w-5 items-center justify-center overflow-hidden rounded-full border border-white bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800"
                                      title={name}
                                    >
                                      {avatar ? (
                                        <Image
                                          src={avatar}
                                          alt={name}
                                          width={20}
                                          height={20}
                                          className="h-full w-full object-cover"
                                        />
                                      ) : (
                                        <span className="text-[7px] font-bold text-neutral-500">
                                          {name.charAt(0)}
                                        </span>
                                      )}
                                    </div>
                                  );
                                })}
                                {note.collaborators.length > 2 && (
                                  <span className="pl-1 text-[9px] text-neutral-400">
                                    +{note.collaborators.length - 2}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </article>

                      {/* === Layout Desktop (grid) === */}
                      <article
                        className={`hidden h-14 gap-4 px-4 shadow-sm transition-all sm:grid sm:grid-cols-12 sm:items-center ${
                          selectionMode ? "pl-12" : ""
                        } ${!selectionMode && "hover:shadow-md dark:hover:shadow-none"}`}
                      >
                        {/* Título e Descrição */}
                        <div className="col-span-4 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="truncate text-xs font-semibold text-neutral-800 group-hover:text-yellow-600 dark:text-neutral-200 dark:group-hover:text-yellow-400">
                              {note.title?.length > 60
                                ? `${note.title.slice(0, 60)}...`
                                : note.title || "No title"}
                            </h3>
                            {new Date(note.created_at).getTime() > Date.now() - 86400000 && (
                              <span className="inline-block h-1.5 w-1.5 rounded-full bg-yellow-500"></span>
                            )}
                          </div>
                          <p className="mt-0.5 truncate text-[10px] text-neutral-500 group-hover:text-neutral-600 dark:text-neutral-400 dark:group-hover:text-neutral-300">
                            {note.description || "Sem descrição"}
                          </p>
                        </div>

                        {/* Projeto */}
                        <div className="col-span-2">
                          {note.project_name ? (
                            <div className="flex items-center gap-1.5">
                              <div className="h-1.5 w-1.5 rounded-full bg-blue-500"></div>
                              <span className="truncate text-xs font-medium text-neutral-700 dark:text-neutral-300">
                                {note.project_name}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-neutral-400 dark:text-neutral-600">
                              -
                            </span>
                          )}
                        </div>

                        {/* Tags */}
                        <div className="col-span-3">
                          <div className="flex flex-wrap gap-1.5">
                            {note.tags?.slice(0, 2).map((tag, i) => {
                              const colors = getTagColor(tag);
                              return (
                                <span
                                  key={i}
                                  className={`inline-flex items-center rounded-md border px-1 py-1 text-[8px] font-medium ${colors.bg} ${colors.text} ${colors.border}`}
                                >
                                  {tag}
                                </span>
                              );
                            })}
                            {(note.tags?.length || 0) > 2 && (
                              <span className="text-[8px] text-neutral-400 dark:text-neutral-500">
                                +{note.tags!.length - 2}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Colaboradores */}
                        <div className="col-span-1 flex justify-center">
                          {note.collaborators && note.collaborators.length > 0 ? (
                            <div className="flex -space-x-2">
                              {note.collaborators.slice(0, 3).map((c, i) => {
                                const avatar = getCollaboratorAvatarUrl(c);
                                const name = getCollaboratorDisplayName(c);
                                return (
                                  <div
                                    key={i}
                                    className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-neutral-100 ring-1 ring-neutral-100 dark:border-neutral-600 dark:bg-neutral-800 dark:ring-neutral-900"
                                    title={name}
                                  >
                                    {avatar ? (
                                      <Image
                                        src={avatar}
                                        alt={name}
                                        width={28}
                                        height={28}
                                        className="h-full w-full object-cover"
                                      />
                                    ) : (
                                      <span className="text-[8px] font-bold text-neutral-500">
                                        {name.charAt(0)}
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <span className="text-neutral-300 dark:text-neutral-700">-</span>
                          )}
                        </div>

                        {/* Data */}
                        <div className="col-span-2 flex flex-col items-end">
                          <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                            {formatDate(note.updated_at)}
                          </span>
                        </div>
                      </article>
                    </Link>
                  </div>
                );
              })}
            </div>
          ) : (
            // Empty State
            <div className="flex h-48 flex-col items-center justify-center rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-4 text-center sm:h-64 dark:border-neutral-800 dark:bg-neutral-900/50">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-neutral-50 shadow-sm sm:mb-4 sm:h-12 sm:w-12 dark:bg-neutral-800">
                <Search size={18} className="text-neutral-400 sm:hidden" />
                <Search size={20} className="hidden text-neutral-400 sm:block" />
              </div>
              <h3 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                Nenhuma nota encontrada
              </h3>
              <p className="mt-1 mb-3 max-w-xs text-xs text-neutral-500 sm:mb-4">
                Tente ajustar os termos de busca ou remover os filtros.
              </p>
              <button
                onClick={clearFilters}
                className="text-xs font-medium text-yellow-600 hover:underline dark:text-yellow-500"
              >
                Limpar filtros
              </button>
            </div>
          )}
        </div>
      </div>

      {/* =================== FOOTER =================== */}
      {totalPages > 1 && (
        <div className="border-t border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-950">
          <Pagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            totalItems={pagination.total}
            itemsPerPage={itemsPerPage}
            onPageChange={handlePageChange}
            showInfo={false}
            className="justify-center"
          />
        </div>
      )}
    </div>
  );
};

export default NotesWithPagination;
