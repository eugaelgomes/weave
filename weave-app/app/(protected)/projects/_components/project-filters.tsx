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

  const displayPriorities = React.useMemo(() => {
    return taskPriorities && taskPriorities.length > 0
      ? taskPriorities
      : [
          { id: "low", name: "Baixa" },
          { id: "medium", name: "Média" },
          { id: "high", name: "Alta" },
          { id: "urgent", name: "Urgente" },
        ];
  }, [taskPriorities]);

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

  const handlePriority = (priorityIds: string[]) => {
    update({
      priority_id: priorityIds.length === 0 ? undefined : priorityIds,
    });
  };

  const handleStage = (stageIds: string[]) => {
    update({
      stage_id: stageIds.length === 0 ? undefined : stageIds,
    });
  };

  const handleTag = (tagIds: string[]) => {
    update({
      tags: tagIds.length === 0 ? undefined : tagIds,
    });
  };

  const handlePerson = (userIds: string[]) => {
    update({ collaborator_user_id: userIds.length === 0 ? undefined : userIds });
  };

  const clearDue = () => handleDuePreset("all");
  const clearCreated = () => handleCreatedPreset("all");
  const clearPriority = () => handlePriority([]);
  const clearStage = () => handleStage([]);
  const clearTag = () => handleTag([]);
  const clearPerson = () => handlePerson([]);

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
    <div className="flex flex-shrink-0 flex-wrap items-center justify-between gap-2 border-b border-neutral-100 px-2 py-1 dark:border-neutral-800/40">
      <div className="flex shrink-0 items-center">
        <FilterSearchInput
          value={searchInput}
          onChange={setSearchInput}
          onClear={clearSearch}
          placeholder="Buscar..."
          className="w-36 sm:w-44"
        />
      </div>

      <div className="flex flex-wrap items-center justify-end gap-1">
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

        <FilterSelect
          icon={Flag}
          accent="rose"
          placeholder="Prioridade"
          title="Filtrar por prioridade"
          multiple
          value={filters.priority_id ?? []}
          onChange={handlePriority}
          onClear={clearPriority}
          options={displayPriorities.map((p) => ({ value: p.id, label: p.name }))}
        />

        {stages.length > 0 && (
          <FilterSelect
            icon={Columns3}
            accent="purple"
            placeholder="Estágio"
            title="Filtrar por estágio"
            multiple
            value={filters.stage_id ?? []}
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
            multiple
            value={filters.tags ?? []}
            onChange={handleTag}
            onClear={clearTag}
            options={projectTags.map((t) => ({ value: t.id, label: t.name }))}
          />
        )}

        <FilterPeopleSelect
          multiple
          value={filters.collaborator_user_id ?? []}
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
            className="flex items-center gap-0.5 rounded-md border-0 bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-red-950/40 dark:hover:text-red-400"
          >
            <X className="h-2 w-2" />
            <span>Limpar ({activeCount})</span>
          </button>
        )}
      </div>
    </div>
  );
}
