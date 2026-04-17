"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Building2,
  CreditCard,
  Users,
  Zap,
  ExternalLink,
  Database,
  FileDown,
  Sparkles,
  Activity,
  X,
  PieChart,
  LayoutTemplate,
} from "lucide-react";
import { formatDate, formatRoleName } from "@/app/_utils/format";
import { User } from "@/app/_services/authentication/auth-service";

interface SettingsOrgAndPlanProps {
  user: User | null;
}

export const SettingsOrgAndPlan: React.FC<SettingsOrgAndPlanProps> = ({ user }) => {
  const [showUsageModal, setShowUsageModal] = useState(false);

  const planDetails = user?.plan_details;
  const usageDetails = user?.usage_details;
  const planLimits = planDetails?.limits;
  const planFeatures = planDetails?.features;
  const weaveAI = planDetails?.weave_ai;
  const monthlyCycle = usageDetails?.monthly_cycle;
  const usageSummary = usageDetails?.usage_summary;
  const historyMetadata = usageDetails?.history_metadata;

  const notesUsage = usageSummary?.notes_total ?? 0;
  const maxNotes = planLimits?.max_notes ?? user?.plan_details?.limits?.max_notes;
  const projectsUsage = usageSummary?.projects_total ?? 0;
  const maxProjects = planLimits?.max_projects ?? user?.plan_details?.limits?.max_projects;
  const teamUsage = usageSummary?.team_members_total ?? 0;
  const maxTeam = planLimits?.max_team_members ?? user?.plan_details?.limits?.max_team_members;

  const storageUsage = monthlyCycle?.storage?.total_uploaded_mb ?? 0;
  const storageLimit = planLimits?.storage?.total_monthly_upload_mb;
  const aiMessagesUsage = monthlyCycle?.weave_ai?.messages_sent ?? 0;
  const aiMessagesLimit = weaveAI?.config?.monthly_messages;
  const exportsNotesUsage = monthlyCycle?.exports?.notes_count ?? 0;
  const exportsNotesLimit = planLimits?.exports?.notes_monthly;
  const exportsBackupUsage = monthlyCycle?.exports?.backups_count ?? 0;
  const exportsBackupLimit = planLimits?.exports?.backups_monthly;

  const calculateProgress = (usage: number, max?: number) => {
    if (!max) return 0;
    return Math.min((usage / max) * 100, 100);
  };

  const featureLabels: Record<string, string> = {
    dark_mode: "Modo Escuro",
    custom_branding: "Branding Custom",
    priority_support: "Suporte Prioritário",
    collaboration_tools: "Colaboração",
  };

  // Escala de design padrão
  const cardBase =
    "flex flex-col overflow-hidden rounded-md border border-neutral-200/60 bg-white shadow-sm dark:border-neutral-800/60 dark:bg-neutral-950 transition-all";
  const headerBase =
    "flex items-center justify-between border-b border-neutral-100/60 px-4 py-2.5 dark:border-neutral-800/50";
  const headerTitle =
    "flex items-center gap-2 text-[11px] font-bold tracking-[0.15em] text-neutral-500 dark:text-neutral-400";

  return (
    <>
      {/* Container Principal com Título */}
      <div className="overflow-hidden rounded-md border border-neutral-200 bg-neutral-100/50 dark:border-neutral-800/60 dark:bg-neutral-950">
        {/* Título Geral da Seção */}
        <div className="flex items-center justify-between border-b border-neutral-200/80 bg-white/50 px-4 py-3 dark:border-neutral-800/80 dark:bg-neutral-950">
          <h3 className="flex items-center gap-2 text-[12px] font-bold tracking-[0.15em] text-neutral-600 dark:text-neutral-300">
            <LayoutTemplate size={14} className="text-amber-500" />
            Plano e Organização
          </h3>
        </div>

        {/* Grid com Fundo Requisitado */}
        <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-3">
          {/* Card 1: Organização (Ocupa 1 coluna em telas grandes) */}
          <div className={`${cardBase} lg:col-span-1`}>
            <div className={headerBase}>
              <h3 className={headerTitle}>
                <Building2 size={13} className="text-amber-500" />
                Organização
              </h3>
              {user?.org_id && (
                <Link
                  href="/app/organization/settings"
                  className="flex items-center gap-1 text-[10px] font-bold text-amber-600 transition-colors hover:text-amber-700"
                >
                  Gerenciar <ExternalLink size={10} />
                </Link>
              )}
            </div>

            <div className="flex flex-1 flex-col gap-4 p-4">
              {user?.org_id ? (
                <>
                  <div className="flex items-center gap-3">
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md border border-neutral-100 dark:border-neutral-800">
                      {user.org_logo_url ? (
                        <Image src={user.org_logo_url} alt="Logo" fill className="object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-neutral-100 text-[14px] font-black text-neutral-400 dark:bg-neutral-800">
                          {user.org_name?.substring(0, 2).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 className="text-[14px] leading-tight font-bold text-neutral-900 dark:text-neutral-100">
                        {user.org_name}
                      </h4>
                      <p className="text-[11px] font-medium text-neutral-500 dark:text-neutral-500">
                        @{user.org_unique_name}
                      </p>
                    </div>
                  </div>

                  <div className="mt-auto flex flex-col gap-2 pt-2 sm:flex-row sm:flex-wrap sm:items-center">
                    {(Array.isArray(user.org_member_role)
                      ? user.org_member_role
                      : [user.org_member_role]
                    ).map((role, idx) => (
                      <span
                        key={idx}
                        className="w-fit rounded-md bg-amber-500/10 px-2 py-1 text-[10px] font-bold tracking-wide text-amber-700 ring-1 ring-amber-500/20 dark:text-amber-500"
                      >
                        {formatRoleName(role as string)}
                      </span>
                    ))}
                    <span className="w-fit rounded-md bg-neutral-100 px-2 py-1 text-[10px] font-medium text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                      Desde {formatDate(user.org_member_since ?? "")}
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex h-full flex-col items-center justify-center py-4 text-center">
                  <Users className="mb-2 h-8 w-8 text-neutral-200 dark:text-neutral-700" />
                  <p className="mb-3 max-w-[200px] text-[11px] font-medium text-neutral-500">
                    Você não faz parte de nenhuma organização ativa.
                  </p>
                  <Link
                    href="/app/organization/settings"
                    className="rounded-md bg-amber-500 px-4 py-1.5 text-[11px] font-bold text-neutral-950 shadow-sm transition-all hover:bg-amber-400 active:scale-95"
                  >
                    Criar Organização
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Card 2: Detalhes do Plano (Ocupa 2 colunas em telas grandes) */}
          {user?.plan_id && (
            <div className={`${cardBase} lg:col-span-2`}>
              <div className={headerBase}>
                <h3 className={headerTitle}>
                  <CreditCard size={13} className="text-amber-500" />
                  Plano e Assinatura
                </h3>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-black tracking-wider text-emerald-600 uppercase ring-1 ring-emerald-500/20 dark:text-emerald-400">
                    {user.plan_name}
                  </span>
                </div>
              </div>

              <div className="flex flex-1 flex-col gap-6 p-4 md:flex-row">
                {/* Esquerda: Info Básica & Call to Action para Uso */}
                <div className="flex w-full flex-col items-start justify-between gap-4 border-b border-neutral-100/60 pb-4 md:w-1/3 md:border-r md:border-b-0 md:pr-4 md:pb-0 dark:border-neutral-800/60">
                  <div className="space-y-3">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold tracking-widest text-neutral-400 uppercase">
                        Ciclo Atual
                      </span>
                      <p className="text-[12px] font-medium text-neutral-700 dark:text-neutral-300">
                        {formatDate(monthlyCycle?.current_period_start ?? "")} –{" "}
                        {formatDate(monthlyCycle?.current_period_end ?? "")}
                      </p>
                      {planDetails?.metadata?.plan_tier && (
                        <p className="text-[10px] text-neutral-500">
                          Tier: {planDetails.metadata.plan_tier}
                        </p>
                      )}
                    </div>

                    {historyMetadata?.usage_percentage_total && (
                      <div className="flex items-center gap-2 rounded-md border border-neutral-100 bg-neutral-50 p-2 dark:border-neutral-700/50 dark:bg-neutral-800/50">
                        <PieChart size={14} className="text-amber-500" />
                        <span className="text-[10px] font-bold text-neutral-600 dark:text-neutral-400">
                          {historyMetadata.usage_percentage_total}% da cota utilizada
                        </span>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => setShowUsageModal(true)}
                    className="group flex w-full items-center justify-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-[11px] font-bold text-amber-700 transition-all hover:bg-amber-100 active:scale-95 dark:border-amber-900/30 dark:bg-amber-900/10 dark:text-amber-500 dark:hover:bg-amber-900/20"
                  >
                    <Activity size={12} className="transition-transform group-hover:scale-110" />
                    Ver Detalhes de Uso
                  </button>
                </div>

                {/* Direita: Features do Plano */}
                <div className="flex w-full flex-col md:w-2/3">
                  <div className="mb-3 flex items-center gap-2 text-[10px] font-bold tracking-wider text-neutral-500 uppercase">
                    <Zap size={12} className="text-amber-500" /> Recursos Inclusos
                  </div>
                  {planFeatures ? (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {Object.entries(planFeatures).map(([key, value]) => (
                        <div
                          key={key}
                          className={`flex items-center justify-between rounded-md px-3 py-2 text-[10px] font-bold transition-colors ${
                            value
                              ? "border border-neutral-100 bg-neutral-50/80 text-neutral-700 dark:border-neutral-800/80 dark:bg-neutral-800/50 dark:text-neutral-300"
                              : "bg-transparent text-neutral-400 opacity-60"
                          }`}
                        >
                          <span>{featureLabels[key] ?? key}</span>
                          {value ? <span className="text-emerald-500">Ativo</span> : <span>—</span>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-neutral-400">Nenhum recurso listado.</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL: Métricas de Uso e Limites */}
      {showUsageModal && (
        <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm transition-all duration-300">
          <div className="animate-in zoom-in-95 w-full max-w-3xl overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-neutral-950">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-neutral-100 bg-neutral-50/50 px-6 py-4 dark:border-neutral-800 dark:bg-neutral-900/20">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-amber-500/10 text-amber-500">
                  <Activity size={16} />
                </div>
                <div>
                  <h2 className="text-[13px] font-bold text-neutral-900 dark:text-neutral-100">
                    Métricas de Uso do Sistema
                  </h2>
                  <p className="text-[11px] text-neutral-500">
                    Ciclo atual: {formatDate(monthlyCycle?.current_period_start ?? "")} até{" "}
                    {formatDate(monthlyCycle?.current_period_end ?? "")}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowUsageModal(false)}
                className="rounded-md p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-300"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              {/* Barras de Progresso Principais */}
              <div className="grid gap-6 sm:grid-cols-3">
                {[
                  { label: "Tarefas Criadas", usage: notesUsage, max: maxNotes },
                  { label: "Projetos Ativos", usage: projectsUsage, max: maxProjects },
                  { label: "Membros na Equipe", usage: teamUsage, max: maxTeam },
                ].map((item, i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-bold tracking-tight">
                      <span className="text-neutral-500">{item.label}</span>
                      <span className="text-neutral-900 dark:text-neutral-200">
                        {item.usage}{" "}
                        <span className="font-medium text-neutral-400">/ {item.max ?? "∞"}</span>
                      </span>
                    </div>
                    {item.max && (
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${
                            calculateProgress(item.usage, item.max) > 90
                              ? "bg-red-500"
                              : "bg-amber-500"
                          }`}
                          style={{ width: `${calculateProgress(item.usage, item.max)}%` }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="my-6 h-px w-full bg-neutral-100 dark:bg-neutral-800/60" />

              {/* Cards Específicos (Storage, Export, AI) */}
              <div className="grid gap-4 md:grid-cols-3">
                {/* Storage */}
                <div className="flex flex-col rounded-md border border-neutral-100 bg-neutral-50/50 p-4 transition-colors dark:border-neutral-800/50 dark:bg-neutral-900/30">
                  <div className="mb-2 flex items-center gap-2 text-[10px] font-bold tracking-wider text-neutral-500 uppercase">
                    <Database size={12} className="text-amber-500" /> Armazenamento
                  </div>
                  <div className="mb-1 flex items-end gap-1">
                    <p className="text-[24px] leading-none font-bold text-neutral-900 dark:text-neutral-50">
                      {storageUsage.toFixed(1)}
                    </p>
                    <span className="mb-0.5 text-[11px] font-medium text-neutral-400">MB</span>
                  </div>
                  <p className="text-[10px] text-neutral-500">
                    Limite: {storageLimit ? `${storageLimit} MB` : "Ilimitado"}
                  </p>
                  {storageLimit && (
                    <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-neutral-200/60 dark:bg-neutral-800">
                      <div
                        className="h-full rounded-full bg-emerald-500"
                        style={{ width: `${calculateProgress(storageUsage, storageLimit)}%` }}
                      />
                    </div>
                  )}
                </div>

                {/* Exports */}
                <div className="flex flex-col rounded-md border border-neutral-100 bg-neutral-50/50 p-4 transition-colors dark:border-neutral-800/50 dark:bg-neutral-900/30">
                  <div className="mb-2 flex items-center gap-2 text-[10px] font-bold tracking-wider text-neutral-500 uppercase">
                    <FileDown size={12} className="text-amber-500" /> Exportações
                  </div>
                  <div className="mt-1 space-y-2 text-[11px] font-medium text-neutral-600 dark:text-neutral-400">
                    <div className="flex justify-between">
                      <span>Tarefas</span>
                      <span className="font-bold text-neutral-900 dark:text-neutral-200">
                        {exportsNotesUsage}{" "}
                        <span className="font-normal text-neutral-400">
                          / {exportsNotesLimit ?? "∞"}
                        </span>
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Backups</span>
                      <span className="font-bold text-neutral-900 dark:text-neutral-200">
                        {exportsBackupUsage}{" "}
                        <span className="font-normal text-neutral-400">
                          / {exportsBackupLimit ?? "∞"}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Weave AI */}
                <div className="flex flex-col rounded-md border border-neutral-100 bg-neutral-50/50 p-4 transition-colors dark:border-neutral-800/50 dark:bg-neutral-900/30">
                  <div className="mb-2 flex items-center gap-2 text-[10px] font-bold tracking-wider text-neutral-500 uppercase">
                    <Sparkles size={12} className="text-amber-500" /> Weave AI
                  </div>
                  {weaveAI?.enabled ? (
                    <>
                      <div className="mb-1 flex items-end gap-1">
                        <p className="text-[24px] leading-none font-bold text-neutral-900 dark:text-neutral-50">
                          {aiMessagesUsage}
                        </p>
                        <span className="mb-0.5 text-[11px] font-medium text-neutral-400">
                          msgs
                        </span>
                      </div>
                      <p className="text-[10px] text-neutral-500">
                        Limite: {aiMessagesLimit ?? "Ilimitado"}
                      </p>
                      {aiMessagesLimit && (
                        <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-neutral-200/60 dark:bg-neutral-800">
                          <div
                            className="h-full rounded-full bg-indigo-500"
                            style={{
                              width: `${calculateProgress(aiMessagesUsage, aiMessagesLimit)}%`,
                            }}
                          />
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex flex-1 items-center justify-center">
                      <p className="text-[11px] font-medium text-neutral-400 italic">
                        Não incluso no plano atual.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end border-t border-neutral-100 bg-neutral-50/50 px-6 py-4 dark:border-neutral-800 dark:bg-neutral-900/20">
              <button
                onClick={() => setShowUsageModal(false)}
                className="rounded-md bg-neutral-900 px-5 py-2 text-[11px] font-bold text-white transition-all hover:bg-neutral-800 active:scale-95 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-white"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
