"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Search, Filter, Plus, X, SortAsc, RefreshCw, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { useNotes } from "@/app/_contexts/notes-context";
import { useProjects } from "@/app/_contexts/projects-context";
import { usePlanUsage } from "@/app/_contexts/plan-usage-context";
import { ApiError } from "@/app/_services/api-error";
import { getCollaboratorDisplayName, getCollaboratorAvatarUrl } from "@/app/_utils/collaborators";
import { getTagColor } from "@/app/_utils/tag-colors";
import Pagination from "@/app/(protected)/_components/ui/notes/pagination";
import { formatDate } from "@/app/_utils/format";
import { routes } from "@/app/_utils/routes";
import { FiCheckSquare } from "react-icons/fi";

interface PaginationData {
  currentPage: number;
  totalPages: number;
  total: number;
}

type SortBy = "updated_at" | "title" | "created_at";
type SortOrder = "asc" | "desc";

type DueDatePreset =
  | "none"
  | "this_week"
  | "this_month"
  | "this_quarter"
  | "this_semester"
  | "this_year";

interface StageFilterOption {
  id: string;
  name: string;
  projectId: string;
  projectName: string;
  color: string | null;
}

interface PriorityFilterOption {
  id: string;
  name: string;
  projectId: string;
  projectName: string;
  colorHex: string | null;
}

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function endOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

function getDueDatePresetRange(preset: DueDatePreset): { start: Date; end: Date } | null {
  if (preset === "none") return null;

  const now = new Date();

  switch (preset) {
    case "this_week": {
      const day = now.getDay();
      const diffToMonday = day === 0 ? -6 : 1 - day;
      const monday = new Date(now);
      monday.setDate(now.getDate() + diffToMonday);
      const start = startOfLocalDay(monday);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      const end = endOfLocalDay(sunday);
      return { start, end };
    }
    case "this_month": {
      const start = startOfLocalDay(new Date(now.getFullYear(), now.getMonth(), 1));
      const end = endOfLocalDay(new Date(now.getFullYear(), now.getMonth() + 1, 0));
      return { start, end };
    }
    case "this_quarter": {
      const q = Math.floor(now.getMonth() / 3);
      const start = startOfLocalDay(new Date(now.getFullYear(), q * 3, 1));
      const end = endOfLocalDay(new Date(now.getFullYear(), q * 3 + 3, 0));
      return { start, end };
    }
    case "this_semester": {
      const startMonth = now.getMonth() < 6 ? 0 : 6;
      const endMonth = startMonth === 0 ? 5 : 11;
      const start = startOfLocalDay(new Date(now.getFullYear(), startMonth, 1));
      const end = endOfLocalDay(new Date(now.getFullYear(), endMonth + 1, 0));
      return { start, end };
    }
    case "this_year": {
      const start = startOfLocalDay(new Date(now.getFullYear(), 0, 1));
      const end = endOfLocalDay(new Date(now.getFullYear(), 11, 31));
      return { start, end };
    }
    default:
      return null;
  }
}

function dueDateInRange(
  due: string | null | undefined,
  range: { start: Date; end: Date }
): boolean {
  if (!due) return false;
  const t = new Date(due).getTime();
  if (Number.isNaN(t)) return false;
  return t >= range.start.getTime() && t <= range.end.getTime();
}

const DUE_DATE_PRESETS: { id: DueDatePreset; label: string }[] = [
  { id: "none", label: "Qualquer data" },
  { id: "this_week", label: "Esta semana" },
  { id: "this_month", label: "Este mês" },
  { id: "this_quarter", label: "Este trimestre" },
  { id: "this_semester", label: "Este semestre" },
  { id: "this_year", label: "Este ano" },
];

function formatShortDate(date: string | null | undefined): string {
  if (!date) return "—";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).format(parsed);
}

const NotesWithPagination = () => {
  const router = useRouter();
  const params = useParams();
  const orgId = params?.orgId as string;

  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedCollaborators, setSelectedCollaborators] = useState<string[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [selectedStageIds, setSelectedStageIds] = useState<string[]>([]);
  const [selectedPriorityIds, setSelectedPriorityIds] = useState<string[]>([]);
  const [dueDatePreset, setDueDatePreset] = useState<DueDatePreset>("none");
  const [stageOptions, setStageOptions] = useState<StageFilterOption[]>([]);
  const [priorityOptions, setPriorityOptions] = useState<PriorityFilterOption[]>([]);
  const [taxonomyLoading, setTaxonomyLoading] = useState(false);
  const [showFilters, setShowFilters] = useState<boolean>(false);

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage] = useState<number>(10);

  const [sortBy, setSortBy] = useState<SortBy>("updated_at");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  const [selectionMode, setSelectionMode] = useState<boolean>(false);
  const [selectedNotes, setSelectedNotes] = useState<Set<string>>(new Set());

  const {
    notes: allNotes,
    loading: isLoading,
    error,
    createNote,
    refreshNotes,
    deleteNotes,
  } = useNotes();

  const { canCreateNote } = usePlanUsage();

  const { projects, refreshProjects, getProjectStages, getTaskPriorities } = useProjects();

  const debouncedSearch = searchTerm;

  React.useEffect(() => {
    if (projects.length === 0) {
      void refreshProjects();
    }
  }, [projects.length, refreshProjects]);

  const projectsForFilter = React.useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    allNotes.forEach((note) => {
      if (note.project_id && note.project_name) {
        map.set(note.project_id, { id: note.project_id, name: note.project_name });
      }
    });
    projects.forEach((p) => {
      if (!map.has(p.id)) {
        map.set(p.id, { id: p.id, name: p.title });
      }
    });
    return Array.from(map.values()).sort((a, b) =>
      a.name.toLowerCase().localeCompare(b.name.toLowerCase())
    );
  }, [allNotes, projects]);

  React.useEffect(() => {
    let cancelled = false;

    const loadTaxonomy = async () => {
      if (selectedProjects.length === 0) {
        setStageOptions([]);
        setPriorityOptions([]);
        setSelectedStageIds([]);
        setSelectedPriorityIds([]);
        setTaxonomyLoading(false);
        return;
      }

      setTaxonomyLoading(true);
      const stages: StageFilterOption[] = [];
      const priorities: PriorityFilterOption[] = [];

      try {
        for (const pid of selectedProjects) {
          const projectName = projectsForFilter.find((p) => p.id === pid)?.name || "";

          try {
            const [sList, pList] = await Promise.all([
              getProjectStages(pid),
              getTaskPriorities(pid),
            ]);

            for (const st of sList) {
              stages.push({
                id: st.id,
                name: st.name,
                projectId: pid,
                projectName,
                color: st.color,
              });
            }
            for (const pr of pList) {
              if (pr.deleted === true) continue;
              priorities.push({
                id: pr.id,
                name: pr.name,
                projectId: pid,
                projectName,
                colorHex: pr.color_hex,
              });
            }
          } catch {
            /* já logado no contexto */
          }
        }

        if (!cancelled) {
          setStageOptions(stages);
          setPriorityOptions(priorities);
          setSelectedStageIds((prev) => prev.filter((id) => stages.some((s) => s.id === id)));
          setSelectedPriorityIds((prev) =>
            prev.filter((id) => priorities.some((p) => p.id === id))
          );
        }
      } finally {
        if (!cancelled) {
          setTaxonomyLoading(false);
        }
      }
    };

    void loadTaxonomy();
    return () => {
      cancelled = true;
    };
  }, [selectedProjects, getProjectStages, getTaskPriorities, projectsForFilter]);

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

    // Estágios (projeto associado)
    if (selectedStageIds.length > 0) {
      result = result.filter((note) => {
        const sid = note.associated_project?.stage_id;
        return sid && selectedStageIds.includes(sid);
      });
    }

    // Prioridades
    if (selectedPriorityIds.length > 0) {
      result = result.filter(
        (note) => note.priority_id && selectedPriorityIds.includes(note.priority_id)
      );
    }

    // Vencimento (intervalo por preset)
    const dueRange = getDueDatePresetRange(dueDatePreset);
    if (dueRange) {
      result = result.filter((note) => dueDateInRange(note.due_date, dueRange));
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
    selectedStageIds,
    selectedPriorityIds,
    dueDatePreset,
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

  const handleStageToggle = (stageId: string) => {
    setSelectedStageIds((prev) => {
      const next = prev.includes(stageId) ? prev.filter((s) => s !== stageId) : [...prev, stageId];
      setCurrentPage(1);
      return next;
    });
  };

  const handlePriorityToggle = (priorityId: string) => {
    setSelectedPriorityIds((prev) => {
      const next = prev.includes(priorityId)
        ? prev.filter((p) => p !== priorityId)
        : [...prev, priorityId];
      setCurrentPage(1);
      return next;
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
    setSelectedStageIds([]);
    setSelectedPriorityIds([]);
    setDueDatePreset("none");
    setCurrentPage(1);
    setShowFilters(false);
  };

  const handleCreateNote = async () => {
    if (!canCreateNote) {
      toast.error("Limite do Plano Atingido", {
        description: "Você atingiu o limite de tarefas do seu plano.",
        duration: 6000,
        action: {
          label: "Ver Planos",
          onClick: () => router.push(`/${orgId}/settings/plans`),
        },
      });
      return;
    }
    try {
      const newNote = await createNote({
        title: "Nova Tarefa",
        description: "",
        tags: [],
      });
      if (newNote) router.push(routes.notes.details(orgId, newNote.public_id || newNote.id));
    } catch (error: unknown) {
      console.error("Erro:", error);

      const isPlanLimit =
        error instanceof ApiError &&
        error.status === 403 &&
        error.data &&
        typeof error.data === "object" &&
        "code" in error.data &&
        (error.data as { code?: string }).code === "PLAN_LIMIT_EXCEEDED";

      if (
        isPlanLimit ||
        (error instanceof Error &&
          (error.message.includes("permite apenas") || error.message.includes("plano")))
      ) {
        toast.error("Limite do Plano Atingido", {
          description: error instanceof Error ? error.message : "Limite do plano atingido.",
          duration: 6000,
          action: {
            label: "Ver Planos",
            onClick: () => router.push(`/${orgId}/settings/plans`),
          },
        });
      } else {
        toast.error("Erro ao criar tarefa", {
          description:
            error instanceof Error
              ? error.message
              : "Ocorreu um erro ao criar a tarefa. Tente novamente.",
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
      `Tem certeza que deseja excluir ${selectedNotes.size} tarefa(s)?`
    );

    if (confirmed) {
      const noteIds = Array.from(selectedNotes);
      const ok = await deleteNotes(noteIds);
      if (!ok) {
        alert("Erro ao excluir tarefas selecionadas.");
        return;
      }
      setSelectedNotes(new Set());
      setSelectionMode(false);
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

  const activeFilterCount =
    selectedTags.length +
    selectedCollaborators.length +
    selectedProjects.length +
    selectedStageIds.length +
    selectedPriorityIds.length +
    (dueDatePreset !== "none" ? 1 : 0);

  /** Barra superior: mesmo tamanho/padding para busca + todos os botões */
  const toolbarIconBtn =
    "inline-flex size-6 shrink-0 items-center justify-center rounded-sm border p-0.5 leading-none transition-colors focus-visible:ring-1 focus-visible:ring-yellow-500 focus-visible:outline-none disabled:opacity-50";
  const toolbarTextBtn =
    "inline-flex h-6 min-h-6 shrink-0 items-center justify-center gap-0.5 rounded-sm border px-0.5 py-0.5 text-[10px] font-medium leading-none transition-colors focus-visible:ring-1 focus-visible:ring-yellow-500 focus-visible:outline-none";
  const toolbarSearchInput =
    "box-border h-6 min-h-6 w-full rounded-sm border border-neutral-200 bg-white py-0.5 pr-4 pl-5 text-[10px] leading-tight text-neutral-900 placeholder:text-neutral-400 transition-all focus:border-yellow-500 focus:bg-white focus:ring-1 focus:ring-yellow-500 focus:outline-none dark:border-surface-dark-border dark:bg-[#1d1d1b] dark:text-neutral-100 dark:placeholder:text-neutral-500 dark:focus:border-yellow-500/50";

  // =================== RENDER ===================

  if (error) {
    return (
      <div className="flex h-full items-center justify-center bg-neutral-50 p-6 dark:bg-[#1d1d1b]">
        <div className="text-center">
          <p className="font-medium text-red-500 dark:text-red-400">Erro ao carregar tarefas</p>
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
    <div className="flex min-h-0 flex-1 flex-col gap-1">
      {/* =================== FILTROS + TOOLBAR + CABEÇALHO COLUNAS =================== */}
      <div className="dark:shadow-surface-dark-sm dark:border-surface-dark-border border-b border-neutral-200 bg-white shadow-sm dark:bg-[#1d1d1b]">
        {/* Container com padding y de 1 orgânico */}
        <div className="dark:border-surface-dark-border flex flex-col border-b border-neutral-100 px-2 py-1">
          <div className="flex flex-wrap items-center justify-between gap-3 sm:flex-nowrap">
            {/* Lado Esquerdo: Registros & Check */}
            <div className="order-1 flex shrink-0 items-center gap-2">
              <div className="flex items-center gap-0.5 px-1 text-[10px] text-neutral-500">
                <span className="font-semibold text-neutral-900 dark:text-neutral-200">
                  {pagination.total}
                </span>
                <span className="hidden sm:inline">registros</span>
              </div>
              <button
                type="button"
                onClick={toggleSelectionMode}
                title="Modo de seleção"
                // Altura orgânica com p-0.5
                className={`flex items-center justify-center rounded p-0.5 ${toolbarIconBtn} ${
                  selectionMode
                    ? "dark:bg-brand-primary-500/10 dark:text-brand-primary-500 border-yellow-500 bg-yellow-50 text-yellow-700 dark:border-yellow-500/30"
                    : "dark:border-surface-dark-border dark:hover:border-surface-dark-border-strong border-neutral-200 bg-white text-neutral-500 hover:border-neutral-300 hover:bg-neutral-100 hover:text-neutral-900 dark:bg-[#1d1d1b] dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
                }`}
              >
                <FiCheckSquare size={11} />
              </button>
            </div>

            {/* Centro: Busca */}
            <div className="relative order-3 w-full min-w-[140px] flex-1 sm:order-2 sm:w-auto sm:max-w-xs">
              <Search
                className="pointer-events-none absolute top-1/2 left-2 -translate-y-1/2 text-neutral-400"
                size={11}
                aria-hidden
              />
              <input
                type="search"
                enterKeyHint="search"
                placeholder="Buscar tarefas..."
                value={searchTerm}
                onChange={handleSearchChange}
                // Altura orgânica com py-0.5
                className={`w-full py-0.5 pr-6 pl-6 text-[11px] ${toolbarSearchInput}`}
              />
              {(searchTerm !== debouncedSearch || isLoading) && (
                <div className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2">
                  <Loader2 size={11} className="animate-spin text-neutral-400" />
                </div>
              )}
            </div>

            {/* Lado Direito: Ações */}
            <div className="order-2 flex shrink-0 items-center gap-1.5 sm:order-3">
              <button
                type="button"
                onClick={handleRefresh}
                disabled={isLoading}
                title="Atualizar"
                // p-0.5 para botão de ícone
                className={`flex items-center justify-center rounded p-0.5 ${toolbarIconBtn} dark:border-surface-dark-border dark:hover:border-surface-dark-border-strong border-neutral-200 bg-white text-neutral-500 hover:border-neutral-300 hover:text-neutral-900 dark:bg-[#1d1d1b] dark:text-neutral-400 dark:hover:text-neutral-200`}
              >
                <RefreshCw size={11} className={isLoading ? "animate-spin" : ""} />
              </button>

              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                // py-0.5 px-2 para botões de texto
                className={`flex items-center gap-1 rounded px-2 py-0.5 text-[11px] ${toolbarTextBtn} ${
                  showFilters || activeFilterCount > 0
                    ? "dark:bg-brand-primary-500/10 dark:text-brand-primary-500 border-yellow-500 bg-yellow-50 text-yellow-700 dark:border-yellow-500/30"
                    : "dark:border-surface-dark-border dark:hover:border-surface-dark-border-strong border-neutral-200 bg-white font-medium text-neutral-600 hover:border-neutral-300 hover:text-neutral-900 dark:bg-[#1d1d1b] dark:text-neutral-400 dark:hover:text-neutral-200"
                }`}
              >
                <Filter size={11} className="shrink-0" />
                <span className="hidden sm:inline">Filtrar</span>
                {activeFilterCount > 0 && (
                  <span className="bg-brand-primary-500 flex min-w-[14px] items-center justify-center rounded-full p-0.5 text-[8px] leading-none font-bold text-white">
                    {activeFilterCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={handleCreateNote}
                title={!canCreateNote ? "Limite de tarefas do plano atingido" : undefined}
                className={`flex items-center gap-1 rounded px-2 py-0.5 text-[11px] ${toolbarTextBtn} bg-brand-primary-500 dark:bg-brand-primary-500 border-neutral-900 font-semibold text-white shadow-sm hover:bg-neutral-800 active:scale-[0.98] dark:border-neutral-200 dark:text-neutral-950 dark:hover:bg-neutral-200 ${
                  !canCreateNote ? "cursor-not-allowed opacity-50" : ""
                }`}
              >
                <Plus size={11} className="shrink-0" />
                <span className="hidden sm:inline">Criar</span>
              </button>
            </div>
          </div>
        </div>

        {/* Painel de Filtros */}
        {showFilters && (
          <div className="animate-in slide-in-from-top-1 dark:border-surface-dark-border-strong mx-1 mt-1 mb-1 max-h-[60vh] overflow-y-auto rounded border border-neutral-200 bg-white p-2 dark:bg-[#1d1d1b]">
            <div className="flex flex-col gap-1.5">
              {/* Projetos */}
              {projectsForFilter.length > 0 && (
                <div className="dark:border-surface-dark-border space-y-1 rounded border border-neutral-100 bg-neutral-50 p-1.5 dark:bg-[#1d1d1b]/80">
                  <span className="px-0.5 text-[9px] font-semibold tracking-wider text-neutral-500">
                    Projetos ({projectsForFilter.length})
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {projectsForFilter.map((project) => (
                      <button
                        key={project.id}
                        onClick={() => handleProjectToggle(project.id)}
                        className={`flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors ${
                          selectedProjects.includes(project.id)
                            ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-neutral-50 dark:text-neutral-950"
                            : "dark:border-surface-dark-border dark:hover:border-surface-dark-border-strong border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300 hover:bg-neutral-50 dark:bg-[#1d1d1b] dark:text-neutral-400 dark:hover:bg-neutral-800"
                        }`}
                      >
                        {project.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Estágios */}
              {selectedProjects.length > 0 && (
                <div className="dark:border-surface-dark-border space-y-1 rounded border border-neutral-100 bg-neutral-50 p-1.5 dark:bg-[#1d1d1b]/80">
                  <span className="px-0.5 text-[9px] font-semibold tracking-wider text-neutral-500">
                    Estágios
                    {taxonomyLoading ? (
                      <span className="ml-1 font-normal text-neutral-400">(carregando…)</span>
                    ) : (
                      <span className="ml-1 font-normal text-neutral-400">
                        ({stageOptions.length})
                      </span>
                    )}
                  </span>
                  {!taxonomyLoading && stageOptions.length === 0 && (
                    <p className="px-0.5 text-[10px] text-neutral-400">
                      Nenhum estágio neste(s) projeto(s).
                    </p>
                  )}
                  <div className="flex flex-wrap gap-1">
                    {stageOptions.map((st) => {
                      const multi = selectedProjects.length > 1;
                      const label = multi ? `${st.projectName}: ${st.name}` : st.name;
                      return (
                        <button
                          key={`${st.projectId}-${st.id}`}
                          type="button"
                          title={label}
                          onClick={() => handleStageToggle(st.id)}
                          className={`flex max-w-full items-center truncate rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors ${
                            selectedStageIds.includes(st.id)
                              ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-neutral-50 dark:text-neutral-950"
                              : "dark:border-surface-dark-border dark:hover:border-surface-dark-border-strong border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300 dark:bg-[#1d1d1b] dark:text-neutral-400"
                          }`}
                        >
                          {multi ? (
                            <>
                              <span className="text-neutral-500 dark:text-neutral-400">
                                {st.projectName}
                              </span>
                              <span className="mx-1 text-neutral-300 dark:text-neutral-600">·</span>
                              <span>{st.name}</span>
                            </>
                          ) : (
                            st.name
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Prioridades */}
              {selectedProjects.length > 0 && (
                <div className="dark:border-surface-dark-border space-y-1 rounded border border-neutral-100 bg-neutral-50 p-1.5 dark:bg-[#1d1d1b]/80">
                  <span className="px-0.5 text-[9px] font-semibold tracking-wider text-neutral-500">
                    Prioridades
                    {taxonomyLoading ? (
                      <span className="ml-1 font-normal text-neutral-400">(carregando…)</span>
                    ) : (
                      <span className="ml-1 font-normal text-neutral-400">
                        ({priorityOptions.length})
                      </span>
                    )}
                  </span>
                  {!taxonomyLoading && priorityOptions.length === 0 && (
                    <p className="px-0.5 text-[10px] text-neutral-400">
                      Nenhuma prioridade neste(s) projeto(s).
                    </p>
                  )}
                  <div className="flex flex-wrap gap-1">
                    {priorityOptions.map((pr) => {
                      const multi = selectedProjects.length > 1;
                      return (
                        <button
                          key={`${pr.projectId}-${pr.id}`}
                          type="button"
                          onClick={() => handlePriorityToggle(pr.id)}
                          className={`flex max-w-full items-center gap-1 truncate rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors ${
                            selectedPriorityIds.includes(pr.id)
                              ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-neutral-50 dark:text-neutral-950"
                              : "dark:border-surface-dark-border dark:hover:border-surface-dark-border-strong border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300 dark:bg-[#1d1d1b] dark:text-neutral-400"
                          }`}
                        >
                          <span
                            className="h-1.5 w-1.5 shrink-0 rounded-full ring-1 ring-neutral-900/15 dark:ring-white/20"
                            style={{ backgroundColor: pr.colorHex || "#a3a3a3" }}
                            aria-hidden
                          />
                          {multi ? (
                            <>
                              <span className="truncate text-neutral-500 dark:text-neutral-400">
                                {pr.projectName}
                              </span>
                              <span className="text-neutral-300 dark:text-neutral-600">·</span>
                              <span className="truncate">{pr.name}</span>
                            </>
                          ) : (
                            <span className="truncate">{pr.name}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Vencimento */}
              <div className="dark:border-surface-dark-border space-y-1 rounded border border-neutral-100 bg-neutral-50 p-1.5 dark:bg-[#1d1d1b]/80">
                <span className="px-0.5 text-[9px] font-semibold tracking-wider text-neutral-500">
                  Vencimento
                </span>
                <p className="px-0.5 text-[9px] leading-snug text-neutral-400">
                  Filtra por data de vencimento da tarefa.
                </p>
                <div className="flex flex-wrap gap-1">
                  {DUE_DATE_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        setDueDatePreset(preset.id);
                        setCurrentPage(1);
                      }}
                      className={`flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors ${
                        dueDatePreset === preset.id
                          ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-neutral-50 dark:text-neutral-950"
                          : "dark:border-surface-dark-border dark:hover:border-surface-dark-border-strong border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300 dark:bg-[#1d1d1b] dark:text-neutral-400"
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tags */}
              <div className="dark:border-surface-dark-border space-y-1 rounded border border-neutral-100 bg-neutral-50 p-1.5 dark:bg-[#1d1d1b]/80">
                <span className="px-0.5 text-[9px] font-semibold tracking-wider text-neutral-500">
                  Tags ({availableTags.length})
                </span>
                <div className="flex flex-wrap gap-1">
                  {availableTags.length > 0 ? (
                    availableTags.map((tag) => {
                      const colors = getTagColor(tag);
                      return (
                        <button
                          key={tag}
                          onClick={() => handleTagToggle(tag)}
                          className={`flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors ${
                            selectedTags.includes(tag)
                              ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-neutral-50 dark:text-neutral-950"
                              : `${colors.border} ${colors.bg} ${colors.text} bg-white hover:opacity-80`
                          }`}
                        >
                          {tag}
                        </button>
                      );
                    })
                  ) : (
                    <span className="px-0.5 text-[10px] text-neutral-400 italic">
                      Nenhuma tag disponível.
                    </span>
                  )}
                </div>
              </div>

              {/* Colaboradores */}
              <div className="dark:border-surface-dark-border space-y-1 rounded border border-neutral-100 bg-neutral-50 p-1.5 dark:bg-[#1d1d1b]/80">
                <span className="px-0.5 text-[9px] font-semibold tracking-wider text-neutral-500">
                  Colaboradores ({availableCollaborators.length})
                </span>
                <div className="flex flex-wrap gap-1">
                  {availableCollaborators.length > 0 ? (
                    availableCollaborators.map((collaborator) => (
                      <button
                        key={collaborator}
                        onClick={() => handleCollaboratorToggle(collaborator)}
                        className={`flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors ${
                          selectedCollaborators.includes(collaborator)
                            ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-neutral-50 dark:text-neutral-950"
                            : "dark:border-surface-dark-border dark:hover:border-surface-dark-border-strong border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300 dark:bg-[#1d1d1b] dark:text-neutral-400"
                        }`}
                      >
                        {collaborator}
                      </button>
                    ))
                  ) : (
                    <span className="px-0.5 text-[10px] text-neutral-400 italic">
                      Nenhum colaborador disponível.
                    </span>
                  )}
                </div>
              </div>

              {/* Ordenação */}
              <div className="dark:border-surface-dark-border space-y-1 rounded border border-neutral-100 bg-neutral-50 p-1.5 dark:bg-[#1d1d1b]/80">
                <div className="flex items-center justify-between">
                  <div className="w-full space-y-1 sm:w-auto sm:min-w-[200px]">
                    <span className="px-0.5 text-[9px] font-semibold tracking-wider text-neutral-500">
                      Ordenação
                    </span>
                    <div className="flex gap-1">
                      <select
                        value={sortBy}
                        onChange={(e) => handleSortChange(e.target.value as SortBy)}
                        aria-label="Ordenar por"
                        className="dark:border-surface-dark-border min-w-0 flex-1 rounded border border-neutral-200 bg-white px-1 py-0.5 text-[10px] text-neutral-700 focus:border-neutral-400 focus:outline-none dark:bg-[#1d1d1b] dark:text-neutral-300"
                      >
                        <option value="updated_at">Data de Atualização</option>
                        <option value="created_at">Data de Criação</option>
                        <option value="title">Título (A-Z)</option>
                      </select>
                      <button
                        onClick={() => setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))}
                        className="dark:border-surface-dark-border flex shrink-0 items-center justify-center rounded border border-neutral-200 bg-white p-0.5 text-neutral-600 hover:bg-neutral-50 dark:bg-[#1d1d1b] dark:text-neutral-400 dark:hover:bg-neutral-800"
                        title={sortOrder === "asc" ? "Crescente" : "Decrescente"}
                      >
                        {sortOrder === "asc" ? (
                          <SortAsc size={11} className="rotate-180" />
                        ) : (
                          <SortAsc size={11} />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {(searchTerm || activeFilterCount > 0) && (
              <div className="dark:border-surface-dark-border mt-1 flex justify-end border-t border-neutral-100 pt-1.5">
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium text-red-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                >
                  <X size={10} /> Limpar Filtros
                </button>
              </div>
            )}
          </div>
        )}

        {/* Cabeçalho da lista (desktop) */}
        {notes.length > 0 && !showFullSkeleton && !showListSkeleton && (
          <div className="hidden bg-white px-2 py-1.5 sm:block dark:bg-[#1d1d1b]">
            <div className="grid grid-cols-12 gap-3 text-[9px] font-bold tracking-wider text-neutral-500 dark:text-neutral-400">
              <div className="col-span-3 flex min-w-0 items-center">Título</div>
              <div className="col-span-2 flex min-w-0 items-center">Projeto</div>
              <div className="col-span-2 flex min-w-0 items-center">Tags</div>
              <div className="col-span-1 flex min-w-0 items-center">Estágio</div>
              <div className="col-span-1 flex min-w-0 items-center">Prioridade</div>
              <div className="col-span-1 flex min-w-0 items-center">Vencimento</div>
              <div className="col-span-1 flex items-center justify-center">Equipe</div>
              <div className="col-span-1 flex items-center justify-end">Atualização</div>
            </div>
          </div>
        )}
      </div>

      {/* =================== BARRA DE AÇÕES EM LOTE =================== */}
      {selectionMode && selectedNotes.size > 0 && (
        <div className="animate-in slide-in-from-top-2 dark:bg-brand-primary-500/10 flex flex-col gap-1 rounded border border-yellow-500/30 bg-yellow-50 p-0.5 shadow-sm sm:flex-row sm:items-center sm:justify-between dark:border-yellow-500/20">
          <div className="flex items-center gap-1 px-0.5">
            <FiCheckSquare
              size={12}
              className="dark:text-brand-primary-500 shrink-0 text-yellow-600"
            />
            <span className="dark:text-brand-primary-500 text-[11px] font-medium text-yellow-900">
              {selectedNotes.size} tarefa(s) selecionada(s)
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={selectAllNotes}
              className="dark:text-brand-primary-500 px-0.5 py-0.5 text-[10px] font-medium text-yellow-700 underline hover:text-yellow-800 dark:hover:text-yellow-400"
            >
              {selectedNotes.size === notes.length ? "Desmarcar" : "Selecionar todas"}
            </button>
            <div className="dark:bg-brand-primary-500/30 h-3 w-px bg-yellow-300"></div>
            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-0.5 rounded bg-red-500 px-0.5 py-0.5 text-[10px] font-semibold text-white transition-colors hover:bg-red-600"
            >
              <Trash2 size={11} />
              <span className="hidden sm:inline">Excluir</span>
            </button>
            <button
              onClick={toggleSelectionMode}
              className="dark:border-surface-dark-border-strong flex items-center gap-0.5 rounded border border-neutral-300 bg-neutral-50 px-0.5 py-0.5 text-[10px] font-semibold text-neutral-700 transition-colors hover:bg-neutral-50 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
            >
              <X size={11} />
              <span className="hidden sm:inline">Cancelar</span>
            </button>
          </div>
        </div>
      )}

      {/* =================== CONTEÚDO (LISTA) =================== */}
      <div id="notes-container" className="flex-1 overflow-y-auto rounded-md p-1">
        <div className="flex w-full flex-col gap-1">
          {showFullSkeleton || showListSkeleton ? (
            <>
              {Array.from({ length: itemsPerPage }).map((_, i) => (
                <div
                  key={i}
                  className="dark:border-surface-dark-border flex h-12 animate-pulse items-center gap-2 rounded-md border border-neutral-200 bg-white px-3 sm:h-11 dark:bg-[#1d1d1b]"
                >
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 w-2/3 rounded bg-neutral-100 sm:w-1/3 dark:bg-neutral-800"></div>
                    <div className="h-2.5 w-1/2 rounded bg-neutral-50 dark:bg-[#1d1d1b]"></div>
                  </div>
                </div>
              ))}
            </>
          ) : notes.length > 0 ? (
            <div className="relative flex flex-col gap-1">
              {/* Overlay Loading */}
              {showOverlayLoading && (
                <div className="absolute inset-0 z-30 flex items-start justify-center bg-white/60 pt-10 backdrop-blur-[1px] dark:bg-[#1d1d1b]/60">
                  <Loader2 size={24} className="animate-spin text-neutral-900 dark:text-white" />
                </div>
              )}

              {notes.map((note) => {
                const isSelected = selectedNotes.has(note.id);
                return (
                  <div
                    key={note.id}
                    className={`group relative overflow-hidden rounded-md border transition-colors ${
                      isSelected
                        ? "dark:bg-brand-primary-500/10 border-yellow-400/70 bg-yellow-50/95 dark:border-yellow-500/35"
                        : "dark:border-surface-dark-border border-neutral-200 bg-white hover:border-neutral-300 dark:bg-[#1d1d1b] dark:hover:border-neutral-600"
                    }`}
                  >
                    {selectionMode && (
                      <div className="absolute top-1/2 left-3 z-10 -translate-y-1/2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleNoteSelection(note.id)}
                          className="text-brand-primary-500 dark:checked:bg-brand-primary-500 dark:border-surface-dark-border-muted h-4 w-4 cursor-pointer rounded border-neutral-300 transition-colors focus:ring-2 focus:ring-yellow-500 focus:ring-offset-0 dark:bg-neutral-800"
                        />
                      </div>
                    )}
                    <Link
                      href={
                        selectionMode ? "#" : routes.notes.details(orgId, note.public_id || note.id)
                      }
                      onClick={(e) => {
                        if (selectionMode) {
                          e.preventDefault();
                          toggleNoteSelection(note.id);
                        }
                      }}
                      className="block w-full outline-none focus-visible:ring-2 focus-visible:ring-yellow-500 focus-visible:ring-inset"
                    >
                      {/* === Layout Mobile (card compacto) === */}
                      <article
                        className={`flex min-h-[52px] flex-col justify-center gap-1 py-1.5 pr-3 pl-4 sm:hidden ${
                          selectionMode ? "pl-9" : ""
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex min-w-0 flex-1 items-center gap-1.5">
                            <h3 className="truncate text-[11px] font-bold text-neutral-800 dark:text-neutral-200">
                              {note.title || "Sem título"}
                            </h3>
                            {new Date(note.created_at).getTime() > Date.now() - 86400000 && (
                              <span className="bg-brand-primary-500 inline-block h-1.5 w-1.5 shrink-0 rounded-full"></span>
                            )}
                          </div>
                          <span className="shrink-0 text-[9px] font-medium text-neutral-400 dark:text-neutral-500">
                            {formatDate(note.updated_at)}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[9px] text-neutral-500 dark:text-neutral-400">
                          <span
                            className="max-w-[42%] truncate"
                            title={note.associated_project?.stage_name || undefined}
                          >
                            <span className="text-neutral-400 dark:text-neutral-500">Est. </span>
                            {note.associated_project?.stage_name || "—"}
                          </span>
                          <span className="text-neutral-300 dark:text-neutral-600">·</span>
                          <span
                            className="max-w-[36%] truncate"
                            title={note.priority_name || undefined}
                          >
                            {note.priority_name || "—"}
                          </span>
                          <span className="text-neutral-300 dark:text-neutral-600">·</span>
                          <span className="shrink-0">{formatShortDate(note.due_date)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1 overflow-hidden">
                            {note.tags && note.tags.length > 0 ? (
                              <>
                                {note.tags.slice(0, 2).map((tag, i) => {
                                  const colors = getTagColor(tag);
                                  return (
                                    <span
                                      key={i}
                                      className={`inline-flex shrink-0 items-center rounded px-1 py-0.5 text-[8px] font-bold ${colors.bg} ${colors.text}`}
                                    >
                                      {tag}
                                    </span>
                                  );
                                })}
                                {note.tags.length > 2 && (
                                  <span className="shrink-0 text-[8px] font-medium text-neutral-400">
                                    +{note.tags.length - 2}
                                  </span>
                                )}
                              </>
                            ) : null}
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            {note.project_name && (
                              <div
                                className="flex h-4 w-4 items-center justify-center rounded bg-blue-50 dark:bg-blue-900/20"
                                title={note.project_name}
                              >
                                <div className="h-1.5 w-1.5 rounded-full bg-blue-500"></div>
                              </div>
                            )}

                            {note.collaborators && note.collaborators.length > 0 && (
                              <div className="flex -space-x-1">
                                {note.collaborators.slice(0, 2).map((c, i) => {
                                  const avatar = getCollaboratorAvatarUrl(c);
                                  const name = getCollaboratorDisplayName(c);
                                  return (
                                    <div
                                      key={i}
                                      className="dark:border-surface-dark-border-strong relative flex h-4 w-4 items-center justify-center overflow-hidden rounded-full border border-white bg-neutral-100 dark:bg-neutral-800"
                                      title={name}
                                    >
                                      {avatar ? (
                                        <Image
                                          src={avatar}
                                          alt={name}
                                          width={16}
                                          height={16}
                                          className="h-full w-full object-cover"
                                        />
                                      ) : (
                                        <span className="text-[6px] font-bold text-neutral-500">
                                          {name.charAt(0)}
                                        </span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      </article>

                      {/* === Layout Desktop (grid row) === */}
                      <article
                        className={`hidden min-h-[2.25rem] items-center gap-2 px-3 py-1 sm:grid sm:grid-cols-12 ${
                          selectionMode ? "pl-10" : ""
                        }`}
                      >
                        <div className="col-span-3 flex min-w-0 items-center gap-1.5 pr-1">
                          <h3 className="truncate text-[10px] text-neutral-800 transition-colors group-hover:text-yellow-600 dark:text-neutral-200 dark:group-hover:text-yellow-400">
                            {note.title || "Sem título"}
                          </h3>
                          {new Date(note.created_at).getTime() > Date.now() - 86400000 && (
                            <span className="bg-brand-primary-500 inline-block h-1.5 w-1.5 shrink-0 rounded-full"></span>
                          )}
                        </div>

                        <div className="col-span-2 flex min-w-0 items-center">
                          {note.project_name ? (
                            <div className="flex min-w-0 items-center gap-1 truncate rounded bg-neutral-50 px-1.5 py-0.5 dark:bg-[#1d1d1b]">
                              <div className="h-1 w-1 shrink-0 rounded-full bg-blue-500"></div>
                              <span className="truncate text-[9px] text-neutral-600 dark:text-neutral-300">
                                {note.project_name}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[9px] text-neutral-300 dark:text-neutral-700">
                              —
                            </span>
                          )}
                        </div>

                        <div className="col-span-2 flex min-w-0 items-center overflow-hidden">
                          <div className="flex min-w-0 flex-wrap gap-0.5">
                            {note.tags?.slice(0, 2).map((tag, i) => {
                              const colors = getTagColor(tag);
                              return (
                                <span
                                  key={i}
                                  className={`inline-flex max-w-[64px] items-center truncate rounded px-1 py-0.5 text-[8px] ${colors.bg} ${colors.text}`}
                                  title={tag}
                                >
                                  {tag}
                                </span>
                              );
                            })}
                            {(note.tags?.length || 0) > 2 && (
                              <span className="text-[8px] font-medium text-neutral-400">
                                +{note.tags!.length - 2}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="col-span-1 min-w-0">
                          <span
                            className="block truncate text-[9px] text-neutral-600 dark:text-neutral-300"
                            title={note.associated_project?.stage_name || undefined}
                          >
                            {note.associated_project?.stage_name || "—"}
                          </span>
                        </div>

                        <div className="col-span-1 flex min-w-0 items-center">
                          {note.priority_name ? (
                            <span
                              className="inline-flex max-w-full items-center gap-1 truncate rounded px-1 py-0.5 text-[8px] font-medium text-neutral-900 dark:text-neutral-100"
                              style={{
                                borderLeftWidth: 2,
                                borderLeftStyle: "solid",
                                borderLeftColor: note.priority_color || "#ca8a04",
                                backgroundColor: note.priority_color
                                  ? `${note.priority_color}26`
                                  : "rgba(234, 179, 8, 0.15)",
                              }}
                              title={note.priority_name}
                            >
                              <span
                                className="h-1.5 w-1.5 shrink-0 rounded-full ring-1 ring-neutral-900/10 dark:ring-white/15"
                                style={{ backgroundColor: note.priority_color || "#ca8a04" }}
                                aria-hidden
                              />
                              <span className="truncate">{note.priority_name}</span>
                            </span>
                          ) : (
                            <span className="text-[9px] text-neutral-300 dark:text-neutral-700">
                              —
                            </span>
                          )}
                        </div>

                        <div className="col-span-1">
                          <span
                            className="text-[9px] text-neutral-600 dark:text-neutral-300"
                            title={note.due_date ? formatDate(note.due_date) : undefined}
                          >
                            {formatShortDate(note.due_date)}
                          </span>
                        </div>

                        <div className="col-span-1 flex items-center justify-center">
                          {note.collaborators && note.collaborators.length > 0 ? (
                            <div className="flex -space-x-1">
                              {note.collaborators.slice(0, 3).map((c, i) => {
                                const avatar = getCollaboratorAvatarUrl(c);
                                const name = getCollaboratorDisplayName(c);
                                return (
                                  <div
                                    key={i}
                                    className="dark:border-surface-dark-border-strong relative flex h-4 w-4 items-center justify-center overflow-hidden rounded-full border border-white bg-neutral-100 dark:bg-neutral-800"
                                    title={name}
                                  >
                                    {avatar ? (
                                      <Image
                                        src={avatar}
                                        alt={name}
                                        width={16}
                                        height={16}
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
                            </div>
                          ) : (
                            <span className="text-[9px] text-neutral-300 dark:text-neutral-700">
                              —
                            </span>
                          )}
                        </div>

                        <div className="col-span-1 flex min-w-0 items-center justify-end">
                          <span
                            className="truncate text-right text-[9px] font-medium text-neutral-500 dark:text-neutral-400"
                            title={formatDate(note.updated_at || note.created_at)}
                          >
                            {formatShortDate(note.updated_at || note.created_at)}
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
            <div className="dark:border-surface-dark-border flex h-48 flex-col items-center justify-center rounded-md border border-neutral-200 bg-white text-center sm:h-64 dark:bg-[#1d1d1b]">
              <div className="dark:shadow-surface-dark-sm dark:border-surface-dark-border mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-neutral-100 bg-neutral-50 shadow-sm dark:bg-[#1d1d1b]/50">
                <Search size={16} className="text-neutral-400" />
              </div>
              <h3 className="text-[13px] font-bold text-neutral-900 dark:text-neutral-100">
                Nenhuma tarefa encontrada
              </h3>
              <p className="mt-1 mb-4 max-w-[250px] text-[11px] leading-relaxed text-neutral-500">
                Ajuste os termos de busca ou remova os filtros atuais para ver mais resultados.
              </p>
              {(searchTerm || activeFilterCount > 0) && (
                <button
                  onClick={clearFilters}
                  className="dark:bg-brand-primary-500/10 dark:text-brand-primary-500 dark:hover:bg-brand-primary-500/20 rounded-md bg-yellow-50 px-3 py-1.5 text-[11px] font-bold text-yellow-700 transition-colors hover:bg-yellow-100"
                >
                  Limpar filtros ativos
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      {/* =================== FOOTER =================== */}
      {totalPages > 1 && (
        <div className="shrink-0 bg-white dark:bg-[#1d1d1b]">
          <div className="origin-center scale-[0.85] sm:scale-90">
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
        </div>
      )}
    </div>
  );
};

export default NotesWithPagination;
