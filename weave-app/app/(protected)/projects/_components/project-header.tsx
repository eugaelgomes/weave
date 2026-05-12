import React from "react";
import { FaArrowLeft } from "react-icons/fa";
import { Activity, Columns3, List, ChevronRight } from "lucide-react";

interface ProjectHeaderProps {
  project: any;
  stagesCount: number;
  activeView: "board" | "list";
  setActiveView: (view: "board" | "list") => void;
  onViewDetails: () => void;
  onBack: () => void;
}

export default function ProjectHeader({
  project,
  activeView,
  setActiveView,
  onViewDetails,
  onBack,
}: ProjectHeaderProps) {
  return (
    <div className="flex h-11 flex-none items-center justify-between bg-white px-3 backdrop-blur-md dark:bg-neutral-800">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          aria-label="Voltar"
          title="Voltar"
          className="flex size-6 items-center justify-center rounded text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
        >
          <FaArrowLeft className="size-2.5" />
        </button>

        <div className="mx-1 h-3 w-[1px] bg-neutral-200 dark:bg-neutral-800" />

        <div className="flex items-center gap-2">
          <div
            className="flex size-5 items-center justify-center rounded-[4px] shadow-sm"
            style={{ backgroundColor: project.properties?.color || "#eab308" }}
          >
            <Activity className="size-3 text-white/90" />
          </div>
          <div className="flex flex-col leading-none">
            <h1 className="text-[11px] font-medium tracking-tight text-neutral-800 dark:text-neutral-200">
              {project.title}
            </h1>
            <div className="mt-0.5 flex items-center gap-1">
              <span className="text-[8px] font-bold tracking-wider text-neutral-400 uppercase">
                {project.status.replace("_", " ")}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* View Selectors - Ultra Compact Segmented Control */}
        <div className="flex items-center rounded-md bg-neutral-100 p-0.5 dark:bg-[#1d1d1b]">
          {[
            { id: "board" as const, icon: <Columns3 className="size-3" />, label: "board" },
            { id: "list" as const, icon: <List className="size-3" />, label: "list" },
          ].map((view) => (
            <button
              key={view.id}
              onClick={() => setActiveView(view.id)}
              className={`flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium transition-all ${
                activeView === view.id
                  ? "bg-brand-primary-500 text-neutral-900 shadow-sm dark:bg-brand-primary-500 dark:text-neutral-900"
                  : "text-neutral-500 hover:text-neutral-700 dark:text-neutral-500 dark:hover:text-neutral-300"
              }`}
            >
              {view.icon}
              <span className="hidden lg:inline">{view.label}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 border-l border-neutral-200 pl-3 dark:border-surface-dark-border">
          <button
            type="button"
            onClick={onViewDetails}
            className="ml-1 flex items-center gap-1 rounded border border-neutral-200 px-2 py-1 text-[10px] font-medium text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:border-surface-dark-border-strong dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
          >
            Ver detalhes
            <ChevronRight className="size-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
