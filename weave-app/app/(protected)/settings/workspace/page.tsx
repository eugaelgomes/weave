"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Building2,
  Users,
  ExternalLink,
  LayoutTemplate,
} from "lucide-react";
import { formatDate, formatRoleName } from "@/app/_utils/format";
import { useAuth } from "@/app/_contexts/auth-context";

export default function WorkspaceSettingsPage() {
  const { user } = useAuth();

  // Escala de design padrão
  const cardBase =
    "flex flex-col overflow-hidden rounded-md border border-neutral-200/60 bg-white shadow-sm dark:shadow-surface-dark-sm dark:border-surface-dark-border dark:bg-[#1d1d1b] transition-all";
  const headerBase =
    "flex items-center justify-between border-b border-neutral-100/60 px-4 py-2.5 dark:border-surface-dark-border-muted";
  const headerTitle =
    "flex items-center gap-2 text-[11px] font-bold tracking-[0.15em] text-neutral-500 dark:text-neutral-400";

  return (
    <>
      <div className="overflow-hidden rounded-md border border-neutral-200 bg-neutral-100/50 dark:border-surface-dark-border dark:bg-[#1d1d1b]">
        <div className="flex items-center justify-between border-b border-neutral-200/80 bg-white/50 px-4 py-3 dark:border-surface-dark-border-strong dark:bg-[#1d1d1b]">
          <h3 className="flex items-center gap-2 text-[12px] font-bold tracking-[0.15em] text-neutral-600 dark:text-neutral-300">
            <LayoutTemplate size={14} className="text-amber-500" />
            Workspace
          </h3>
        </div>

        <div className="p-4">
          <div className={cardBase}>
            <div className={headerBase}>
              <h3 className={headerTitle}>
                <Building2 size={13} className="text-amber-500" />
                Workspace Detalhes
              </h3>
              {user?.org_id && (
                <Link
                  href="/organization/settings"
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
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md border border-neutral-100 dark:border-surface-dark-border">
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
                    Você não faz parte de nenhum Workspace ativo.
                  </p>
                  <Link
                    href="/organization/create"
                    className="rounded-md bg-amber-500 px-4 py-1.5 text-[11px] font-bold text-neutral-950 shadow-sm transition-all hover:bg-amber-400 active:scale-95"
                  >
                    Criar Workspace
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
