"use client";

import { Loader2, Search, UserPlus, X } from "lucide-react";

import { type SearchUser } from "@/app/_contexts/notes-context";

interface NoteShareModalProps {
  isOpen: boolean;
  isSearching: boolean;
  onClose: () => void;
  onSearchUsers: (value: string) => void;
  onShareNote: (userId: string) => void;
  searchResults: SearchUser[];
  searchTerm: string;
}

export function NoteShareModal({
  isOpen,
  isSearching,
  onClose,
  onSearchUsers,
  onShareNote,
  searchResults,
  searchTerm,
}: NoteShareModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="animate-in fade-in slide-in-from-bottom-4 sm:zoom-in-95 w-full max-w-md rounded-t-xl border border-neutral-200 bg-white p-5 shadow-2xl duration-200 sm:rounded-md sm:p-6 dark:border-surface-dark-border-strong dark:bg-[#1d1d1b]">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-neutral-300 sm:hidden dark:bg-neutral-600" />
        <div className="mb-5 flex items-center justify-between">
          <h3 className="flex items-center gap-2.5 text-base font-semibold text-neutral-900 sm:text-lg dark:text-neutral-100">
            <div className="dark:bg-brand-primary-500/10 flex h-8 w-8 items-center justify-center rounded-md bg-yellow-50">
              <UserPlus size={16} className="dark:text-brand-primary-500 text-yellow-600" />
            </div>
            Compartilhar Tarefa
          </h3>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
            title="Fechar modal"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Buscar usuário por email
            </label>
            <div className="relative">
              <Search className="absolute top-1/2 left-3 -translate-y-1/2 text-neutral-400" size={15} />
              <input
                type="email"
                value={searchTerm}
                onChange={(e) => onSearchUsers(e.target.value)}
                placeholder="Digite o email do usuário..."
                className="w-full rounded-md border border-neutral-200 bg-neutral-50 py-3 pr-4 pl-10 text-sm text-neutral-900 placeholder-neutral-400 transition-all focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 focus:outline-none sm:py-2.5 dark:border-surface-dark-border-strong dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-500 dark:focus:border-yellow-500/50"
              />
              {isSearching ? (
                <div className="absolute top-1/2 right-3 -translate-y-1/2">
                  <Loader2 size={15} className="dark:text-brand-primary-500 animate-spin text-yellow-600" />
                </div>
              ) : null}
            </div>
          </div>

          {searchResults.length > 0 ? (
            <div className="max-h-48 space-y-1.5 overflow-y-auto sm:max-h-36">
              {searchResults.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between rounded-md border border-neutral-100 bg-neutral-50 p-2.5 transition-colors hover:bg-neutral-100 dark:border-surface-dark-border dark:bg-neutral-800 dark:hover:bg-neutral-700"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <div className="dark:bg-brand-primary-500/20 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-yellow-100">
                      <span className="dark:text-brand-primary-500 text-xs font-bold text-yellow-700">
                        {(user.name || user.username).charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-neutral-800 dark:text-neutral-200">
                        {user.name || user.username}
                      </div>
                      <div className="truncate text-xs text-neutral-500 dark:text-neutral-400">
                        {user.email}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => onShareNote(user.id)}
                    className="bg-brand-primary-500 ml-2 flex-shrink-0 rounded-md px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-yellow-600 dark:bg-neutral-50 dark:text-neutral-950 dark:hover:bg-neutral-200"
                  >
                    Adicionar
                  </button>
                </div>
              ))}
            </div>
          ) : null}

          <div className="flex justify-end border-t border-neutral-100 pt-4 dark:border-surface-dark-border">
            <button
              onClick={onClose}
              className="rounded-md px-4 py-2.5 text-sm font-medium text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-700 sm:py-2 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}