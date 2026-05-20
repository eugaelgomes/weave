"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Calendar, Clock, Columns3, Flag, Tags, X } from "lucide-react";
import { useAuth } from "@/app/_contexts/auth-context";
import {
  FilterSearchInput,
  FilterSelect,
  FilterPeopleSelect,
  type Collaborator,
} from "@/app/(protected)/_components/ui/filter-select";
import {
  datePresetToIsoRange,
  type DueDatePreset,
  type CreatedDatePreset,
  type ProjectNotesListFilters,
} from "@/app/_services/projects-service/projects-service";

interface StageOption {
  id: string;
  name: string;
}

interface TagOption {
  id: string;
  name: string;
}

interface PriorityOption {
  id: string;
  name: string;
}

interface CollaboratorOption {
  user_id: string;
  username: string;
  name?: string;
  avatar_url?: string;
}

interface ProjectFiltersProps {
  stages: StageOption[];
  projectTags: TagOption[];
  taskPriorities: PriorityOption[];
  collaborators: CollaboratorOption[];
  filters: ProjectNotesListFilters;
  onChange: (filters: ProjectNotesListFilters) => void;
  onClear: () => void;
}

const DATE_PRESET_OPTIONS = [
  { value: "today", label: "Hoje" },
  { value: "week", label: "Esta semana" },
  { value: "month", label: "Este mês" },
] as const;

export function ProjectFilters({
  stages,
  projectTags,
  taskPriorities,
  collaborators,
  filters,
  onChange,
  onClear,
}: ProjectFiltersProps) {
  const { user } = useAuth();

  const [searchInput, setSearchInput] = useState(filters.search ?? "");
  const [duePreset, setDuePreset] = useState<DueDatePreset>("all");
  const [createdPreset, setCreatedPreset] = useState<CreatedDatePreset>("all");

  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const next = { ...filters };
      if (searchInput.trim()) {
        next.search = searchInput.trim();
      } else {
        delete next.search;
      }
      onChange(next);
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchInput]);

  const update = useCallback(
    (patch: Partial<ProjectNotesListFilters>) => {
      const next = { ...filters, ...patch };
      Object.keys(next).forEach((k) => {
        const key = k as keyof ProjectNotesListFilters;
        const v = next[key];
        if (v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0)) {
          delete next[key];
        }
      });
      onChange(next);
    },
    [filters, onChange]
  );

  const handleDuePreset = (preset: DueDatePreset) => {
    setDuePreset(preset);
    const range = datePresetToIsoRange(preset);
    update({
      due_from: range?.from,
      due_to: range?.to,
    });
  };

  const handleCreatedPreset = (preset: CreatedDatePreset) => {
    setCreatedPreset(preset);
    const range = datePresetToIsoRange(preset);
    update({
      created_from: range?.from,
      created_to: range?.to,
    });
  };

  const handlePriority = (priorityId: string) => {
    update({
      priority_id: priorityId === "all" ? undefined : [priorityId],
    });
  };

  const handleStage = (stageId: string) => {
    update({
      stage_id: stageId === "all" ? undefined : [stageId],
    });
  };

  const handleTag = (tagId: string) => {
    update({
      tags: tagId === "all" ? undefined : [tagId],
    });
  };

  const handlePerson = (userId: string | null) => {
    update({ collaborator_user_id: userId ? [userId] : undefined });
  };

  const clearDue = () => handleDuePreset("all");
  const clearCreated = () => handleCreatedPreset("all");
  const clearPriority = () => handlePriority("all");
  const clearStage = () => handleStage("all");
  const clearTag = () => handleTag("all");
  const clearPerson = () => handlePerson(null);

  const clearSearch = () => {
    setSearchInput("");
    const next = { ...filters };
    delete next.search;
    onChange(next);
  };

  const handleClear = () => {
    setSearchInput("");
    setDuePreset("all");
    setCreatedPreset("all");
    onClear();
  };

  const activeCount =
    (filters.search ? 1 : 0) +
    (filters.priority_id?.length ? 1 : 0) +
    (filters.tags?.length ? 1 : 0) +
    (filters.stage_id?.length ? 1 : 0) +
    (filters.collaborator_user_id?.length ? 1 : 0) +
    (filters.due_from ? 1 : 0) +
    (filters.created_from ? 1 : 0);

  const collaboratorsList: Collaborator[] = collaborators.map((c) => ({
    user_id: c.user_id,
    username: c.username,
    name: c.name,
    avatar_url: c.avatar_url,
  }));

  return (
    <div className="flex flex-shrink-0 flex-wrap items-center gap-1 px-2 py-1">
      <FilterSearchInput
        value={searchInput}
        onChange={setSearchInput}
        onClear={clearSearch}
        placeholder="Buscar..."
      />

      <FilterSelect
        icon={Clock}
        accent="amber"
        placeholder="Vencimento"
        title="Filtrar por vencimento"
        value={duePreset}
        onChange={(v) => handleDuePreset(v as DueDatePreset)}
        onClear={clearDue}
        options={[...DATE_PRESET_OPTIONS]}
      />

      <FilterSelect
        icon={Calendar}
        accent="blue"
        placeholder="Criação"
        title="Filtrar por data de criação"
        value={createdPreset}
        onChange={(v) => handleCreatedPreset(v as CreatedDatePreset)}
        onClear={clearCreated}
        options={[...DATE_PRESET_OPTIONS]}
      />

      {taskPriorities.length > 0 && (
        <FilterSelect
          icon={Flag}
          accent="rose"
          placeholder="Prioridade"
          title="Filtrar por prioridade"
          value={filters.priority_id?.[0] ?? "all"}
          onChange={handlePriority}
          onClear={clearPriority}
          options={taskPriorities.map((p) => ({ value: p.id, label: p.name }))}
        />
      )}

      {stages.length > 0 && (
        <FilterSelect
          icon={Columns3}
          accent="purple"
          placeholder="Estágio"
          title="Filtrar por estágio"
          value={filters.stage_id?.[0] ?? "all"}
          onChange={handleStage}
          onClear={clearStage}
          options={stages.map((s) => ({ value: s.id, label: s.name }))}
        />
      )}

      {projectTags.length > 0 && (
        <FilterSelect
          icon={Tags}
          accent="emerald"
          placeholder="Tags"
          title="Filtrar por tag"
          value={filters.tags?.[0] ?? "all"}
          onChange={handleTag}
          onClear={clearTag}
          options={projectTags.map((t) => ({ value: t.id, label: t.name }))}
        />
      )}

      <FilterPeopleSelect
        value={filters.collaborator_user_id?.[0] ?? null}
        onChange={handlePerson}
        collaborators={collaboratorsList}
        currentUserId={user?.id}
        placeholder="Pessoas"
        onClear={clearPerson}
      />

      {activeCount > 0 && (
        <button
          type="button"
          onClick={handleClear}
          className="ml-auto flex items-center gap-0.5 rounded-full border border-neutral-200 px-2 py-px text-[10px] font-medium text-neutral-500 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600 dark:border-neutral-700 dark:text-neutral-400 dark:hover:border-red-600/50 dark:hover:bg-red-950/40 dark:hover:text-red-400"
        >
          <X className="h-2 w-2" />
          <span>Limpar ({activeCount})</span>
        </button>
      )}
    </div>
  );
}
