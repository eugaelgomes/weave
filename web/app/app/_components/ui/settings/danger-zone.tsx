"use client";

import React, { useState } from "react";
import { AlertTriangle, Download, Trash2, Loader2, X } from "lucide-react";

// --- Sub-componente Interno de Modal (Ajustado para a nova escala) ---
const ConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText,
  variant = "primary",
  isLoading = false,
}: any) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-[320px] overflow-hidden rounded-md border border-neutral-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-neutral-950">
        <div className="flex items-center justify-between border-b border-neutral-100 px-3 py-2 dark:border-neutral-900">
          <span className="text-[10px] font-bold tracking-widest text-neutral-400">
            Verificação
          </span>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600">
            <X size={14} />
          </button>
        </div>
        <div className="space-y-2 p-4">
          <h3 className="text-[13px] font-bold text-neutral-900 dark:text-neutral-100">{title}</h3>
          <p className="text-[11px] leading-tight text-neutral-500 dark:text-neutral-400">
            {description}
          </p>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-neutral-100 bg-neutral-50 px-3 py-2.5 dark:border-neutral-900 dark:bg-neutral-900/50">
          <button onClick={onClose} className="px-3 py-1 text-[11px] font-medium text-neutral-500">
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className={`rounded-md px-4 py-1.5 text-[11px] font-bold text-white ${
              variant === "danger"
                ? "bg-red-600 hover:bg-red-700"
                : "bg-neutral-900 dark:bg-neutral-100 dark:text-neutral-900"
            }`}
          >
            {isLoading ? "..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export const SettingsDangerZone: React.FC<any> = ({
  handleCreateBackup,
  backupLoading,
  backupMessage,
  backupError,
  handleDeleteAccount,
}) => {
  const [modalBackup, setModalBackup] = useState(false);
  const [modalDelete, setModalDelete] = useState(false);

  // Botão reduzido para w-40 (160px) para alinhar com a delicadeza do sidebar
  const btnBase =
    "flex w-full sm:w-40 shrink-0 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-bold transition-all shadow-sm disabled:opacity-50";

  return (
    <div className="overflow-hidden rounded-md border border-red-200/50 bg-white shadow-sm dark:border-red-900/20 dark:bg-neutral-950">
      {/* Header seguindo a escala do "Acesso Recente" do sidebar */}
      <div className="flex items-center justify-between border-b border-red-100/40 px-4 py-2 dark:border-red-900/10">
        <h3 className="flex items-center gap-2 text-[10px] font-bold tracking-[0.15em] text-neutral-500 dark:text-neutral-400">
          <AlertTriangle className="text-red-500" size={12} />
          Zona de Perigo
        </h3>
      </div>

      <div className="flex flex-col gap-4 p-4">
        {/* Item 1: Exportar */}
        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <div className="space-y-0.5">
            <h4 className="text-[12px] font-bold text-neutral-800 dark:text-neutral-100">
              Exportar Dados
            </h4>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
              Backup completo de dados (JSON/Zip).
            </p>
          </div>
          <button
            onClick={() => setModalBackup(true)}
            className={`${btnBase} border border-neutral-200 text-neutral-700 hover:bg-neutral-50 dark:border-neutral-800 dark:text-neutral-300`}
          >
            <Download size={13} /> Exportar Dados
          </button>
        </div>

        <div className="h-px w-full bg-neutral-100 dark:bg-neutral-900" />

        {/* Item 2: Deletar */}
        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <div className="space-y-0.5">
            <h4 className="text-[12px] font-bold text-red-600 dark:text-red-500">Eliminar Conta</h4>
            <p className="text-[11px] text-red-600/70 dark:text-red-400/60">
              Ação irreversível. Todos os dados serão deletados.
            </p>
          </div>
          <button
            onClick={() => setModalDelete(true)}
            className={`${btnBase} bg-red-600 text-white hover:bg-red-700`}
          >
            <Trash2 size={13} /> Deletar Conta
          </button>
        </div>
      </div>

      {/* Modais Integrados */}
      <ConfirmationModal
        isOpen={modalBackup}
        onClose={() => setModalBackup(false)}
        onConfirm={() => {
          handleCreateBackup();
          setModalBackup(false);
        }}
        title="Exportar Dados?"
        description="Iremos preparar um pacote com todo o seu conteúdo estruturado."
        confirmText="Confirmar"
        isLoading={backupLoading}
      />

      <ConfirmationModal
        isOpen={modalDelete}
        onClose={() => setModalDelete(false)}
        onConfirm={handleDeleteAccount}
        variant="danger"
        title="Excluir Conta?"
        description="Isso apagará permanentemente todos os seus dados sem volta."
        confirmText="Excluir Tudo"
      />
    </div>
  );
};
