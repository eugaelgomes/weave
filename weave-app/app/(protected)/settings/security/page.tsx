"use client";

import React from "react";
import { SettingsApiTokens } from "../client-tokens/page";
import { ShieldCheck } from "lucide-react";

export default function SecuritySettingsPage() {
  return (
    <div className="flex w-full flex-col gap-4 p-4">
      {/* 
          A troca de senha foi movida para "Meus dados e preferências" 
          conforme solicitado pelo usuário.
      */}
      <div className="overflow-hidden rounded-md border border-neutral-200/60 bg-white shadow-sm dark:shadow-surface-dark-sm dark:border-surface-dark-border dark:bg-[#1d1d1b]">
        <div className="flex items-center justify-between border-b border-neutral-100/60 px-4 py-2 dark:border-surface-dark-border">
          <h3 className="flex items-center gap-2 text-[11px] font-bold tracking-[0.12em] text-neutral-500 dark:text-neutral-400 uppercase">
            <ShieldCheck className="text-amber-500 h-3.5 w-3.5" />
            Tokens e APIs
          </h3>
        </div>
        <div className="p-4">
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mb-4">
              Gerencie suas chaves de API e tokens de acesso para integrações externas.
            </p>
            <SettingsApiTokens />
        </div>
      </div>
    </div>
  );
}
