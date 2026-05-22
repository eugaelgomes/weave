import React from "react";
import { ArrowLeft, Columns3, List, ChevronRight } from "lucide-react";
import type { ProjectProperties } from "@/app/_services/projects-service/projects-service";
import {
  ProjectIcon,
  ProjectIconEditable,
} from "@/app/(protected)/projects/_components/project-icon";

interface ProjectHeaderProps {
  project: { title?: string; status?: string; properties?: ProjectProperties };
  stagesCount: number;
  activeView: "board" | "list";
  setActiveView: (view: "board" | "list") => void;
  onViewDetails: () => void;
  onBack: () => void;
  canEdit?: boolean;
  onIconFile?: (file: File) => void | Promise<void>;
}

const viewOptions = [
  { id: "board" as const, icon: Columns3, label: "Board" },
  { id: "list" as const, icon: List, label: "Lista" },
];

export default function ProjectHeader({
  project,
  activeView,
  setActiveView,
  onViewDetails,
  onBack,
  canEdit = false,
  onIconFile,
}: ProjectHeaderProps) {
  return (
    <div className="dark:border-surface-dark-border flex flex-shrink-0 items-center justify-between border-b border-neutral-200 px-2 py-1">
      <div className="flex min-w-0 items-center gap-1.5">
        <button
          type="button"
          onClick={onBack}
          aria-label="Voltar"
          title="Voltar"
          className="flex shrink-0 items-center justify-center rounded p-0.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
        >
          <ArrowLeft className="h-2.5 w-2.5" />
        </button>
        {canEdit && onIconFile ? (
          <ProjectIconEditable
            icon={project.properties?.icon}
            color={project.properties?.color}
            size="sm"
            onIconFile={onIconFile}
          />
        ) : (
          <ProjectIcon
            icon={project.properties?.icon}
            color={project.properties?.color}
            size="sm"
          />
        )}
        <h1 className="truncate text-[10px] font-bold tracking-wider text-neutral-800 dark:text-neutral-200">
          {project.title || "Projeto"}
        </h1>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        {viewOptions.map((view) => {
          const Icon = view.icon;
          const isActive = activeView === view.id;

          return (
            <button
              key={view.id}
              type="button"
              onClick={() => setActiveView(view.id)}
              className={`flex items-center gap-1 rounded px-1 py-0.5 text-[10px] transition-all ${
                isActive
                  ? "bg-brand-yellow text-brand-navy"
                  : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200 dark:bg-[#1d1d1b] dark:hover:bg-neutral-800"
              }`}
            >
              <Icon className="h-2 w-2" />
              <span className="hidden sm:inline">{view.label}</span>
            </button>
          );
        })}

        <button
          type="button"
          onClick={onViewDetails}
          className="flex items-center gap-1 rounded px-1 py-0.5 text-[10px] text-neutral-500 transition-all hover:bg-neutral-100 hover:text-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
        >
          <span>Detalhes</span>
          <ChevronRight className="h-2 w-2" />
        </button>
      </div>
    </div>
  );
}
