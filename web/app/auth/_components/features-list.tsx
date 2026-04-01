import React from "react";
import { FaEye, FaRobot, FaBuilding, FaSearch } from "react-icons/fa";
import { HiDocumentText, HiFolder } from "react-icons/hi2";
import type { IconType } from "react-icons";

type FeatureNode = {
  icon: IconType;
  title: string;
  blurb: string;
  subs: string[];
};

type FeatureCardStyle = {
  card: string;
  hover: string;
  iconWrap: string;
  icon: string;
  line: string;
};

const featureCardStyles: FeatureCardStyle[] = [
  {
    card: "border-yellow-200/80 bg-yellow-50/50",
    hover: "hover:border-yellow-300 hover:shadow-[0_10px_24px_rgba(234,179,8,0.22)]",
    iconWrap: "border-yellow-300/70 bg-yellow-100",
    icon: "text-yellow-700",
    line: "bg-yellow-300/70",
  },
  {
    card: "border-violet-200/80 bg-violet-50/45",
    hover: "hover:border-violet-300 hover:shadow-[0_10px_24px_rgba(139,92,246,0.2)]",
    iconWrap: "border-violet-300/70 bg-violet-100",
    icon: "text-violet-700",
    line: "bg-violet-300/70",
  },
  {
    card: "border-amber-200/80 bg-amber-50/45",
    hover: "hover:border-amber-300 hover:shadow-[0_10px_24px_rgba(245,158,11,0.2)]",
    iconWrap: "border-amber-300/70 bg-amber-100",
    icon: "text-amber-700",
    line: "bg-amber-300/70",
  },
  {
    card: "border-sky-200/80 bg-sky-50/45",
    hover: "hover:border-sky-300 hover:shadow-[0_10px_24px_rgba(14,165,233,0.2)]",
    iconWrap: "border-sky-300/70 bg-sky-100",
    icon: "text-sky-700",
    line: "bg-sky-300/70",
  },
  {
    card: "border-emerald-200/80 bg-emerald-50/45",
    hover: "hover:border-emerald-300 hover:shadow-[0_10px_24px_rgba(16,185,129,0.2)]",
    iconWrap: "border-emerald-300/70 bg-emerald-100",
    icon: "text-emerald-700",
    line: "bg-emerald-300/70",
  },
  {
    card: "border-rose-200/80 bg-rose-50/45",
    hover: "hover:border-rose-300 hover:shadow-[0_10px_24px_rgba(244,63,94,0.2)]",
    iconWrap: "border-rose-300/70 bg-rose-100",
    icon: "text-rose-700",
    line: "bg-rose-300/70",
  },
];

const weaveFeatureTree: FeatureNode[] = [
  {
    icon: FaEye,
    title: "Autenticacao e Conta",
    blurb: "Acesso seguro e recuperacao guiada",
    subs: [
      "Cadastro por email/senha ou Google",
      "Ativacao por verificacao de email",
      "Recuperacao de senha por link",
    ],
  },
  {
    icon: FaRobot,
    title: "Weave AI",
    blurb: "Assistente para produtividade real",
    subs: [
      "Chat integrado com contexto",
      "Ideias e redacao orientada",
      "Suporte sobre a plataforma",
    ],
  },
  {
    icon: HiDocumentText,
    title: "Notas em Blocos",
    blurb: "Edicao modular com persistencia",
    subs: [
      "Blocos de texto, imagem e lista",
      "Reordenacao por drag-and-drop",
      "Autosave e conclusao de notas",
    ],
  },
  {
    icon: HiFolder,
    title: "Projetos Ageis",
    blurb: "Kanban, Scrum e visoes multiplas",
    subs: [
      "Sprints, backlog e prazos",
      "Kanban customizavel com DnD",
      "Kanban, Lista, Calendario e Timeline",
    ],
  },
  {
    icon: FaBuilding,
    title: "Organizações",
    blurb: "Governanca para equipes",
    subs: ["Areas e subareas sem limite", "4 niveis de acesso", "Dominios permitidos com DNS"],
  },
  {
    icon: FaSearch,
    title: "Agenda e Alertas",
    blurb: "Operacao diaria sincronizada",
    subs: [
      "Agenda integrada com Google Calendar",
      "Notificacoes in-app e por email",
      "Eventos e atualizacoes em tempo real",
    ],
  },
];

export default function FeaturesList() {
  return (
    <div className="hidden w-full flex-col justify-center px-4 text-[10px] lg:flex lg:w-1/2 lg:px-8 xl:px-10">
      <div className="mx-auto w-full max-w-xl">
        <div className="flex flex-col items-center text-center">
          <h2 className="mt-2 bg-gradient-to-r from-yellow-500 to-violet-500 bg-clip-text text-xl font-black tracking-tight text-transparent">
            Weave Notes - Tudo o que precisa
          </h2>
          <p className="mt-1 max-w-sm text-[10px] font-medium text-neutral-500">
            Conectamos o núcleo Weave a cada funcionalidade e seus fluxos para dar visibilidade
            clara do que você pode ativar em segundos.
          </p>
        </div>

        <div className="relative mt-4 md:mt-6">
          <span
            className="pointer-events-none absolute -top-6 left-1/2 hidden h-[calc(100%+1.5rem)] w-px -translate-x-1/2 bg-neutral-200 md:block"
            aria-hidden="true"
          />

          <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
            {weaveFeatureTree.map((feature, index) => {
              const Icon = feature.icon;
              const style = featureCardStyles[index % featureCardStyles.length];
              return (
                <div
                  key={feature.title}
                  className={`relative flex flex-col rounded-lg border p-2.5 text-left shadow-[0_6px_16px_rgba(15,23,42,0.08)] transition-all hover:-translate-y-0.5 ${style.card} ${style.hover}`}
                >
                  <span
                    className={`pointer-events-none absolute top-1/2 -left-5 hidden h-px w-5 -translate-y-1/2 md:inline ${style.line}`}
                    aria-hidden="true"
                  />

                  <div className="flex items-center gap-1.5">
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-md border shadow-sm ${style.iconWrap}`}
                    >
                      <Icon className={`h-3.5 w-3.5 ${style.icon}`} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-neutral-900">{feature.title}</p>
                      <p className="text-[9px] text-neutral-600">{feature.blurb}</p>
                    </div>
                  </div>

                  <ul className="mt-1.5 space-y-0.5 border-l border-dashed border-neutral-300 pl-2.5 text-[9px] text-neutral-700">
                    {feature.subs.map((sub) => (
                      <li key={`${feature.title}-${sub}`} className="relative pl-2.5">
                        <span
                          className={`pointer-events-none absolute top-1/2 left-0 h-px w-1.5 -translate-y-1/2 ${style.line}`}
                          aria-hidden="true"
                        />
                        {sub}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
