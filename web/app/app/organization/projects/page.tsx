"use client";

import React from "react";
import { Layers } from "lucide-react";

const ProjectsPage = () => {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-neutral-200 bg-neutral-50 p-6 dark:border-neutral-800 dark:bg-neutral-950">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-yellow-500/10 p-2">
            <Layers className="h-6 w-6 text-yellow-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
              Projetos da Organização
            </h1>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Gerencie os projetos compartilhados
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-8 text-center dark:border-neutral-800 dark:bg-neutral-950">
            <Layers className="mx-auto mb-4 h-12 w-12 text-neutral-400" />
            <h2 className="mb-2 text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              Em desenvolvimento
            </h2>
            <p className="text-neutral-600 dark:text-neutral-400">
              A página de projetos da organização estará disponível em breve.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectsPage;
