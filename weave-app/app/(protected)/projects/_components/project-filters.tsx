"use client";

import React, { useState } from "react";
import { Clock, Users, Flag, Tags, Filter, Search, X } from "lucide-react";
import { useProjects } from "@/app/_contexts/projects-context";
import { useNotes } from "@/app/_contexts/notes-context";

export function ProjectFilters() {
  const [activeTime, setActiveTime] = useState<string>("all");
  const [activePriority, setActivePriority] = useState<string>("all");

  const { projectsOverview } = useProjects();
  const { notes } = useNotes();

  return (
    <div className="flex flex-none flex-wrap items-center gap-2 border-b border-neutral-200 bg-white/40 px-3 py-1.5 backdrop-blur-sm dark:border-surface-dark-border dark:bg-[#1d1d1b]/40">
      <div className="flex items-center gap-1.5 border-r border-neutral-200 pr-2 dark:border-surface-dark-border">
        <Filter className="h-3 w-3 text-neutral-400" />
        <span className="text-[9px] font-medium tracking-wider text-neutral-500 uppercase">
          Filtros
        </span>
      </div>

      {/* Busca */}
      <div className="relative flex items-center">
        <Search className="absolute left-2 h-2.5 w-2.5 text-neutral-400" />
        <input
          type="text"
          placeholder="Buscar tarefas..."
          className="w-32 rounded-md border border-neutral-200 bg-white py-1 pr-2 pl-6 text-[10px] focus:border-purple-500 focus:outline-none dark:border-surface-dark-border dark:bg-[#1d1d1b]"
        />
      </div>

      {/* Tempo */}
      <div className="flex items-center gap-1 rounded-md border border-neutral-200 bg-white p-0.5 dark:border-surface-dark-border dark:bg-[#1d1d1b]">
        <Clock className="ml-1.5 h-2.5 w-2.5 text-neutral-400" />
        <select
          className="bg-transparent py-0.5 pr-4 pl-1 text-[10px] text-neutral-600 focus:outline-none dark:text-neutral-300"
          value={activeTime}
          onChange={(e) => setActiveTime(e.target.value)}
        >
          <option value="all">Data</option>
          <option value="today">Hoje</option>
          <option value="week">Esta semana</option>
          <option value="month">Este mês</option>
        </select>
      </div>

      {/* Pessoas */}
      <div className="flex items-center gap-1 rounded-md border border-neutral-200 bg-white p-0.5 dark:border-surface-dark-border dark:bg-[#1d1d1b]">
        <Users className="ml-1.5 h-2.5 w-2.5 text-neutral-400" />
        <select className="bg-transparent py-0.5 pr-4 pl-1 text-[10px] text-neutral-600 focus:outline-none dark:text-neutral-300">
          <option value="all">Pessoas</option>
          <option value="me">Atribuído a mim</option>
        </select>
      </div>

      {/* Prioridades */}
      <div className="flex items-center gap-1 rounded-md border border-neutral-200 bg-white p-0.5 dark:border-surface-dark-border dark:bg-[#1d1d1b]">
        <Flag className="ml-1.5 h-2.5 w-2.5 text-neutral-400" />
        <select
          className="bg-transparent py-0.5 pr-4 pl-1 text-[10px] text-neutral-600 focus:outline-none dark:text-neutral-300"
          value={activePriority}
          onChange={(e) => setActivePriority(e.target.value)}
        >
          <option value="all">Prioridade</option>
          <option value="alta">Alta</option>
          <option value="media">Média</option>
          <option value="baixa">Baixa</option>
        </select>
      </div>

      {/* Tags */}
      <div className="flex items-center gap-1 rounded-md border border-neutral-200 bg-white p-0.5 dark:border-surface-dark-border dark:bg-[#1d1d1b]">
        <Tags className="ml-1.5 h-2.5 w-2.5 text-neutral-400" />
        <select className="bg-transparent py-0.5 pr-4 pl-1 text-[10px] text-neutral-600 focus:outline-none dark:text-neutral-300">
          <option value="all">Tags</option>
        </select>
      </div>

      {/* Limpar Filtros */}
      <button className="ml-auto flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-200">
        <X className="h-2.5 w-2.5" />
        Limpar
      </button>
    </div>
  );
}
