"use client";

import React, { useState } from "react";
import { useAuth } from "../../_contexts/auth-context";
import { useProjects } from "../../_contexts/projects-context";
import ProjectsCarousel from "../_components/ui/projects/project-carousel";
import { Folder, ChevronRight, FileText } from "lucide-react";

export default function ProjectsPage() {
  const { authenticated, loading: authLoading, user } = useAuth();
  const { getRecentProjects, loading: projectsLoading } = useProjects();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  // Exibição de loading suave e centralizado
  if (authLoading || projectsLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-yellow-500"></div>
      </div>
    );
  }

  // Redirecionamento se não autenticado
  if (!authenticated) {
    if (typeof window !== "undefined") {
      window.location.href = "/auth/signin";
    }
    return null;
  }

  const recentProjects = getRecentProjects();
  const userName = String(user?.user_name || user?.username || "usuário");

  return (
    // Container principal: Usa flex-row em telas grandes e flex-col em mobile
    <div className="flex min-h-[calc(100vh-5rem)] flex-col md:flex-row bg-white dark:bg-neutral-950 rounded-lg border border-neutral-200 dark:border-neutral-800 overflow-hidden">
      
      {/* SIDEBAR LATERAL (Master)
        - Máximo de 200px em telas grandes
        - Ocupa altura total disponível
        - Scroll interno caso a lista de projetos cresça
      */}
      <aside className="w-full md:w-[200px] flex-shrink-0 border-b md:border-b-0 md:border-r border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900/30 overflow-y-auto">
        <div className="p-4">
          <h2 className="mb-3 text-[11px] font-bold tracking-wider text-neutral-500 uppercase dark:text-neutral-400">
            Meus Projetos
          </h2>
          
          <ul className="space-y-1">
            {recentProjects.map((project) => (
              <li key={project.id} className="flex flex-col">
                <button
                  onClick={() => setSelectedProjectId(project.id)}
                  className={`group flex w-full items-center justify-between rounded-md px-2 py-2 text-sm transition-all ${
                    selectedProjectId === project.id
                      ? "bg-neutral-200/60 text-neutral-900 font-medium dark:bg-neutral-800 dark:text-neutral-100"
                      : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800/50"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Folder className={`h-4 w-4 flex-shrink-0 ${
                      selectedProjectId === project.id ? "text-yellow-500" : "text-neutral-400"
                    }`} />
                    <span className="truncate">{project.title}</span>
                  </div>
                  {selectedProjectId === project.id && (
                    <ChevronRight className="h-3 w-3 text-neutral-400" />
                  )}
                </button>

                {/* ESPAÇO PARA SUBPROJETOS
                  Quando o backend estiver pronto, você pode mapear os subprojetos aqui,
                  adicionando uma margem à esquerda (pl-6) para criar hierarquia visual.
                */}
                {/* {project.subprojects?.map(sub => (
                  <button className="flex items-center gap-2 pl-6 pr-2 py-1.5 text-xs text-neutral-500 hover:text-neutral-900...">
                    <FileText className="h-3 w-3" /> {sub.title}
                  </button>
                ))} 
                */}
              </li>
            ))}

            {recentProjects.length === 0 && (
              <p className="text-xs text-neutral-400 italic px-2">Nenhum projeto encontrado.</p>
            )}
          </ul>
        </div>
      </aside>

      {/* CONTEÚDO PRINCIPAL (Detail)
        - Ocupa o espaço restante (flex-1)
      */}
      <main className="flex flex-1 flex-col overflow-y-auto bg-white p-4 sm:p-6 dark:bg-neutral-950">
        
        {selectedProjectId ? (
          /* DIV GENÉRICO DO PROJETO SELECIONADO */
          <div className="flex flex-col h-full animate-in fade-in duration-300">
            <header className="mb-6 flex items-center justify-between border-b border-neutral-100 pb-4 dark:border-neutral-900">
              <h1 className="text-xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
                Visualizando Projeto
              </h1>
            </header>
            
            {/* Placeholder onde o seu futuro componente será renderizado */}
            <div className="flex flex-1 items-center justify-center rounded-xl border-2 border-dashed border-neutral-200 bg-neutral-50/50 dark:border-neutral-800 dark:bg-neutral-900/20">
              <div className="flex flex-col items-center text-center p-6 text-neutral-500">
                <Folder className="mb-3 h-10 w-10 text-neutral-300 dark:text-neutral-600" />
                <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Área de Trabalho do Projeto
                </h3>
                <p className="mt-1 text-xs text-neutral-400">
                  Aqui entrará o componente principal.<br/>
                  ID Selecionado: <code className="bg-neutral-200 dark:bg-neutral-800 px-1 rounded">{selectedProjectId}</code>
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* TELA INICIAL QUANDO NENHUM PROJETO ESTÁ SELECIONADO (Com o Carrossel) */
          <div className="flex flex-col h-full animate-in fade-in duration-300">
            <header className="mb-6 flex items-center justify-between border-b border-neutral-100 pb-4 dark:border-neutral-900">
              <div>
                <h1 className="text-xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
                  Visão Geral
                </h1>
                <p className="text-sm text-neutral-500 mt-1">
                  Bem-vindo de volta, {userName}
                </p>
              </div>
            </header>

            <div className="mb-8 rounded-xl border border-neutral-100 bg-neutral-50 p-6 dark:border-neutral-800/50 dark:bg-neutral-900/20">
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Selecione um projeto na barra lateral para visualizar seus detalhes, arquivos e subprojetos.
              </p>
            </div>

            {/* Carrossel Reposicionado */}
            <div className="mt-auto">
              <ProjectsCarousel
                projects={recentProjects}
                title="Acessados Recentemente"
                emptyMessage="Você ainda não tem projetos"
                emptyActionText="Criar Primeiro Projeto"
                emptyActionHref="/app/projects/new"
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}