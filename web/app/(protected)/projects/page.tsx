"use client";

import React, { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { usePlanUsage } from "@/app/_contexts/plan-usage-context";
import { useProjects } from "@/app/_contexts/projects-context";
import { Folder, Plus } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

const ProjectsPage = () => {
  const router = useRouter();
  const params = useParams();
  
  const { canCreateProject } = usePlanUsage();
  const { loading, getRecentProjects } = useProjects();
  const projects = useMemo(() => getRecentProjects(), [getRecentProjects]);

  const handleCreateProject = () => {
    if (!canCreateProject) {
      toast.error("Limite do Plano Atingido", {
        description: "Você atingiu o limite de projetos do seu plano.",
        duration: 6000,
        action: {
          label: "Ver Planos",
          onClick: () => router.push(`/settings/plans`),
        },
      });
      return;
    }
    router.push(`/projects/new`);
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
      <div className="dark:border-surface-dark-border flex flex-shrink-0 items-center justify-between border-b border-neutral-200 px-2 py-1">
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

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-2 sm:p-3">
        {projects.length === 0 ? (
          <section className="dark:border-surface-dark-border rounded-md border border-neutral-200 bg-white p-4 text-center dark:bg-[#1d1d1b]">
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Você ainda não tem projetos na sua organização.
            </p>
            <button
              type="button"
              onClick={handleCreateProject}
              disabled={!canCreateProject}
              className="bg-brand-primary-500 mt-3 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-semibold text-neutral-900 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Plus className="h-3 w-3" />
              Criar primeiro projeto
            </button>
          </section>
        ) : (
          <section className="grid gap-2">
            {projects.map((project) => {
              return (
                <article
                  key={project.id}
                  className="dark:border-surface-dark-border rounded-md border border-neutral-200 bg-white p-3 shadow-sm dark:bg-[#1d1d1b]"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                          {project.title}
                        </h3>
                      </div>
                      {project.lastModified && (
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-neutral-500 dark:text-neutral-400">
                          <span>
                            Atualizado em:{" "}
                            {new Date(project.lastModified).toLocaleDateString("pt-BR")}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/projects/${project.public_id}`}
                        className="dark:border-surface-dark-border inline-flex items-center gap-1 rounded-md border border-neutral-200 bg-white px-2 py-1 text-[11px] font-medium text-neutral-700 hover:bg-neutral-50 dark:bg-[#1d1d1b] dark:text-neutral-200 dark:hover:bg-neutral-900"
                      >
                        <Folder className="h-3.5 w-3.5" />
                        Acessar projeto
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </div>
    </div>
  );
};

export default ProjectsPage;
