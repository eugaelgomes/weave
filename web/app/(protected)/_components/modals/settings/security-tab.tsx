"use client";

import React from "react";
import { SettingsApiTokens } from "./client-tokens-tab";
import { SettingsPageShell } from "@/app/(protected)/_components/modals/settings/_components/settings-page-shell";
import { SessionManagement } from "./session-management";

export default function SecuritySettingsPage() {
  return (
    <SettingsPageShell description="Gerencie tokens e acessos de API da sua conta.">
      <div className="overflow-hidden">
        <div className="p-2">
          {/* 
              A troca de senha foi movida para "Meus dados e preferências" 
              conforme solicitado pelo usuário.
          */}
          <SettingsApiTokens />
          <SessionManagement />
        </div>
      </div>
    </SettingsPageShell>
  );
}
