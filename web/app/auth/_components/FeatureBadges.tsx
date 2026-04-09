"use client";

import React, { useState } from "react";
import weaveLogo from "@/public/weave.svg";
import {
  Building2,
  Sparkles,
  Plug,
  Network,
  FolderKanban,
  FileEdit,
  Palette,
  Globe,
  CalendarDays,
  LayoutGrid,
  Hash,
  ShieldCheck,
  Github,
  ChevronRight,
  ChevronDown,
  Notebook,
} from "lucide-react";

// 1. Estrutura de dados hierárquica baseada no seu mapa
const featuresTree = [
  {
    title: "Weave Notes",
    desc: "Plataforma de gestão e produtividade",
    icon: Notebook,
    children: [
      {
        title: "Governança",
        desc: "Estrutura multi-tenant com níveis de acesso",
        icon: Building2,
        children: [
          {
            title: "Estrutura de áreas",
            desc: "Mapeamento de departamentos e equipes",
            icon: Network,
          },
          {
            title: "Projetos",
            desc: "Gestão de iniciativas estratégicas",
            icon: FolderKanban,
            children: [
              {
                title: "Task/Notas e Blocos",
                desc: "Notas modulares para rastrear tarefas",
                icon: FileEdit,
              },
            ],
          },
          {
            title: "Configurações de marca",
            desc: "Padronização visual e de marca",
            icon: Palette,
          },
          {
            title: "Dados de identidade cultural",
            desc: "Mapeamento de valores e cultura corporativa",
            icon: Globe,
          },
        ],
      },
      {
        title: "Weave AI",
        desc: "Assistente para refinamento de conteúdo",
        icon: Sparkles,
      },
      {
        title: "Integrações e Automações",
        desc: "Conecte ferramentas externas e crie fluxos",
        icon: Plug,
        children: [
          { title: "Google", desc: "Workspace e Agenda", icon: CalendarDays },
          { title: "Microsoft", desc: "Office 365", icon: LayoutGrid },
          { title: "Slack", desc: "Comunicação síncrona", icon: Hash },
          { title: "SSO", desc: "Autenticação única", icon: ShieldCheck },
          { title: "GitHub", desc: "Repositórios", icon: Github },
        ],
      },
    ],
  },
];

const BadgeNode = ({ node, isChild = false, isLast = false }: any) => {
  const Icon = node.icon;
  const hasChildren = node.children && node.children.length > 0;
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="group/tree relative flex flex-col bg-transparent">
      <div className="relative z-10 flex items-start gap-2 py-1">
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-1 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-[4px] text-slate-400 transition-colors hover:bg-slate-200/50 hover:text-slate-600"
          >
            {isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </button>
        ) : (
          <div className="h-5 w-5 flex-shrink-0" />
        )}

        <div className="flex items-start gap-3 rounded-md border border-neutral-800/10 bg-white px-2 py-1.5 transition-colors hover:bg-slate-100/50">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-yellow-200/60 bg-white/80 text-brand-primary-700 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
            <Icon className="h-4 w-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm leading-tight font-semibold text-slate-800">{node.title}</span>
            {node.desc && (
              <span className="mt-0.5 text-[10px] leading-snug text-slate-500">{node.desc}</span>
            )}
          </div>
        </div>
      </div>

      {/* Renderização dos Filhos (Sub-áreas) */}
      {hasChildren && isExpanded && (
        <div className="relative ml-2.5 flex flex-col pl-6">
          <div className="pointer-events-none absolute top-[-8px] left-0 h-[4px] border-l-2 border-yellow-500" />
          <div className="flex flex-col">
            {node.children.map((child: any, index: number) => {
              const isChildLast = index === node.children.length - 1;
              return (
                <div key={index} className="relative">
                  {/* Linha curva para este filho */}
                  <div className="pointer-events-none absolute top-[-4px] -left-6 h-[26px] w-6 rounded-bl-xl border-b-2 border-l-2 border-yellow-500" />
                  {/* Continuação da linha vertical se não for o último filho */}
                  {!isChildLast && (
                    <div className="pointer-events-none absolute top-[22px] bottom-[-4px] -left-6 border-l-2 border-yellow-500" />
                  )}
                  <BadgeNode node={child} isChild={true} isLast={isChildLast} />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// 3. Componente Principal Exportado
export function FeatureBadges() {
  return (
    <div className="relative z-10 mx-auto mt-4 flex w-full max-w-xl flex-col p-4">
      {featuresTree.map((topLevelNode, i) => (
        <div key={i} className="flex flex-col">
          <BadgeNode node={topLevelNode} />
        </div>
      ))}
    </div>
  );
}
