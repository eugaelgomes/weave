"use client";

import React from "react";
import { AlertTriangle, Download, Trash2, Loader2 } from "lucide-react";

interface SettingsDangerZoneProps {
  handleCreateBackup: () => void;
  backupLoading: boolean;
  backupMessage: string;
  backupError: string;
  handleDeleteAccount: () => void;
}

export const SettingsDangerZone: React.FC<SettingsDangerZoneProps> = ({
  handleCreateBackup,
  backupLoading,
  backupMessage,
  backupError,
  handleDeleteAccount,
}) => {
  return (
    <div className="overflow-hidden rounded-xl border border-red-200/60 bg-white shadow-sm transition-all dark:border-red-900/30 dark:bg-neutral-950">
      <div className="flex items-center justify-between border-b border-red-100/60 px-5 py-3 dark:border-red-900/20">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-neutral-200 dark:text-neutral-100">
          <AlertTriangle className="h-4 w-4 text-red-500" />
          Zona de Perigo
        </h3>
      </div>

      <div className="flex flex-col gap-5 p-5">
        {/* Item: Exportar Dados (Ação Segura) */}
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-xl space-y-1">
            <h4 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
              Exportar Dados
            </h4>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Descarregue uma cópia completa das suas notas, projetos e configurações em formato
              JSON/Zip.
            </p>
            {/* Mensagens de Feedback */}
            {(backupMessage || backupError) && (
              <p
                className={`pt-1 text-xs font-medium ${
                  backupError
                    ? "text-red-500 dark:text-red-400"
                    : "text-yellow-600 dark:text-yellow-500"
                }`}
              >
                {backupError || backupMessage}
              </p>
            )}
          </div>
          <button
            onClick={handleCreateBackup}
            disabled={backupLoading}
            className="flex w-full shrink-0 items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 py-2 text-xs font-medium text-neutral-700 shadow-sm transition-colors hover:bg-neutral-50 hover:text-neutral-900 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 focus:outline-none disabled:opacity-50 sm:w-60 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
          >
            {backupLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            Fazer Cópia de Segurança
          </button>
        </div>

        {/* Separador */}
        <div className="h-px w-full bg-red-100/60 dark:bg-red-900/20" />

        {/* Item: Eliminar Conta (Ação Destrutiva) */}
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-xl space-y-1">
            <h4 className="text-sm font-medium text-red-700 dark:text-red-400">Eliminar Conta</h4>
            <p className="text-xs text-red-600/80 dark:text-red-400/70">
              Esta ação é permanente. Todos os seus dados, projetos e notas serão removidos sem
              possibilidade de recuperação.
            </p>
          </div>
          <button
            onClick={handleDeleteAccount}
            className="flex w-full shrink-0 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:outline-none sm:w-60 dark:bg-red-500/10 dark:text-red-500 dark:hover:bg-red-600 dark:hover:text-white dark:focus:ring-offset-neutral-950"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Eliminar Permanentemente
          </button>
        </div>
      </div>
    </div>
  );
};
