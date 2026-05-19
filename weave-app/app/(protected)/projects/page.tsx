"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { usePlanUsage } from "@/app/_contexts/plan-usage-context";
import { useProjects } from "@/app/_contexts/projects-context";
import { Plus } from "lucide-react";
import { toast } from "sonner";

const ProjectsPage = () => {
  const router = useRouter();
  const { canCreateProject } = usePlanUsage();
  const { loading } = useProjects();

  const handleCreateProject = () => {
    if (!canCreateProject) {
      toast.error("Limite do Plano Atingido", {
        description: "Você atingiu o limite de projetos do seu plano.",
        duration: 6000,
        action: {
          label: "Ver Planos",
          onClick: () => router.push("/settings?tab=plan"),
        },
      });
      return;
    }
    router.push("/projects/new");
  };

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-yellow-500" />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-shrink-0 items-center justify-between border-b border-neutral-200 px-2 py-1 dark:border-surface-dark-border">
        <div className="flex min-w-0 items-center gap-2">
          <h1 className="truncate text-[10px] font-bold tracking-wider text-neutral-500 dark:text-neutral-400">
            Overview dos Projetos
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCreateProject}
            title={!canCreateProject ? "Limite de projetos do plano atingido" : undefined}
            disabled={!canCreateProject}
            className={`flex items-center gap-1.5 rounded px-1 py-0.5 text-[10px] transition-all ${
              canCreateProject
                ? "bg-brand-yellow text-brand-navy hover:brightness-95"
                : "cursor-not-allowed bg-neutral-100 text-neutral-400 dark:bg-[#1d1d1b] dark:text-neutral-500"
            }`}
          >
            <Plus className="h-2 w-2" />
            <span>Criar projeto</span>
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-y-auto p-2 sm:p-3" />
    </div>
  );
};

export default ProjectsPage;
