"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { WorkspaceHeader } from "@/app/(protected)/_components/ui/headers/workspace-header";
import { useProjects } from "@/app/_contexts/projects-context";
import { Project } from "@/app/_services/projects-service/projects-service";
import {
  Layers,
  Search,
  Plus,
  BarChart3,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Download,
  ArrowRight,
  ChevronDown,
} from "lucide-react";
import { PROJECT_STATUS } from "@/app/_utils/db-enums";

const statusLabels: Record<string, string> = {
  [PROJECT_STATUS.OPEN]: "Aberto",
  [PROJECT_STATUS.IN_PROGRESS]: "Em Andamento",
  [PROJECT_STATUS.PAUSED]: "Pausado",
  [PROJECT_STATUS.COMPLETED]: "Concluído",
  [PROJECT_STATUS.ARCHIVED]: "Arquivado",
};

const statusColors: Record<string, string> = {
  [PROJECT_STATUS.OPEN]:
    "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800",
  [PROJECT_STATUS.IN_PROGRESS]:
    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800",
  [PROJECT_STATUS.PAUSED]:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800",
  [PROJECT_STATUS.COMPLETED]:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800",
  [PROJECT_STATUS.ARCHIVED]:
    "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-400 border-neutral-200 dark:border-surface-dark-border-strong",
};

const ProjectsManagementPage = () => {
  const { projects = [], loading: isLoading } = useProjects();

  // Estados de Filtro
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  const metrics = useMemo(() => {
    const total = projects.length;
    const active = projects.filter(
      (p) => p.status === PROJECT_STATUS.OPEN || p.status === PROJECT_STATUS.IN_PROGRESS
    ).length;
    const completed = projects.filter((p) => p.status === PROJECT_STATUS.COMPLETED).length;
    const pausedOrBlocked = projects.filter((p) => p.status === PROJECT_STATUS.PAUSED).length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, active, completed, pausedOrBlocked, completionRate };
  }, [projects]);

  // Lógica combinada de filtros (Busca + Status + Prioridade)
  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      const matchesSearch =
        project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.methodology?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "all" || project.status === statusFilter;
      const matchesPriority =
        priorityFilter === "all" ||
        (project.properties?.priority &&
          project.properties.priority.toLowerCase() === priorityFilter);

      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [projects, searchTerm, statusFilter, priorityFilter]);

  return (
    <div className="animate-in fade-in flex h-full flex-col bg-neutral-50 duration-200 dark:bg-[#1d1d1b]">
      <WorkspaceHeader />

      {/* Header Analítico - Compacto */}
      <div className="border-b border-neutral-200 bg-white px-4 py-3 dark:border-surface-dark-border dark:bg-[#1d1d1b]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-brand-primary-500/10 rounded p-1.5">
              <BarChart3 className="text-brand-primary-500 h-4 w-4" />
            </div>
            <div>
              <h1 className="text-sm leading-tight font-semibold text-neutral-900 dark:text-neutral-100">
                Gestão de Portfólio
              </h1>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                Visão consolidada da organização
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button className="flex h-7 items-center justify-center gap-1.5 rounded border border-neutral-300 bg-white px-2.5 text-[11px] font-medium text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-surface-dark-border-strong dark:bg-[#1d1d1b] dark:text-neutral-300 dark:hover:bg-neutral-800">
              <Download className="h-3 w-3" />
              <span>Exportar</span>
            </button>
            <button className="bg-brand-primary-500 flex h-7 items-center justify-center gap-1.5 rounded px-2.5 text-[11px] font-medium text-white transition-colors hover:bg-yellow-600">
              <Plus className="h-3 w-3" />
              <span>Novo Projeto</span>
            </button>
          </div>
        </div>

        {/* Micro KPI Cards */}
        {!isLoading && (
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="flex items-center justify-between rounded border border-neutral-200 p-2 dark:border-surface-dark-border">
              <div>
                <p className="text-[10px] font-medium tracking-wider text-neutral-500 uppercase dark:text-neutral-400">
                  Total
                </p>
                <p className="text-lg leading-none font-bold text-neutral-900 dark:text-neutral-100">
                  {metrics.total}
                </p>
              </div>
              <Layers className="h-4 w-4 text-neutral-300 dark:text-neutral-600" />
            </div>

            <div className="flex items-center justify-between rounded border border-neutral-200 p-2 dark:border-surface-dark-border">
              <div>
                <p className="text-[10px] font-medium tracking-wider text-neutral-500 uppercase dark:text-neutral-400">
                  Ativos
                </p>
                <p className="text-lg leading-none font-bold text-neutral-900 dark:text-neutral-100">
                  {metrics.active}
                </p>
              </div>
              <TrendingUp className="h-4 w-4 text-blue-500/70" />
            </div>

            <div className="flex items-center justify-between rounded border border-neutral-200 p-2 dark:border-surface-dark-border">
              <div>
                <p className="text-[10px] font-medium tracking-wider text-neutral-500 uppercase dark:text-neutral-400">
                  Risco
                </p>
                <p className="text-lg leading-none font-bold text-neutral-900 dark:text-neutral-100">
                  {metrics.pausedOrBlocked}
                </p>
              </div>
              <AlertCircle className="text-brand-primary-500/70 h-4 w-4" />
            </div>

            <div className="flex items-center justify-between rounded border border-neutral-200 p-2 dark:border-surface-dark-border">
              <div className="w-full">
                <div className="mb-1 flex items-center justify-between">
                  <p className="text-[10px] font-medium tracking-wider text-neutral-500 uppercase dark:text-neutral-400">
                    Progresso
                  </p>
                  <p className="text-[10px] font-bold text-neutral-900 dark:text-neutral-100">
                    {metrics.completionRate}%
                  </p>
                </div>
                <div className="h-1 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
                  <div
                    className="h-full bg-green-500"
                    style={{ width: `${metrics.completionRate}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Toolbar & Tabela de Dados */}
      <div className="flex flex-1 flex-col overflow-hidden p-4">
        <div className="mx-auto flex h-full w-full max-w-7xl flex-col">
          {/* Toolbar de Controles */}
          <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center">
            {/* Search */}
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                placeholder="Buscar (ex: nome, metodologia)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-8 w-full rounded border border-neutral-300 bg-white pr-3 pl-8 text-xs focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 focus:outline-none dark:border-surface-dark-border-strong dark:bg-[#1d1d1b] dark:text-neutral-100"
              />
            </div>

            {/* Filtro: Status */}
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-8 appearance-none rounded border border-neutral-300 bg-white pr-8 pl-2.5 text-xs text-neutral-700 focus:border-yellow-500 focus:outline-none dark:border-surface-dark-border-strong dark:bg-[#1d1d1b] dark:text-neutral-300"
              >
                <option value="all">Todos os Status</option>
                <option value={PROJECT_STATUS.OPEN}>Abertos</option>
                <option value={PROJECT_STATUS.IN_PROGRESS}>Em Andamento</option>
                <option value={PROJECT_STATUS.PAUSED}>Pausados</option>
                <option value={PROJECT_STATUS.COMPLETED}>Concluídos</option>
                <option value={PROJECT_STATUS.ARCHIVED}>Arquivados</option>
              </select>
              <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
            </div>

            {/* Filtro: Prioridade */}
            <div className="relative">
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="h-8 appearance-none rounded border border-neutral-300 bg-white pr-8 pl-2.5 text-xs text-neutral-700 focus:border-yellow-500 focus:outline-none dark:border-surface-dark-border-strong dark:bg-[#1d1d1b] dark:text-neutral-300"
              >
                <option value="all">Qualquer Prioridade</option>
                <option value="alta">Alta</option>
                <option value="media">Média</option>
                <option value="baixa">Baixa</option>
              </select>
              <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
            </div>
          </div>

          {/* Tabela */}
          <div className="flex-1 overflow-auto rounded border border-neutral-200 bg-white dark:border-surface-dark-border dark:bg-[#1d1d1b]">
            {isLoading ? (
              <div className="flex h-full items-center justify-center">
                <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-yellow-500" />
              </div>
            ) : (
              <table className="min-w-full text-left text-xs whitespace-nowrap">
                <thead className="sticky top-0 z-10 border-b border-neutral-200 bg-neutral-50 text-[11px] font-semibold text-neutral-500 uppercase dark:border-surface-dark-border dark:bg-[#1d1d1b] dark:text-neutral-400">
                  <tr>
                    <th className="px-3 py-2">Projeto</th>
                    <th className="w-32 px-3 py-2">Status</th>
                    <th className="hidden w-28 px-3 py-2 sm:table-cell">Metodologia</th>
                    <th className="hidden w-24 px-3 py-2 md:table-cell">Prioridade</th>
                    <th className="hidden w-24 px-3 py-2 lg:table-cell">Tempo Est.</th>
                    <th className="w-10 px-3 py-2 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-surface-dark-border-muted">
                  {filteredProjects.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-neutral-400">
                        Nenhum projeto corresponde aos filtros.
                      </td>
                    </tr>
                  ) : (
                    filteredProjects.map((project) => (
                      <tr
                        key={project.id}
                        className="group transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/40"
                      >
                        <td className="px-3 py-1.5">
                          <div className="flex items-center gap-2">
                            <div
                              className="h-1.5 w-1.5 shrink-0 rounded-full"
                              style={{ backgroundColor: project.properties?.color || "#3f51b5" }}
                            />
                            <span className="max-w-[200px] truncate font-medium text-neutral-900 sm:max-w-xs dark:text-neutral-100">
                              {project.title}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-1.5">
                          <span
                            className={`inline-flex rounded border px-1.5 py-0.5 text-[10px] font-medium ${statusColors[project.status] || statusColors[PROJECT_STATUS.OPEN]}`}
                          >
                            {statusLabels[project.status] || project.status}
                          </span>
                        </td>
                        <td className="hidden px-3 py-1.5 text-neutral-600 capitalize sm:table-cell dark:text-neutral-400">
                          {project.methodology || "-"}
                        </td>
                        <td className="hidden px-3 py-1.5 md:table-cell">
                          {project.properties?.priority ? (
                            <span className="text-neutral-600 capitalize dark:text-neutral-400">
                              {project.properties.priority}
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="hidden px-3 py-1.5 font-mono text-[11px] text-neutral-500 lg:table-cell">
                          {project.properties?.estimated_time || "-"}
                        </td>
                        <td className="px-3 py-1.5 text-center">
                          <Link
                            href={`/projects/${project.id}`}
                            className="inline-flex h-6 w-6 items-center justify-center rounded text-neutral-400 opacity-0 transition-all group-hover:opacity-100 hover:bg-neutral-200 hover:text-neutral-900 dark:hover:bg-neutral-700 dark:hover:text-neutral-100"
                            title="Acessar projeto"
                          >
                            <ArrowRight className="h-3 w-3" />
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>

          {/* Footer da Tabela (Resumo) */}
          <div className="mt-2 text-right">
            <span className="text-[10px] text-neutral-400">
              Mostrando {filteredProjects.length} de {projects.length} projetos
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectsManagementPage;
