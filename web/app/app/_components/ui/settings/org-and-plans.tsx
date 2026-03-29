"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Building2, CreditCard, Users, Zap, ExternalLink } from "lucide-react";
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

  const notesUsage = usageDetails?.usage_summary?.notes_total ?? 0;
  const maxNotes = user?.plan_details?.limits?.max_notes;
  const projectsUsage = usageDetails?.usage_summary?.projects_total ?? 0;
  const maxProjects = user?.plan_details?.limits?.max_projects;
  const teamUsage = usageDetails?.usage_summary?.team_members_total ?? 0;
  const maxTeam = user?.plan_details?.limits?.max_team_members;

  const calculateProgress = (usage: number, max?: number) => {
    if (!max) return 0;
    return Math.min((usage / max) * 100, 100);
  };

  // Escala de design Weave
  const cardBase = "flex flex-col overflow-hidden rounded-md border border-neutral-200/60 bg-white shadow-sm dark:border-neutral-800/60 dark:bg-neutral-950 transition-all";
  const headerBase = "flex items-center justify-between border-b border-neutral-100/60 px-4 py-2.5 dark:border-neutral-800/50";
  const headerTitle = "flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-500 dark:text-neutral-400";

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      
      {/* --- Card de Organização --- */}
      <div className={cardBase}>
        <div className={headerBase}>
          <h3 className={headerTitle}>
            <Building2 size={12} className="text-amber-500" />
            Organização
          </h3>
          {user?.org_id && (
            <Link href="/app/organization/settings" className="text-[10px] font-bold text-amber-600 hover:underline flex items-center gap-1">
              Gerenciar <ExternalLink size={10} />
            </Link>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-4 p-4">
          {user?.org_id ? (
            <>
              <div className="flex items-center gap-3">
                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md border border-neutral-100 dark:border-neutral-800">
                  {user.org_logo_url ? (
                    <Image src={user.org_logo_url} alt="Logo" fill className="object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-neutral-100 dark:bg-neutral-900 text-[13px] font-bold text-neutral-500">
                      {user.org_name?.substring(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
                <div>
                  <h4 className="text-[13px] font-bold text-neutral-900 dark:text-neutral-100 leading-tight">
                    {user.org_name}
                  </h4>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-500">@{user.org_unique_name}</p>
                </div>
              </div>

              <div className="mt-auto flex flex-wrap gap-1.5">
                {(Array.isArray(user.org_member_role) ? user.org_member_role : [user.org_member_role]).map((role, idx) => (
                  <span key={idx} className="rounded-md bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-500 ring-1 ring-amber-500/20">
                    {formatRoleName(role as string)}
                  </span>
                ))}
                <span className="rounded-md bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-500 dark:bg-neutral-900 dark:text-neutral-400">
                  Desde {formatDate(user.org_member_since ?? "")}
                </span>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <Users className="h-8 w-8 text-neutral-200 dark:text-neutral-800 mb-2" />
              <p className="text-[11px] font-medium text-neutral-500 max-w-[200px] mb-3">Sem organização ativa no momento.</p>
              <Link href="/app/organization/settings" className="rounded-md bg-amber-500 px-3 py-1.5 text-[11px] font-bold text-neutral-950 shadow-sm hover:bg-amber-400 transition-all">
                Criar Organização
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* --- Card de Plano / Assinatura --- */}
      {user?.plan_id && (
        <div className={cardBase}>
          <div className={headerBase}>
            <h3 className={headerTitle}>
              <CreditCard size={12} className="text-amber-500" />
              Assinatura
            </h3>
            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/20">
              {user.plan_name}
            </span>
          </div>

          <div className="flex flex-1 flex-col gap-4 p-4">
            <div className="space-y-3">
              {/* Progress Bars Compactas */}
              {[
                { label: "Notas", usage: notesUsage, max: maxNotes },
                { label: "Projetos", usage: projectsUsage, max: maxProjects },
                { label: "Membros", usage: teamUsage, max: maxTeam }
              ].map((item, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-tight">
                    <span className="text-neutral-500">{item.label}</span>
                    <span className="text-neutral-900 dark:text-neutral-300">
                      {item.usage} <span className="text-neutral-400">/ {item.max ?? "∞"}</span>
                    </span>
                  </div>
                  {item.max && (
                    <div className="h-1 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-900">
                      <div
                        className="h-full rounded-full bg-amber-500 transition-all duration-700"
                        style={{ width: `${calculateProgress(item.usage, item.max)}%` }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            <div className="mt-auto border-t border-neutral-100 pt-3 dark:border-neutral-900">
              <p className="text-[10px] text-neutral-400 leading-tight italic">
                O seu plano é renovado mensalmente. Limites baseados na cota da organização.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};