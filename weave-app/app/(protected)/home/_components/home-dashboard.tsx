import React from "react";
import {
  BrainCircuit,
  AlertCircle,
  TrendingUp,
  CheckCircle2,
  FolderKanban,
  Tag,
  Clock,
  GitMerge,
} from "lucide-react";

interface AIInsight {
  id: string;
  type: "warning" | "suggestion" | "success";
  title: string;
  description: string;
}

interface Task {
  id: string;
  title: string;
  status: "done" | "in_progress" | "todo";
}

interface TagGroup {
  tag: string;
  tasks: Task[];
}

interface Sprint {
  name: string;
  tagGroups: TagGroup[];
}

interface ProjectData {
  id: string;
  name: string;
  sprints: Sprint[];
}

export default function HighDensityDashboard() {
  const aiInsights: AIInsight[] = [
    {
      id: "1",
      type: "warning",
      title: "Gargalo em Code Review",
      description: "Sprint 42 possui 3 tarefas paradas na revisão há mais de 48h.",
    },
    {
      id: "2",
      type: "suggestion",
      title: "Quebra de Épico",
      description: 'O épico "Refatoração Auth" pode ser dividido em 5 subtarefas.',
    },
    {
      id: "3",
      type: "success",
      title: "Cycle Time Reduzido",
      description: "Queda de 15% no tempo médio de entrega nesta semana.",
    },
  ];

  const projectsMap: ProjectData[] = [
    {
      id: "p1",
      name: "Plataforma Core",
      sprints: [
        {
          name: "Sprint 42",
          tagGroups: [
            {
              tag: "Backend",
              tasks: [
                { id: "t1", title: "Otimização de Query PostgreSQL", status: "done" },
                { id: "t2", title: "Refatorar fila de processamento", status: "in_progress" },
              ],
            },
            {
              tag: "Infra",
              tasks: [{ id: "t3", title: "Atualizar cluster Docker", status: "todo" }],
            },
          ],
        },
      ],
    },
    {
      id: "p2",
      name: "App Mobile",
      sprints: [
        {
          name: "Release 1.2",
          tagGroups: [
            {
              tag: "Frontend",
              tasks: [
                { id: "t4", title: "Implementar biometria", status: "in_progress" },
                { id: "t5", title: "Ajustar navegação offline", status: "done" },
              ],
            },
          ],
        },
      ],
    },
  ];

  return (
    <div className="flex h-full flex-col rounded-md bg-neutral-200 p-4 shadow-md dark:bg-neutral-800">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            Visão Geral (componente mockado)
          </h1>
          <p className="mt-0.5 text-[11px] text-neutral-500 dark:text-neutral-400">
            Inteligência de engenharia e progresso de entregas
          </p>
        </div>
      </header>

      <section className="mb-4">
        <div className="mb-2 flex items-center gap-2">
          <BrainCircuit className="text-brand-primary-500 h-3.5 w-3.5 dark:text-yellow-400" />
          <h2 className="text-xs font-semibold tracking-wide text-neutral-700 dark:text-neutral-300">
            Insights Ativos
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
          {aiInsights.map((insight) => (
            <div
              key={insight.id}
              className="flex items-start gap-2 rounded-lg border border-neutral-200 bg-white p-2 shadow-sm transition-all hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-800 dark:hover:border-neutral-700"
            >
              {insight.type === "warning" && (
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-amber-500" />
              )}
              {insight.type === "suggestion" && (
                <TrendingUp className="text-brand-primary-500 mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
              )}
              {insight.type === "success" && (
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-emerald-500" />
              )}

              <div>
                <h3 className="text-xs leading-none font-medium text-neutral-800 dark:text-neutral-200">
                  {insight.title}
                </h3>
                <p className="mt-1 text-[11px] leading-snug text-neutral-500 dark:text-neutral-400">
                  {insight.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="mt-4 mb-2 flex items-center gap-2 border-b border-neutral-200 pb-1.5 dark:border-neutral-800">
          <GitMerge className="h-3.5 w-3.5 text-neutral-600 dark:text-neutral-400" />
          <h2 className="text-xs font-semibold tracking-wide text-neutral-700 dark:text-neutral-300">
            Mapeamento de Entregas
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {projectsMap.map((project) => (
            <div
              key={project.id}
              className="rounded-lg border border-neutral-200 bg-white p-3 shadow-sm dark:border-neutral-800 dark:bg-neutral-800"
            >
              <div className="mb-2 flex items-center gap-1.5">
                <FolderKanban className="text-brand-primary-500 h-3.5 w-3.5 dark:text-yellow-400" />
                <h3 className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                  {project.name}
                </h3>
              </div>

              <div className="ml-2 space-y-3 border-l border-neutral-200 pl-3 dark:border-neutral-800">
                {project.sprints.map((sprint, sIdx) => (
                  <div key={sIdx} className="relative">
                    <div className="absolute top-1 -left-[17px] h-2 w-2 rounded-full border-2 border-white bg-neutral-300 dark:border-neutral-950 dark:bg-neutral-700" />
                    <h4 className="mb-1.5 text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">
                      {sprint.name}
                    </h4>

                    <div className="ml-1.5 space-y-2 border-l border-neutral-100 pl-3 dark:border-neutral-800/50">
                      {sprint.tagGroups.map((group, gIdx) => (
                        <div key={gIdx}>
                          <div className="mb-1 flex items-center gap-1.5">
                            <Tag className="h-2.5 w-2.5 text-neutral-400 dark:text-neutral-500" />
                            <span className="text-[10px] font-medium tracking-wider text-neutral-500 dark:text-neutral-400">
                              {group.tag}
                            </span>
                          </div>

                          <div className="ml-3 space-y-1 border-l border-dashed border-neutral-200 pl-2.5 dark:border-neutral-800">
                            {group.tasks.map((task) => (
                              <div
                                key={task.id}
                                className="group flex cursor-pointer items-center gap-1.5"
                              >
                                {task.status === "done" ? (
                                  <CheckCircle2 className="h-3 w-3 flex-shrink-0 text-emerald-500" />
                                ) : task.status === "in_progress" ? (
                                  <Clock className="text-brand-primary-500 h-3 w-3 flex-shrink-0" />
                                ) : (
                                  <div className="h-3 w-3 flex-shrink-0 rounded-full border border-neutral-300 dark:border-neutral-700" />
                                )}
                                <span
                                  className={`truncate text-[11px] transition-colors ${task.status === "done" ? "text-neutral-400 line-through dark:text-neutral-600" : "text-neutral-700 group-hover:text-yellow-600 dark:text-neutral-300 dark:group-hover:text-yellow-400"}`}
                                >
                                  {task.title}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
