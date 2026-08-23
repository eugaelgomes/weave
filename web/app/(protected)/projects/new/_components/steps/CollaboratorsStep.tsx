"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { AlertCircle, Loader2, Plus, Trash2, Users } from "lucide-react";
import { useNotes, type SearchUser } from "@/app/_contexts/notes-context";
import { useProjects } from "@/app/_contexts/projects-context";
import getStorageUrl from "@/app/_utils/get-storage-url";
import type { CreateProjectWizardStepProps } from "@/app/(protected)/projects/new/_components/create-project-wizard.types";

const COLLAB_ROLES: Array<{ value: string; label: string }> = [
  { value: "contributor", label: "Contribuidor" },
  { value: "project_manager", label: "Gestor de projeto" },
  { value: "commenter", label: "Comentador" },
  { value: "viewer", label: "Leitor" },
];

export function CollaboratorsStep({ state, actions }: CreateProjectWizardStepProps) {
  const { searchUsers } = useNotes();
  const { postProjectCollaborator } = useProjects();

  const [collabSearch, setCollabSearch] = useState("");
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [inviteRole, setInviteRole] = useState("contributor");
  const [applyBusy, setApplyBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [errorByUserId, setErrorByUserId] = useState<Record<string, string>>({});

  const pendingIds = useMemo(
    () => new Set(state.draft.collaborators.map((c) => c.user.id)),
    [state.draft.collaborators]
  );

  useEffect(() => {
    if (collabSearch.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setSearchingUsers(true);
      try {
        const results = await searchUsers(collabSearch.trim());
        setSearchResults(results.filter((u) => !pendingIds.has(u.id)));
      } catch {
        setSearchResults([]);
      } finally {
        setSearchingUsers(false);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [collabSearch, pendingIds, searchUsers]);

  if (!state.created.projectId) {
    return (
      <section className="dark:border-surface-dark-border rounded-md border border-neutral-200 bg-white p-2 dark:bg-[#1d1d1b]/50">
        <div className="flex items-start gap-2 text-sm text-neutral-700 dark:text-neutral-200">
          <AlertCircle className="mt-0.5 h-4 w-4 text-neutral-400" aria-hidden />
          Crie o projeto no passo “Básico” para convidar pessoas.
        </div>
      </section>
    );
  }

  const projectId = state.created.projectId;

  const addPendingCollaborator = (user: SearchUser, role: string) => {
    actions.addCollaboratorDraft(user, role);
    setCollabSearch("");
    setSearchResults([]);
    setErrorByUserId((prev: Record<string, string>) => {
      const next = { ...prev };
      delete next[user.id];
      return next;
    });
  };

  const removePendingCollaborator = (userId: string) => {
    actions.removeCollaboratorDraft(userId);
    setErrorByUserId((prev: Record<string, string>) => {
      const next = { ...prev };
      delete next[userId];
      return next;
    });
  };

  const onApplyAndContinue = async () => {
    if (!projectId) return;
    setLocalError(null);
    setErrorByUserId({});

    if (!state.draft.collaborators.length) {
      actions.goToStep("ai_reports");
      return;
    }

    actions.setSetupStatus("collaborators", "running");
    setApplyBusy(true);
    try {
      const perUserErrors: Record<string, string> = {};
      for (const c of state.draft.collaborators) {
        try {
          await postProjectCollaborator(projectId, { userId: c.user.id, role: c.role });
        } catch (err: unknown) {
          console.error("Collaborator add failed:", c.user.id, err);
          perUserErrors[c.user.id] =
            err instanceof Error ? err.message : "Falhou ao convidar este colaborador.";
        }
      }

      if (Object.keys(perUserErrors).length) {
        setErrorByUserId(perUserErrors);
        actions.setSetupStatus(
          "collaborators",
          "error",
          "Alguns convites falharam. Você pode tentar novamente."
        );
        setLocalError("Alguns convites falharam. Revise os erros e tente novamente.");
        return;
      }

      actions.setSetupStatus("collaborators", "done");
      actions.goToStep("ai_reports");
    } finally {
      setApplyBusy(false);
    }
  };

  return (
    <section className="dark:border-surface-dark-border rounded-md border border-neutral-200 bg-white p-2 dark:bg-[#1d1d1b]/50">
      <div className="mb-2 flex items-start gap-2">
        <Users className="mt-0.5 h-4 w-4 text-neutral-400" aria-hidden />
        <div>
          <h2 className="text-xs font-bold tracking-wider text-neutral-400 uppercase">Pessoas</h2>
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-500">
            Pesquise por nome ou email e adicione à lista. Os convites são enviados ao aplicar este
            passo.
          </p>
        </div>
      </div>

      {localError ? (
        <div className="mt-2 rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {localError}
        </div>
      ) : null}

      <div className="mt-3 space-y-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1 space-y-1.5">
            <label
              htmlFor="collab-search"
              className="text-xs font-medium text-neutral-600 dark:text-neutral-400"
            >
              Procurar
            </label>
            <input
              id="collab-search"
              type="text"
              value={collabSearch}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCollabSearch(e.target.value)}
              placeholder="Nome ou email (mín. 2 caracteres)…"
              className="focus:border-brand-primary-500 focus:ring-brand-primary-500/20 dark:border-surface-dark-border-strong w-full rounded-md border border-neutral-200 bg-neutral-50 px-2 py-2 text-sm transition outline-none placeholder:text-neutral-400 focus:ring-2 dark:bg-neutral-800 dark:text-neutral-100"
            />
          </div>
          <div className="space-y-1.5 sm:w-44">
            <label
              htmlFor="invite-role"
              className="text-xs font-medium text-neutral-600 dark:text-neutral-400"
            >
              Papel ao adicionar
            </label>
            <select
              id="invite-role"
              value={inviteRole}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setInviteRole(e.target.value)}
              className="dark:border-surface-dark-border-strong w-full rounded-md border border-neutral-200 bg-neutral-50 px-2 py-2 text-sm dark:bg-neutral-800 dark:text-neutral-100"
            >
              {COLLAB_ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {collabSearch.trim().length >= 2 && (
          <div className="dark:border-surface-dark-border max-h-48 overflow-y-auto rounded-md border border-neutral-100 bg-neutral-50/90 dark:bg-[#1d1d1b]/50">
            {searchingUsers ? (
              <div className="flex items-center justify-center gap-2 py-2 text-xs text-neutral-500">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> A procurar…
              </div>
            ) : searchResults.length === 0 ? (
              <p className="py-2 text-center text-xs text-neutral-500">Nenhum resultado.</p>
            ) : (
              <ul className="dark:divide-surface-dark-border divide-y divide-neutral-100">
                {searchResults.map((user: SearchUser) => (
                  <li
                    key={user.id}
                    className="flex flex-col gap-2 p-2 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      {user.avatar_url ? (
                        <Image
                          src={getStorageUrl(user.avatar_url)}
                          alt=""
                          width={32}
                          height={32}
                          className="h-8 w-8 rounded-md object-cover"
                        />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-neutral-200 text-xs font-semibold text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300">
                          {(user.name || user.username || "?").slice(0, 1).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
                          {user.name || user.username}
                        </div>
                        <div className="truncate text-xs text-neutral-500">{user.email}</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => addPendingCollaborator(user, inviteRole)}
                      className="bg-brand-primary-500 inline-flex shrink-0 items-center gap-1 self-start rounded-md px-2 py-2 text-xs font-semibold text-neutral-900 hover:brightness-95 sm:self-center"
                    >
                      <Plus className="h-3.5 w-3.5" aria-hidden />
                      Adicionar
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {state.draft.collaborators.length > 0 && (
          <ul className="dark:border-surface-dark-border space-y-2 rounded-md border border-neutral-100 bg-white p-2 dark:bg-[#1d1d1b]/40">
            {state.draft.collaborators.map((p) => (
              <li
                key={p.user.id}
                className="dark:border-surface-dark-border flex flex-col gap-2 rounded-md border border-neutral-50 px-2 py-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-center gap-2">
                  {p.user.avatar_url ? (
                    <Image
                      src={getStorageUrl(p.user.avatar_url)}
                      alt=""
                      width={28}
                      height={28}
                      className="h-7 w-7 rounded-md object-cover"
                    />
                  ) : (
                    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-neutral-200 text-xs font-semibold dark:bg-neutral-700">
                      {(p.user.name || p.user.username || "?").slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">
                      {p.user.name || p.user.username}
                    </div>
                    <div className="text-xs text-neutral-500">
                      {COLLAB_ROLES.find((r) => r.value === p.role)?.label ?? p.role}
                      {errorByUserId[p.user.id] ? (
                        <span className="ml-2 text-red-600 dark:text-red-400">
                          {errorByUserId[p.user.id]}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removePendingCollaborator(p.user.id)}
                  className="shrink-0 self-start rounded-md p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-600 sm:self-center dark:hover:bg-red-950/30 dark:hover:text-red-400"
                  aria-label="Remover"
                  title="Remover"
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="dark:border-surface-dark-border mt-3 flex items-center justify-end gap-2 border-t border-neutral-200 pt-2">
        <button
          type="button"
          onClick={() => actions.goToStep("ai_reports")}
          className="rounded-md bg-neutral-900 px-2 py-2 text-sm font-bold text-white transition hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-950 dark:hover:bg-neutral-200"
        >
          Pular
        </button>
        <button
          type="button"
          disabled={applyBusy}
          onClick={onApplyAndContinue}
          className="bg-brand-primary-500 inline-flex items-center gap-2 rounded-md px-2 py-2 text-sm font-bold text-neutral-950 transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {applyBusy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
          Aplicar e continuar
        </button>
      </div>
    </section>
  );
}
