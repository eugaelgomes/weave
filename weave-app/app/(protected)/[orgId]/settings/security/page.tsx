"use client";

import React from "react";
import { SettingsApiTokens } from "@/app/(protected)/[orgId]/settings/client-tokens/page";
import { ShieldCheck } from "lucide-react";
import { SettingsPageShell } from "@/app/(protected)/[orgId]/settings/_components/settings-page-shell";

export default function SecuritySettingsPage() {
  return (
    <SettingsPageShell description="Gerencie tokens e acessos de API da sua conta.">
      <div className="overflow-hidden">
        <div className="p-2">
          {/* 
              A troca de senha foi movida para "Meus dados e preferências" 
              conforme solicitado pelo usuário.
          */}
          <div className="dark:shadow-surface-dark-sm dark:border-surface-dark-border overflow-hidden rounded-md border border-neutral-200/60 bg-white shadow-sm dark:bg-[#1d1d1b]">
            <div className="dark:border-surface-dark-border flex items-center justify-between border-b border-neutral-100/60 px-4 py-2">
              <h3 className="flex items-center gap-2 text-[11px] font-bold tracking-[0.12em] text-neutral-500 uppercase dark:text-neutral-400">
                <ShieldCheck className="h-3.5 w-3.5 text-amber-500" />
                Tokens e APIs
              </h3>
            </div>
            <div className="p-4">
              <p className="mb-4 text-[11px] text-neutral-500 dark:text-neutral-400">
                Gerencie suas chaves de API e tokens de acesso para integrações externas.
              </p>
              <SettingsApiTokens />
            </div>
          </div>
        </div>
      </div>
    </SettingsPageShell>
  );
}
