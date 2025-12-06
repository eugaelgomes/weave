"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Search, Filter, Plus, X, SortAsc, RefreshCw, Loader2 } from "lucide-react";

// =================== IMPORTS DE CONTEXTO E UTILS ===================
import { useNotes } from "../../contexts/NotesContext";
import { getCollaboratorDisplayName, getCollaboratorAvatarUrl } from "@/app/utils/collaborators";
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

  // =================== ESTADOS (MANTIDOS ORIGINAIS) ===================
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState<boolean>(false);

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage] = useState<number>(12); // Ajustado levemente para grids 3x4 ou 4x3

  const [sortBy, setSortBy] = useState<SortBy>("updated_at");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  // =================== HOOK DE DADOS (MANTIDO) ===================
  const {
    notes: allNotes,
    loading: isLoading,
    error,
    createNote,
    refreshNotes,
    lastFetch,
  } = useNotes();

  const debouncedSearch = searchTerm; // Simulação do debounce original

  // =================== LÓGICA DE FILTRAGEM (MANTIDA IDÊNTICA) ===================
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

  // Estados de Loading (Lógica Original)
  const isPreviousData = false;
  const showFullSkeleton = isLoading && !isPreviousData && notes.length === 0;
  const showOverlayLoading = isLoading && isPreviousData;
  const showListSkeleton = isLoading && !isPreviousData && debouncedSearch !== searchTerm;

  // Reset de página ao filtrar
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [currentPage, totalPages]);

  // =================== HANDLERS (MANTIDOS) ===================
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    // window.scrollTo removido para SPA feel, ou manter se preferir
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
      if (newNote) router.push(`/app/notes/view/${newNote.id}`);
    } catch (error) {
      console.error("Erro:", error);
      alert("Erro ao criar nova nota.");
    }
  };

  const handleRefresh = async () => {
    await refreshNotes();
  };

  const formatLastFetch = () => {
    if (!lastFetch) return "Nunca";
    const now = new Date();
    const diff = Math.floor((now.getTime() - lastFetch.getTime()) / 1000);
    if (diff < 60) return "Agora";
    if (diff < 3600) return `Há ${Math.floor(diff / 60)} min`;
    return lastFetch.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  };

  const availableTags: string[] = [...new Set(allNotes.flatMap((note) => note.tags || []))].sort();

  // =================== RENDER ===================

  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="text-center">
          <p className="font-medium text-red-400">Erro ao carregar notas</p>
          <button
            onClick={handleRefresh}
            className="mt-2 text-sm text-neutral-400 underline hover:text-white"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-neutral-950">
      {/* =================== HEADER / TOOLBAR =================== */}
      {/* Design aprimorado: Toolbar densa e técnica em vez de cabeçalho grande */}
      <div className="flex flex-col border-b border-neutral-800 bg-neutral-950 px-4 py-2 sm:px-6">
        {/* Linha 1: Título e Ações Principais */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-md font-semibold text-neutral-100">Notas</h2>
            <div className="hidden h-2 w-px bg-neutral-800 sm:block"></div>
            <div className="hidden items-center gap-2 text-xs text-neutral-500 sm:flex">
              <span>{pagination.total} notas</span>
              <span>•</span>
              <span title={`Atualizado às ${lastFetch?.toLocaleTimeString()}`}>
                Atualizado: {formatLastFetch()}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Search Input Compacto */}
            <div className="relative flex-1 sm:w-64 sm:flex-none">
              <Search
                className="absolute top-1/2 left-2.5 -translate-y-1/2 text-neutral-500"
                size={14}
              />
              <input
                type="text"
                placeholder="Buscar..."
                value={searchTerm}
                onChange={handleSearchChange}
                className="h-6 w-full rounded border border-neutral-800 bg-neutral-900 pr-8 pl-8 text-xs text-neutral-200 placeholder-neutral-500 focus:border-neutral-600 focus:ring-1 focus:ring-neutral-600 focus:outline-none"
              />
              {(searchTerm !== debouncedSearch || isLoading) && (
                <div className="absolute top-1/2 right-2.5 -translate-y-1/2">
                  <Loader2 size={12} className="animate-spin text-neutral-500" />
                </div>
              )}
            </div>

            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="flex h-6 w-8 items-center justify-center rounded border border-neutral-800 bg-neutral-900 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200 disabled:opacity-50"
              title="Atualizar"
            >
              <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
            </button>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex h-6 items-center gap-2 rounded border px-3 text-xs font-medium transition-colors ${
                showFilters || selectedTags.length > 0
                  ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-500"
                  : "border-neutral-800 bg-neutral-900 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200"
              }`}
            >
              <Filter size={14} />
              <span className="hidden sm:inline">Filtros</span>
              {selectedTags.length > 0 && (
                <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-yellow-500 px-1 text-[9px] font-bold text-neutral-950">
                  {selectedTags.length}
                </span>
              )}
            </button>

            <button
              onClick={handleCreateNote}
              className="flex h-6 items-center gap-2 rounded bg-yellow-500 px-3 text-xs font-semibold text-neutral-950 transition-all hover:bg-yellow-400 active:scale-95"
            >
              <Plus size={14} />
              <span>Nova</span>
            </button>
          </div>
        </div>

        {/* Linha 2: Painel de Filtros (Expansível) */}
        {showFilters && (
          <div className="animate-in slide-in-from-top-1 mt-3 border-t border-neutral-800 pt-3">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              {/* Tags */}
              <div className="flex-1 space-y-2">
                <span className="text-[10px] font-medium tracking-wider text-neutral-500 uppercase">
                  Tags
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {availableTags.length > 0 ? (
                    availableTags.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => handleTagToggle(tag)}
                        className={`rounded border px-2 py-1 text-[10px] font-medium transition-colors ${
                          selectedTags.includes(tag)
                            ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-500"
                            : "border-neutral-800 bg-neutral-900 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200"
                        }`}
                      >
                        {tag}
                      </button>
                    ))
                  ) : (
                    <span className="text-xs text-neutral-600">Nenhuma tag encontrada.</span>
                  )}
                </div>
              </div>

              {/* Ordenação */}
              <div className="min-w-[200px] space-y-2">
                <span className="text-[10px] font-medium tracking-wider text-neutral-500 uppercase">
                  Ordenar
                </span>
                <div className="flex gap-2">
                  <select
                    value={sortBy}
                    onChange={(e) => handleSortChange(e.target.value as SortBy)}
                    className="h-7 flex-1 rounded border border-neutral-800 bg-neutral-900 px-2 text-xs text-neutral-300 focus:border-neutral-600 focus:outline-none"
                  >
                    <option value="updated_at">Atualização</option>
                    <option value="created_at">Criação</option>
                    <option value="title">Título</option>
                  </select>
                  <button
                    onClick={() => setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))}
                    className="flex h-7 w-7 items-center justify-center rounded border border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-neutral-200"
                  >
                    {sortOrder === "asc" ? (
                      <SortAsc size={14} className="rotate-180" />
                    ) : (
                      <SortAsc size={14} />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Limpar Filtros */}
            {(searchTerm || selectedTags.length > 0) && (
              <div className="mt-3 flex justify-end border-t border-neutral-800/50 pt-2">
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-1.5 text-[10px] text-red-400 hover:text-red-300"
                >
                  <X size={10} /> Limpar Filtros
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* =================== CONTEÚDO (GRID) =================== */}
      {/* Container com scroll */}
      <div id="notes-container" className="flex-1 overflow-y-auto bg-neutral-950 p-4 sm:p-6">
        {/* Skeleton Loading Inicial */}
        {showFullSkeleton || showListSkeleton ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: itemsPerPage }).map((_, i) => (
              <div
                key={i}
                className="h-44 animate-pulse rounded border border-neutral-800 bg-neutral-900/30 p-4"
              >
                <div className="mb-4 h-4 w-3/4 rounded bg-neutral-800"></div>
                <div className="space-y-2">
                  <div className="h-3 w-full rounded bg-neutral-800"></div>
                  <div className="h-3 w-5/6 rounded bg-neutral-800"></div>
                </div>
                <div className="mt-8 flex gap-2">
                  <div className="h-5 w-12 rounded bg-neutral-800"></div>
                  <div className="h-5 w-12 rounded bg-neutral-800"></div>
                </div>
              </div>
            ))}
          </div>
        ) : notes.length > 0 ? (
          <div className="relative">
            {/* Overlay Loading (Refresh sutil) */}
            {showOverlayLoading && (
              <div className="absolute inset-0 z-10 flex items-start justify-center bg-neutral-950/50 pt-10 backdrop-blur-[1px]">
                <div className="flex items-center gap-2 rounded-full border border-neutral-800 bg-neutral-900 px-4 py-2 text-xs font-medium text-neutral-300 shadow-xl">
                  <Loader2 size={12} className="animate-spin text-yellow-500" />
                  Atualizando...
                </div>
              </div>
            )}

            {/* GRID DE CARDS REFORMULADOS */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {notes.map((note) => (
                <Link
                  key={note.id}
                  href={`/app/notes/view/${note.id}`}
                  className="group block h-full"
                >
                  <article className="flex h-48 flex-col justify-between rounded border border-neutral-800 bg-neutral-900/20 p-4 transition-all hover:border-neutral-600 hover:bg-neutral-900 hover:shadow-sm">
                    {/* Topo do Card */}
                    <div>
                      <div className="mb-2 flex items-start justify-between gap-3">
                        <h3 className="line-clamp-2 text-sm font-medium text-neutral-200 transition-colors group-hover:text-yellow-500">
                          {note.title || "Sem título"}
                        </h3>
                        {note.updated_at && (
                          <span className="shrink-0 text-[10px] whitespace-nowrap text-neutral-600">
                            {new Date(note.updated_at).toLocaleDateString("pt-BR", {
                              day: "2-digit",
                              month: "short",
                            })}
                          </span>
                        )}
                      </div>

                      <p className="line-clamp-3 text-xs leading-relaxed text-neutral-500 transition-colors group-hover:text-neutral-400">
                        {note.description || "Sem descrição..."}
                      </p>
                    </div>

                    {/* Rodapé do Card */}
                    <div className="mt-auto flex items-end justify-between gap-2 border-t border-neutral-800/50 pt-4">
                      {/* Tags (Estilo Pill discreto) */}
                      <div className="flex h-5 flex-wrap gap-1.5 overflow-hidden">
                        {note.tags?.slice(0, 2).map((tag, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center rounded border border-neutral-800 bg-neutral-900 px-1.5 py-0.5 text-[9px] font-medium text-neutral-400"
                          >
                            {tag}
                          </span>
                        ))}
                        {(note.tags?.length || 0) > 2 && (
                          <span className="text-[9px] text-neutral-600">
                            +{note.tags!.length - 2}
                          </span>
                        )}
                      </div>

                      {/* Colaboradores (Mini Avatar sobreposto) */}
                      {note.collaborators && note.collaborators.length > 0 && (
                        <div className="flex -space-x-1.5 pl-2">
                          {note.collaborators.slice(0, 3).map((c, i) => {
                            const avatar = getCollaboratorAvatarUrl(c);
                            const name = getCollaboratorDisplayName(c);
                            return (
                              <div
                                key={i}
                                className="relative flex h-5 w-5 items-center justify-center overflow-hidden rounded-full border border-neutral-900 bg-neutral-800"
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
                                  <span className="text-[8px] font-bold text-neutral-500">
                                    {name.charAt(0)}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          </div>
        ) : (
          // Empty State
          <div className="flex h-full flex-col items-center justify-center text-center opacity-60">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-neutral-900 text-neutral-600">
              <Search size={20} />
            </div>
            <h3 className="text-sm font-medium text-neutral-300">Nenhuma nota encontrada</h3>
            <p className="mt-1 mb-4 max-w-xs text-xs text-neutral-500">
              Não encontramos notas com os filtros atuais.
            </p>
            <button onClick={clearFilters} className="text-xs text-yellow-500 hover:underline">
              Limpar todos os filtros
            </button>
          </div>
        )}
      </div>

      {/* =================== FOOTER / PAGINAÇÃO =================== */}
      {totalPages > 1 && (
        <div className="border-t border-neutral-800 bg-neutral-950">
          <Pagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            totalItems={pagination.total}
            itemsPerPage={itemsPerPage}
            onPageChange={handlePageChange}
            showInfo={false} // Minimalista
            className="justify-center"
          />
        </div>
      )}
    </div>
  );
};

export default NotesWithPagination;
