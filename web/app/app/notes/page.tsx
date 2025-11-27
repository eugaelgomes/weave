"use client";

import React, { useState } from "react";
import { Search, Filter, Plus, X, Clock, Calendar, SortAsc, RefreshCw } from "lucide-react";
import { getCollaboratorDisplayName, getCollaboratorAvatarUrl } from "@/app/utils/collaborators";

// =================== TYPES ===================
interface PaginationData {
  currentPage: number;
  totalPages: number;
  total: number;
}

type SortBy = "updated_at" | "title" | "created_at";
type SortOrder = "asc" | "desc";

// =================== IMPORTS DOS NOSSOS NOVOS HOOKS ===================
import { useNotes } from "../../contexts/NotesContext";
import { useRouter } from "next/navigation";
// import { useDebounce } from "../../hooks/UseDebounce"
import Pagination from "../../components/ui/pagination";
import Link from "next/link";
import Image from "next/image";

// =================== IMPORTS DOS SKELETONS ===================
// import {
//   NotesPageSkeleton,
//   NotesHeaderSkeleton,
//   NotesListSkeleton,
//   PaginationSkeleton,
// } from "../../components/ui/NotesListSkeleton"

// Imports originais
// remover import futuramente
// import MappingNotes from "../../components/modals/MappingNotes"

const NotesWithPagination = () => {
  // =================== ROUTER ===================
  const router = useRouter();

  // =================== ESTADOS DA INTERFACE ===================
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState<boolean>(false);

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage] = useState<number>(10);

  const [sortBy, setSortBy] = useState<SortBy>("updated_at");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  // =================== HOOK DE DADOS ===================
  const { notes: allNotes, loading: isLoading, error, createNote, refreshNotes, lastFetch, refreshInterval } = useNotes();

  // =================== LÓGICA DE PAGINAÇÃO E FILTROS ===================
  const debouncedSearch = searchTerm; // Temporário - usar useDebounce quando disponível

  // Filtrar notas baseado na busca e tags selecionadas
  const filteredNotes = React.useMemo(() => {
    let result = allNotes;

    // Filtro por busca
    if (debouncedSearch.trim()) {
      const searchLower = debouncedSearch.toLowerCase();
      result = result.filter(
        (note) =>
          note.title.toLowerCase().includes(searchLower) ||
          note.description?.toLowerCase().includes(searchLower) ||
          note.tags?.some((tag) => tag.toLowerCase().includes(searchLower))
      );
    }

    // Filtro por tags
    if (selectedTags.length > 0) {
      result = result.filter((note) =>
        selectedTags.every((selectedTag) => note.tags?.includes(selectedTag))
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
  }, [allNotes, debouncedSearch, selectedTags, sortBy, sortOrder]);

  // Paginação manual
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

  // Estados de loading (simplificados)
  const isPreviousData = false; // Como não temos cache, sempre é false

  // =================== LÓGICA DE LOADING INTELIGENTE ===================
  const showFullSkeleton = isLoading && !isPreviousData && notes.length === 0;
  const showOverlayLoading = isLoading && isPreviousData;
  const showListSkeleton = isLoading && !isPreviousData && debouncedSearch !== searchTerm;

  React.useEffect(() => {
    console.log("🔍 Estados de loading:", {
      isLoading,
      isPreviousData,
      showFullSkeleton,
      showOverlayLoading,
      showListSkeleton,
      notesCount: notes.length,
    });
  }, [
    isLoading,
    isPreviousData,
    showFullSkeleton,
    showOverlayLoading,
    showListSkeleton,
    notes.length,
  ]);

  // Resetar página quando totalPages mudar devido a filtros
  React.useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [currentPage, totalPages]);

  // =================== HANDLERS DE EVENTOS ===================
  const handlePageChange = (newPage: number) => {
    console.log(`📄 Mudando para página ${newPage}`);
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
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

  const handleSortChange = (newSortBy: SortBy, newSortOrder: SortOrder = sortOrder) => {
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedTags([]);
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

      if (newNote) {
        // Redirecionar para a página de edição da nova nota
        router.push(`/app/notes/view/${newNote.id}`);
      }
    } catch (error) {
      console.error("Erro ao criar nota:", error);
      alert("Erro ao criar nova nota. Tente novamente.");
    }
  };

  const handleRefresh = async () => {
    await refreshNotes();
  };

  // Formatar timestamp da última atualização
  const formatLastFetch = () => {
    if (!lastFetch) return "Nunca";
    const now = new Date();
    const diff = Math.floor((now.getTime() - lastFetch.getTime()) / 1000);
    
    if (diff < 60) return "Agora mesmo";
    if (diff < 3600) return `Há ${Math.floor(diff / 60)} min`;
    return lastFetch.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  };

  // =================== COMPUTAÇÕES DERIVADAS ===================
  const availableTags: string[] = [...new Set(allNotes.flatMap((note) => note.tags || []))].sort();

  // =================== RENDER CONDICIONAL SIMPLIFICADO ===================
  if (error) {
    return (
      <div className="flex flex-1 flex-col space-y-6 p-6">
        <div className="rounded-lg border border-neutral-700 bg-neutral-800 p-4 shadow-lg">
          <h2 className="text-2xl font-bold text-white">Notas</h2>
        </div>
        <div className="rounded-lg border border-red-800 bg-red-950/30 p-8 text-center">
          <div className="mb-3 text-xl font-semibold text-red-400">Erro ao carregar notas</div>
          <p className="text-sm text-red-300/80">Erro desconhecido</p>
        </div>
      </div>
    );
  }

  if (showFullSkeleton) {
    return (
      <div className="flex h-full flex-col rounded-lg bg-neutral-950">
        <div className="flex-shrink-0 rounded-lg border-b border-neutral-800 p-4 shadow-lg lg:p-6">
          <div className="animate-pulse">
            <div className="mb-2 h-8 w-1/3 rounded bg-neutral-800"></div>
            <div className="h-4 w-1/2 rounded bg-neutral-800"></div>
          </div>
        </div>
        <div className="flex-1 p-6 lg:p-8">
          <div className="space-y-4">
            {Array.from({ length: itemsPerPage }).map((_, index) => (
              <div key={index} className="animate-pulse">
                <div className="mb-2 h-6 w-3/4 rounded bg-neutral-800"></div>
                <div className="mb-1 h-4 w-full rounded bg-neutral-800"></div>
                <div className="h-4 w-5/6 rounded bg-neutral-800"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col rounded-lg border border-neutral-800 bg-neutral-950">
      {/* =================== HEADER COM LOADING =================== */}
      {showListSkeleton ? (
        <div className="flex-shrink-0 rounded-lg border-b border-neutral-800 p-4 shadow-lg lg:p-6">
          <div className="animate-pulse">
            <div className="mb-2 h-8 w-1/3 rounded bg-neutral-800"></div>
            <div className="h-4 w-1/2 rounded bg-neutral-800"></div>
          </div>
        </div>
      ) : (
        <div className="flex-shrink-0 rounded-lg border-b border-neutral-800 p-4 shadow-lg lg:p-4">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1">
              <h2 className="mb-2 text-2xl font-bold tracking-tight text-white lg:text-2xl">
                Minhas Notas
              </h2>
              <div className="flex items-center gap-2 text-sm">
                {showOverlayLoading ? (
                  <span className="inline-flex items-center gap-2 text-neutral-400">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-yellow-500 border-t-transparent"></div>
                    <span>Atualizando...</span>
                  </span>
                ) : (
                  <div className="flex flex-col gap-1">
                    <p className="text-neutral-400">
                      <span className="font-medium text-neutral-300">
                        Página {pagination.currentPage}
                      </span>{" "}
                      de {pagination.totalPages}
                      <span className="mx-2 text-neutral-600">•</span>
                      <span className="font-medium text-neutral-300">{pagination.total}</span> notas
                      no total
                    </p>
                    <p className="text-xs text-neutral-500">
                      Última atualização: {formatLastFetch()}
                      <span className="mx-2 text-neutral-700">•</span>
                      Próxima em {Math.floor(refreshInterval / 60000)} min
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
              <div className="relative flex-1 lg:flex-initial">
                <Search
                  className="absolute top-1/2 left-3.5 -translate-y-1/2 transform text-neutral-400"
                  size={18}
                />
                <input
                  type="text"
                  placeholder="Buscar notas..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-800 py-2.5 pr-4 pl-11 text-sm text-white placeholder-neutral-500 transition-all focus:border-transparent focus:ring-2 focus:ring-yellow-500 focus:outline-none lg:w-72"
                />
                {searchTerm !== debouncedSearch && (
                  <div className="absolute top-1/2 right-3.5 -translate-y-1/2 transform">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-yellow-500 border-t-transparent"></div>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleRefresh}
                  disabled={isLoading}
                  className="flex items-center justify-center gap-2 rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2.5 text-sm font-medium text-neutral-300 transition-all hover:bg-neutral-700 disabled:opacity-50 sm:px-4"
                  title="Atualizar notas"
                >
                  <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
                  <span className="hidden sm:inline">Atualizar</span>
                </button>
                
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all sm:flex-initial ${
                    showFilters || selectedTags.length > 0
                      ? "bg-yellow-500 text-neutral-950 shadow-lg shadow-yellow-500/20"
                      : "border border-neutral-700 bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
                  }`}
                >
                  <Filter size={16} />
                  <span>Filtros</span>
                  {selectedTags.length > 0 && (
                    <span className="min-w-[20px] rounded-full bg-yellow-600 px-2 py-0.5 text-center text-xs font-semibold text-neutral-950">
                      {selectedTags.length}
                    </span>
                  )}
                </button>

                <button
                  onClick={handleCreateNote}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-yellow-500 px-4 py-2.5 text-sm font-medium text-neutral-950 shadow-lg shadow-yellow-500/20 transition-all hover:bg-yellow-400 sm:flex-initial"
                >
                  <Plus size={16} />
                  <span className="hidden sm:inline">Nova Nota</span>
                  <span className="sm:hidden">Nova</span>
                </button>
              </div>
            </div>
          </div>

          {showFilters && (
            <div className="mt-6 space-y-5 border-t border-neutral-800 pt-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-neutral-300">Filtrar por Tags</span>
                  {selectedTags.length > 0 && (
                    <span className="text-xs text-neutral-500">
                      ({selectedTags.length} selecionada
                      {selectedTags.length > 1 ? "s" : ""})
                    </span>
                  )}
                </div>

                {availableTags.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {availableTags.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => handleTagToggle(tag)}
                        className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-all ${
                          selectedTags.includes(tag)
                            ? "bg-yellow-500 text-neutral-950 shadow-md shadow-yellow-500/20"
                            : "border border-neutral-700 bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-neutral-500">Nenhuma tag disponível</p>
                )}
              </div>

              <div className="space-y-3">
                <span className="flex items-center gap-2 text-sm font-semibold text-neutral-300">
                  <SortAsc size={16} />
                  Ordenar por
                </span>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleSortChange("updated_at", "desc")}
                    className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-sm font-medium transition-all ${
                      sortBy === "updated_at" && sortOrder === "desc"
                        ? "bg-yellow-500 text-neutral-950 shadow-md shadow-yellow-500/20"
                        : "border border-neutral-700 bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
                    }`}
                  >
                    <Clock size={14} />
                    Mais recentes
                  </button>

                  <button
                    onClick={() => handleSortChange("title", "asc")}
                    className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-sm font-medium transition-all ${
                      sortBy === "title" && sortOrder === "asc"
                        ? "bg-yellow-500 text-neutral-950 shadow-md shadow-yellow-500/20"
                        : "border border-neutral-700 bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
                    }`}
                  >
                    <SortAsc size={14} />
                    Alfabética A-Z
                  </button>

                  <button
                    onClick={() => handleSortChange("created_at", "asc")}
                    className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-sm font-medium transition-all ${
                      sortBy === "created_at" && sortOrder === "asc"
                        ? "bg-yellow-500 text-neutral-950 shadow-md shadow-yellow-500/20"
                        : "border border-neutral-700 bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
                    }`}
                  >
                    <Calendar size={14} />
                    Mais antigas
                  </button>
                </div>
              </div>

              {(searchTerm || selectedTags.length > 0) && (
                <div className="flex justify-end pt-2">
                  <button
                    onClick={clearFilters}
                    className="flex items-center gap-2 rounded-lg bg-red-600/90 px-4 py-2 text-sm font-medium text-white shadow-md shadow-red-600/20 transition-all hover:bg-red-600"
                  >
                    <X size={14} />
                    Limpar todos os filtros
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* =================== LISTA DE NOTAS COM SKELETON LOADING =================== */}
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto rounded-lg p-2 shadow-lg lg:p-4">
        {!showListSkeleton && notes.length > 0 && (
          <div
            className={`relative ${
              showOverlayLoading ? "opacity-70" : ""
            } transition-opacity duration-200`}
          >
            {showOverlayLoading && (
              <div className="absolute top-0 right-0 z-10">
                <div className="flex items-center gap-2 rounded-lg bg-yellow-500 px-4 py-2 text-sm font-medium text-neutral-950 shadow-xl shadow-yellow-500/30">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-950 border-t-transparent"></div>
                  Atualizando
                </div>
              </div>
            )}

            {/* Grade responsiva com altura fixa */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {notes.map((note) => (
                <Link key={note.id} href={`/app/notes/view/${note.id}`} className="block">
                  <div className="group flex h-[260px] flex-col rounded-xl border border-neutral-800 bg-neutral-950 p-4 transition-all duration-200 hover:border-neutral-700 hover:bg-neutral-900 sm:h-[260px] sm:p-5">
                    {/* Cabeçalho: data + tags */}
                    <div className="mb-3 flex flex-shrink-0 flex-col gap-2">
                      {/* Data */}
                      {note.updated_at && (
                        <span className="text-xs font-medium text-neutral-500">
                          {new Date(note.updated_at).toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      )}

                      {/* Tags */}
                      {note.tags && note.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {note.tags.slice(0, 2).map((tag, index) => (
                            <span
                              key={index}
                              className="rounded-full border border-yellow-500/30 bg-yellow-500/20 px-2.5 py-1 text-[10px] font-medium text-yellow-400 sm:text-xs"
                            >
                              {tag}
                            </span>
                          ))}
                          {note.tags.length > 2 && (
                            <span className="rounded-full bg-neutral-800 px-2 py-1 text-[10px] text-neutral-500 sm:text-xs">
                              +{note.tags.length - 2}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Título */}
                    <h3 className="mb-3 line-clamp-2 flex-shrink-0 text-sm leading-tight font-semibold text-white transition-colors group-hover:text-yellow-400 sm:text-base lg:text-lg">
                      {note.title || "Nota sem título"}
                    </h3>

                    {/* Descrição - ocupa espaço flexível */}
                    <div className="mb-4 flex-1">
                      {note.description && (
                        <p className="line-clamp-4 text-xs leading-relaxed text-neutral-400 sm:text-sm">
                          {note.description.length > 120
                            ? note.description.substring(0, 120) + "..."
                            : note.description}
                        </p>
                      )}
                    </div>

                    {/* Colaboradores - fixo no final */}
                    {note.collaborators && note.collaborators.length > 0 && (
                      <div className="flex flex-shrink-0 items-center justify-between border-t border-neutral-800/50 pt-3">
                        <div className="flex -space-x-2">
                          {note.collaborators.slice(0, 3).map((collab, index) => {
                            const displayName = getCollaboratorDisplayName(collab);
                            const avatarUrl = getCollaboratorAvatarUrl(collab);
                            return (
                              <div
                                key={index}
                                className="relative flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border-2 border-neutral-800 bg-yellow-500 shadow-sm sm:h-8 sm:w-8"
                                title={displayName}
                              >
                                {avatarUrl ? (
                                  <Image
                                    width={32}
                                    height={32}
                                    src={avatarUrl}
                                    alt={displayName}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <span className="text-xs font-semibold text-neutral-950">
                                    {displayName.charAt(0).toUpperCase()}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                          {note.collaborators.length > 3 && (
                            <div className="relative flex h-7 w-7 items-center justify-center rounded-full border-2 border-neutral-800 bg-neutral-700 shadow-sm sm:h-8 sm:w-8">
                              <span className="text-[10px] font-semibold text-neutral-300 sm:text-xs">
                                +{note.collaborators.length - 3}
                              </span>
                            </div>
                          )}
                        </div>
                        <span className="text-[10px] text-neutral-500 sm:text-xs">
                          {note.collaborators.length} colaborador
                          {note.collaborators.length > 1 ? "es" : ""}
                        </span>
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* =================== PAGINAÇÃO COM SKELETON =================== */}
      {pagination.totalPages > 1 && (
        <div className="flex-shrink-0 border-t border-neutral-800 bg-neutral-800/50">
          {showListSkeleton ? (
            <div className="px-6 py-4">
              <div className="flex animate-pulse items-center justify-center">
                <div className="h-8 w-32 rounded bg-neutral-800"></div>
              </div>
            </div>
          ) : (
            <Pagination
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              totalItems={pagination.total}
              itemsPerPage={itemsPerPage}
              onPageChange={handlePageChange}
              showInfo={true}
              className="px-6"
            />
          )}
        </div>
      )}
    </div>
  );
};

export default NotesWithPagination;
