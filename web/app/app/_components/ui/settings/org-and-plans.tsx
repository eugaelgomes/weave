"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Building2, CreditCard, Users, Zap } from "lucide-react";
import { formatDate, formatRoleName } from "@/app/_utils/format";
import { User } from "@/app/_services/authentication/auth-service";

interface UsageDetails {
  usage_summary?: {
    notes_total?: number;
    projects_total?: number;
    team_members_total?: number;
  };
}

interface SettingsOrgAndPlanProps {
  user: User | null;
}

export const SettingsOrgAndPlan: React.FC<SettingsOrgAndPlanProps> = ({ user }) => {
  const usageDetails = user?.usage_details as UsageDetails | undefined;
  
  // Helpers para progresso
  const notesUsage = usageDetails?.usage_summary?.notes_total ?? 0;
  const maxNotes = user?.plan_details?.limits?.max_notes;
  const projectsUsage = usageDetails?.usage_summary?.projects_total ?? 0;
  const maxProjects = user?.plan_details?.limits?.max_projects;
  const teamUsage = usageDetails?.usage_summary?.team_members_total ?? 0;
  const maxTeam = user?.plan_details?.limits?.max_team_members;

  // Função para calcular largura da barra limitando a 100%
  const calculateProgress = (usage: number, max?: number) => {
    if (!max) return 0;
    return Math.min((usage / max) * 100, 100);
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Card de Organização */}
      {user?.org_id ? (
        <div className="flex flex-col overflow-hidden rounded-xl border border-neutral-200/60 bg-white shadow-sm transition-all dark:border-neutral-800/60 dark:bg-neutral-950">
          <div className="flex items-center justify-between border-b border-neutral-100/60 px-5 py-4 dark:border-neutral-800/50">
            <h3 className="flex items-center gap-2 text-sm font-medium text-neutral-900 dark:text-neutral-100">
              <Building2 className="h-4 w-4 text-yellow-500" /> 
              Organização
            </h3>
          </div>
          
          <div className="flex flex-1 flex-col gap-5 p-5">
            <div className="flex items-center gap-4">
              {user.org_logo_url ? (
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-neutral-100 shadow-sm dark:border-neutral-800">
                  <Image
                    src={user.org_logo_url}
                    alt={user.org_name || "Organization logo"}
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-900">
                  <span className="text-lg font-semibold text-neutral-500 dark:text-neutral-400">
                    {user.org_name?.substring(0, 2).toUpperCase()}
                  </span>
                </div>
              )}
              <div className="flex flex-col">
                <h4 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                  {user.org_name}
                </h4>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  @{user.org_unique_name}
                </p>
              </div>
            </div>

            <div className="mt-auto flex flex-wrap gap-2 pt-2">
              {user.org_member_role &&
                (Array.isArray(user.org_member_role)
                  ? user.org_member_role
                  : [user.org_member_role]
                ).map((role, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center rounded-md bg-yellow-500/10 px-2 py-1 text-xs font-medium text-yellow-700 ring-1 ring-inset ring-yellow-500/20 dark:bg-yellow-500/10 dark:text-yellow-500 dark:ring-yellow-500/20"
                  >
                    {formatRoleName(role)}
                  </span>
                ))}
              <span className="inline-flex items-center rounded-md bg-neutral-100 px-2 py-1 text-xs font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
                Membro desde {formatDate(user.org_member_since ?? "")}
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* Empty State Organização */
        <div className="flex flex-col overflow-hidden rounded-xl border border-neutral-200/60 bg-white shadow-sm transition-all dark:border-neutral-800/60 dark:bg-neutral-950">
          <div className="flex items-center justify-between border-b border-neutral-100/60 px-5 py-4 dark:border-neutral-800/50">
            <h3 className="flex items-center gap-2 text-sm font-medium text-neutral-900 dark:text-neutral-100">
              <Building2 className="h-4 w-4 text-yellow-500" /> 
              Organização
            </h3>
          </div>
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-50 dark:bg-neutral-900">
              <Users className="h-5 w-5 text-neutral-400" />
            </div>
            <p className="max-w-[250px] text-xs text-neutral-500 dark:text-neutral-400">
              Você ainda não faz parte de nenhuma organização no momento.
            </p>
            <Link
              href="/app/organization/settings"
              className="mt-2 inline-flex items-center gap-2 rounded-lg bg-yellow-500 px-5 py-2 text-sm font-semibold text-neutral-950 shadow-sm transition-all hover:bg-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 dark:focus:ring-offset-neutral-950"
            >
              <Zap className="h-4 w-4" />
              Criar Organização
            </Link>
          </div>
        </div>
      )}

      {/* Card de Plano */}
      {user?.plan_id &&
        (user.org_member_role === "admin" || user.org_member_role === "super_admin") && (
          <div className="flex flex-col overflow-hidden rounded-xl border border-neutral-200/60 bg-white shadow-sm transition-all dark:border-neutral-800/60 dark:bg-neutral-950">
            <div className="flex items-center justify-between border-b border-neutral-100/60 px-5 py-4 dark:border-neutral-800/50">
              <h3 className="flex items-center gap-2 text-sm font-medium text-neutral-900 dark:text-neutral-100">
                <CreditCard className="h-4 w-4 text-yellow-500" /> 
                Assinatura
              </h3>
              <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-600 ring-1 ring-inset ring-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400">
                Ativo
              </span>
            </div>
            
            <div className="flex flex-1 flex-col gap-5 p-5">
              <div className="flex items-baseline justify-between">
                <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                  Plano Atual
                </span>
                <span className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                  {user.plan_name}
                </span>
              </div>

              {/* Limites e Consumo */}
              <div className="mt-auto space-y-4 pt-2">
                
                {/* Notas */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-neutral-500 dark:text-neutral-400">
                      Notas
                    </span>
                    <span className="font-mono text-neutral-700 dark:text-neutral-300">
                      {notesUsage} / {maxNotes ?? "∞"}
                    </span>
                  </div>
                  {maxNotes && (
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800/60">
                      <div
                        className="h-full rounded-full bg-yellow-500 transition-all duration-500"
                        style={{ width: `${calculateProgress(notesUsage, maxNotes)}%` }}
                      />
                    </div>
                  )}
                </div>

                {/* Projetos */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-neutral-500 dark:text-neutral-400">
                      Projetos
                    </span>
                    <span className="font-mono text-neutral-700 dark:text-neutral-300">
                      {projectsUsage} / {maxProjects ?? "∞"}
                    </span>
                  </div>
                  {maxProjects && (
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800/60">
                      <div
                        className="h-full rounded-full bg-yellow-500 transition-all duration-500"
                        style={{ width: `${calculateProgress(projectsUsage, maxProjects)}%` }}
                      />
                    </div>
                  )}
                </div>

                {/* Membros */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-neutral-500 dark:text-neutral-400">
                      Membros da Equipa
                    </span>
                    <span className="font-mono text-neutral-700 dark:text-neutral-300">
                      {teamUsage} / {maxTeam ?? "∞"}
                    </span>
                  </div>
                  {maxTeam && (
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800/60">
                      <div
                        className="h-full rounded-full bg-yellow-500 transition-all duration-500"
                        style={{ width: `${calculateProgress(teamUsage, maxTeam)}%` }}
                      />
                    </div>
                  )}
                </div>

              </div>
            </div>
          </div>
        )}
    </div>
  );
};