"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Search, Filter, Plus, X, SortAsc, RefreshCw, Loader2 } from "lucide-react";

// =================== IMPORTS DE CONTEXTO E UTILS ===================
import { useNotes } from "../../contexts/NotesContext";
import { getCollaboratorDisplayName, getCollaboratorAvatarUrl } from "@/app/utils/collaborators";
import { getTagColor } from "@/app/utils/tag-colors";
import Pagination from "../../components/ui/pagination";

// =================== TYPES ===================
interface PaginationData {
  currentPage: number;
  totalPages: number;
  total: number;
}

type SortBy = "updated_at" | "title" | "created_at";
type SortOrder = "asc" | "desc";

const NotesWithPagination = () => {
  const router = useRouter();

  // =================== ESTADOS ===================
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedCollaborators, setSelectedCollaborators] = useState<string[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState<boolean>(false);

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage] = useState<number>(10); // Lista geralmente comporta menos itens por view que grid

  const [sortBy, setSortBy] = useState<SortBy>("updated_at");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  // =================== HOOK DE DADOS ===================
  const { notes: allNotes, loading: isLoading, error, createNote, refreshNotes } = useNotes();

  const debouncedSearch = searchTerm;

  // =================== LÓGICA DE FILTRAGEM ===================
  const filteredNotes = React.useMemo(() => {
    let result = allNotes;

    // Busca
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
    } catch (error) {
      console.error("Erro:", error);
      alert("Erro ao criar nova nota.");
    }
  };

  const handleRefresh = async () => {
    await refreshNotes();
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
    <div className="flex h-full flex-col bg-neutral-50 dark:bg-neutral-950">
      {/* =================== HEADER / TOOLBAR =================== */}
      <div className="flex flex-col rounded-md border border-neutral-200 bg-white px-2 py-2 sm:px-4 dark:border-neutral-800 dark:bg-neutral-950">
        {/* Linha 1: Título e Ações */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
              Notas
            </h2>
            <div className="hidden h-4 w-px bg-neutral-200 sm:block dark:bg-neutral-800"></div>
            <div className="hidden items-center gap-2 text-sm text-neutral-500 sm:flex">
              <span className="font-medium text-neutral-900 dark:text-neutral-200">
                {pagination.total}
              </span>
              <span className="text-xs">registros</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Search Input - Aumentado para h-9 para melhor clique */}
            <div className="relative flex-1 sm:w-72 sm:flex-none">
              <Search
                className="absolute top-1/2 left-3 -translate-y-1/2 text-neutral-400"
                size={16}
              />
              <input
                type="text"
                placeholder="Buscar..."
                value={searchTerm}
                onChange={handleSearchChange}
                className="h-9 w-full rounded-md border border-neutral-200 bg-neutral-50 pr-8 pl-9 text-sm text-neutral-900 placeholder-neutral-400 transition-all focus:border-yellow-500 focus:bg-white focus:ring-1 focus:ring-yellow-500 focus:outline-none dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100 dark:placeholder-neutral-500 dark:focus:border-yellow-500/50"
              />
              {(searchTerm !== debouncedSearch || isLoading) && (
                <div className="absolute top-1/2 right-3 -translate-y-1/2">
                  <Loader2 size={14} className="animate-spin text-neutral-400" />
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 border-l border-neutral-200 pl-3 dark:border-neutral-800">
              <button
                onClick={handleRefresh}
                disabled={isLoading}
                className="flex h-9 w-9 items-center justify-center rounded-md border border-neutral-200 bg-white text-neutral-500 transition-colors hover:border-neutral-300 hover:text-neutral-900 disabled:opacity-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:border-neutral-700 dark:hover:text-neutral-200"
                title="Atualizar"
              >
                <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
              </button>

              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex h-9 items-center gap-2 rounded-md border px-3 text-sm font-medium transition-colors ${
                  showFilters ||
                  selectedTags.length > 0 ||
                  selectedCollaborators.length > 0 ||
                  selectedProjects.length > 0
                    ? "border-yellow-500 bg-yellow-50 text-yellow-700 dark:border-yellow-500/30 dark:bg-yellow-500/10 dark:text-yellow-500"
                    : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300 hover:text-neutral-900 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:border-neutral-700 dark:hover:text-neutral-200"
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
                className="flex h-9 items-center gap-1 rounded-md bg-yellow-500 px-4 text-sm font-semibold text-white shadow-sm transition-all hover:bg-neutral-800 active:scale-95 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200"
              >
                <Plus size={16} />
                <span>Criar</span>
              </button>
            </div>
          </div>
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
                              ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-950"
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
                            ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-950"
                            : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:border-neutral-700 dark:hover:bg-neutral-800"
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
                            ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-950"
                            : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:border-neutral-700 dark:hover:bg-neutral-800"
                        }`}
                      >
                        {project.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Ordenação */}
              <div className="space-y-3 border-t border-neutral-100 pt-6 dark:border-neutral-800">
                <div className="flex items-center justify-between">
                  <div className="min-w-[240px] space-y-3">
                    <span className="text-[10px] font-semibold tracking-wider text-neutral-500 uppercase">
                      Ordenação
                    </span>
                    <div className="flex gap-2">
                      <select
                        value={sortBy}
                        onChange={(e) => handleSortChange(e.target.value as SortBy)}
                        aria-label="Ordenar por"
                        className="h-9 flex-1 rounded-md border border-neutral-200 bg-white px-3 text-sm text-neutral-700 focus:border-neutral-400 focus:outline-none dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300"
                      >
                        <option value="updated_at">Data de Atualização</option>
                        <option value="created_at">Data de Criação</option>
                        <option value="title">Título (A-Z)</option>
                      </select>
                      <button
                        onClick={() => setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))}
                        className="flex h-9 w-9 items-center justify-center rounded-md border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800"
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

      {/* =================== CONTEÚDO (LISTA) =================== */}
      <div
        id="notes-container"
        className="flex-1 overflow-y-auto bg-neutral-50 p-2 sm:p-4 dark:bg-neutral-950"
      >
        <div className="mx-auto max-w-6xl">
          {" "}
          {/* Container limitador para telas muito largas */}
          {/* Headers da Lista (Opcional, mas ajuda no alinhamento visual) */}
          {notes.length > 0 && !showFullSkeleton && (
            <div className="mb-2 hidden grid-cols-12 gap-4 px-4 text-[10px] font-semibold tracking-wider text-neutral-400 uppercase sm:grid">
              <div className="col-span-6">Detalhes</div>
              <div className="col-span-3">Tags</div>
              <div className="col-span-1 text-center">Colab.</div>
              <div className="col-span-2 text-right">Data</div>
            </div>
          )}
          {showFullSkeleton || showListSkeleton ? (
            <div className="space-y-3">
              {Array.from({ length: itemsPerPage }).map((_, i) => (
                <div
                  key={i}
                  className="flex h-20 animate-pulse items-center gap-4 rounded-lg border border-neutral-200 bg-white px-4 dark:border-neutral-800 dark:bg-neutral-900"
                >
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-1/3 rounded bg-neutral-100 dark:bg-neutral-800"></div>
                    <div className="h-3 w-1/2 rounded bg-neutral-100 dark:bg-neutral-800"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : notes.length > 0 ? (
            <div className="relative space-y-3">
              {/* Overlay Loading */}
              {showOverlayLoading && (
                <div className="absolute inset-0 z-10 flex items-start justify-center bg-white/60 pt-10 backdrop-blur-[1px] dark:bg-neutral-950/60">
                  <Loader2 size={24} className="animate-spin text-neutral-900 dark:text-white" />
                </div>
              )}

              {notes.map((note) => (
                <Link key={note.id} href={`/app/notes/view/${note.id}`} className="group block">
                  <article className="flex flex-col gap-3 rounded-lg border border-neutral-200 bg-white p-4 shadow-sm transition-all hover:border-neutral-300 hover:shadow-md sm:grid sm:grid-cols-12 sm:items-center sm:gap-4 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700 dark:hover:shadow-none">
                    {/* Título e Descrição */}
                    <div className="col-span-1 min-w-0 sm:col-span-6">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate text-sm font-semibold text-neutral-900 group-hover:text-yellow-600 dark:text-neutral-100 dark:group-hover:text-yellow-400">
                          {note.title || "Sem título"}
                        </h3>
                        {/* Opcional: Badge de Novo */}
                        {new Date(note.created_at).getTime() > Date.now() - 86400000 && (
                          <span className="inline-block h-1.5 w-1.5 rounded-full bg-yellow-500"></span>
                        )}
                      </div>
                      <p className="mt-1 line-clamp-1 text-xs text-neutral-500 group-hover:text-neutral-600 dark:text-neutral-400 dark:group-hover:text-neutral-300">
                        {note.description || "Sem descrição adicional..."}
                      </p>
                    </div>

                    {/* Tags */}
                    <div className="col-span-1 sm:col-span-3">
                      <div className="flex flex-wrap gap-1.5">
                        {note.tags?.slice(0, 2).map((tag, i) => {
                          const colors = getTagColor(tag);
                          return (
                            <span
                              key={i}
                              className={`inline-flex items-center rounded-md border px-2 py-1 text-[10px] font-medium ${colors.bg} ${colors.text} ${colors.border}`}
                            >
                              {tag}
                            </span>
                          );
                        })}
                        {(note.tags?.length || 0) > 2 && (
                          <span className="text-[10px] text-neutral-400 dark:text-neutral-500">
                            +{note.tags!.length - 2}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Colaboradores e Data - Flex row em mobile */}
                    <div className="flex items-center justify-between sm:contents">
                      {/* Colaboradores */}
                      <div className="col-span-1 flex justify-start sm:col-span-1 sm:justify-center">
                        {note.collaborators && note.collaborators.length > 0 ? (
                          <div className="flex -space-x-2">
                            {note.collaborators.slice(0, 3).map((c, i) => {
                              const avatar = getCollaboratorAvatarUrl(c);
                              const name = getCollaboratorDisplayName(c);
                              return (
                                <div
                                  key={i}
                                  className="relative flex h-6 w-6 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-neutral-100 ring-1 ring-neutral-100 dark:border-neutral-900 dark:bg-neutral-800 dark:ring-neutral-900"
                                  title={name}
                                >
                                  {avatar ? (
                                    <Image
                                      src={avatar}
                                      alt={name}
                                      width={24}
                                      height={24}
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
                      <div className="col-span-1 flex flex-col items-end sm:col-span-2">
                        <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                          {note.updated_at
                            ? new Date(note.updated_at).toLocaleDateString("pt-BR", {
                                day: "2-digit",
                                month: "short",
                              })
                            : "--"}
                        </span>
                        <span className="text-[10px] text-neutral-400 dark:text-neutral-500">
                          {note.updated_at
                            ? new Date(note.updated_at).toLocaleTimeString("pt-BR", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "--"}
                        </span>
                      </div>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          ) : (
            // Empty State
            <div className="flex h-64 flex-col items-center justify-center rounded-lg border border-dashed border-neutral-300 bg-neutral-50 text-center dark:border-neutral-800 dark:bg-neutral-900/50">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm dark:bg-neutral-800">
                <Search size={20} className="text-neutral-400" />
              </div>
              <h3 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                Nenhuma nota encontrada
              </h3>
              <p className="mt-1 mb-4 max-w-xs text-xs text-neutral-500">
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
        <div className="border-t border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
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
