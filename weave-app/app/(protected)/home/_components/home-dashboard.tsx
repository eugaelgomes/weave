import React, { useMemo, useState } from "react";
import {
  BrainCircuit,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  FolderKanban,
  Pin,
  PinOff,
  Plus,
  X,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { useAuth } from "@/app/_contexts/auth-context";
import { ORG_PERMISSIONS, orgRoleHasPermission } from "@/app/_utils/org-permissions";
import { ApiError } from "@/app/_services/api-error";
import { useWeaveEngine } from "@/app/_contexts/weave-engine-context";

export default function HighDensityDashboard() {
  const { user } = useAuth();
  const canManageProjects = useMemo(() => {
    const role =
      typeof user?.org_member_role === "string"
        ? user.org_member_role
        : Array.isArray(user?.org_member_role)
          ? user?.org_member_role?.[0]
          : null;
    return orgRoleHasPermission(role, ORG_PERMISSIONS.MANAGE_PROJECTS);
  }, [user?.org_member_role]);

  const {
    loading,
    error,
    projects,
    actionItemsByReasoningId,
    contentByReasoningId,
    feed: reasonings,
    ensureActionItems,
    ensureContent,
    setActionItemsLocal,
    refreshFeed: refresh,
    refreshing,
    togglePinned,
    dismiss,
    createReasoningFromMarkdown,
    markRead,
    toggleActionItemCompleted,
  } = useWeaveEngine();

  const [expandedReasoningId, setExpandedReasoningId] = useState<string | null>(null);
  const [detailReasoningId, setDetailReasoningId] = useState<string | null>(null);
  const [creatingForProjectId, setCreatingForProjectId] = useState<string | null>(null);

  const detail = detailReasoningId ? contentByReasoningId.get(detailReasoningId) : undefined;

  const visibleReasonings = useMemo(
    () => reasonings.filter((r: { is_dismissed?: boolean | null }) => !r.is_dismissed),
    [reasonings]
  );

  const pinned = useMemo(
    () => visibleReasonings.filter((r: { is_pinned?: boolean | null }) => r.is_pinned),
    [visibleReasonings]
  );

  const recent = useMemo(
    () =>
      visibleReasonings
        .filter((r: { is_pinned?: boolean | null }) => !r.is_pinned)
        .slice(0, 12),
    [visibleReasonings]
  );

  const feed = pinned.length > 0 ? [...pinned, ...recent] : recent;

  const openDetail = async (projectId: string, reasoningId: string) => {
    try {
      setDetailReasoningId(reasoningId);
      await ensureContent(projectId, reasoningId);
      await markRead(projectId, reasoningId).catch(() => {});
    } catch (err: unknown) {
      toast.error("Falha ao carregar detalhe do reasoning", {
        description: err instanceof Error ? err.message : "Erro inesperado",
      });
    }
  };

  const toggleExpand = async (projectId: string, reasoningId: string) => {
    const next = expandedReasoningId === reasoningId ? null : reasoningId;
    setExpandedReasoningId(next);
    if (next) {
      try {
        await ensureActionItems(projectId, reasoningId);
      } catch (err: unknown) {
        toast.error("Falha ao carregar action items", {
          description: err instanceof Error ? err.message : "Erro inesperado",
        });
      }
    }
  };

  const onTogglePinned = async (projectId: string, reasoningId: string, nextPinned: boolean) => {
    try {
      await togglePinned(projectId, reasoningId, nextPinned);
    } catch (err: unknown) {
      toast.error("Não foi possível atualizar", {
        description: err instanceof Error ? err.message : "Erro inesperado",
      });
    }
  };

  const onDismiss = async (projectId: string, reasoningId: string) => {
    try {
      await dismiss(projectId, reasoningId);
    } catch (err: unknown) {
      toast.error("Não foi possível dispensar", {
        description: err instanceof Error ? err.message : "Erro inesperado",
      });
    }
  };

  const onToggleActionItemCompleted = async (
    projectId: string,
    reasoningId: string,
    itemId: string,
    nextCompleted: boolean
  ) => {
    try {
      const current = actionItemsByReasoningId.get(reasoningId) || [];
      const next = current.map((it) => (it.id === itemId ? { ...it, is_completed: nextCompleted } : it));
      setActionItemsLocal(reasoningId, next);
      await toggleActionItemCompleted(projectId, reasoningId, itemId, nextCompleted);
    } catch (err: unknown) {
      toast.error("Não foi possível atualizar action item", {
        description: err instanceof Error ? err.message : "Erro inesperado",
      });
    }
  };

  const onCreateReasoning = async (projectId: string) => {
    if (!canManageProjects) return;
    setCreatingForProjectId(projectId);
  };

  const submitCreateReasoning = async (projectId: string, payload: { reasoningType: string; title: string; outputMarkdown: string }) => {
    try {
      await createReasoningFromMarkdown(projectId, payload);
      setCreatingForProjectId(null);
      toast.success("Reasoning criado");
    } catch (err: unknown) {
      const isForbidden =
        err instanceof ApiError && err.status === 403;
      toast.error(isForbidden ? "Sem permissão" : "Falha ao criar reasoning", {
        description: err instanceof Error ? err.message : "Erro inesperado",
      });
    }
  };

  return (
    <div className="flex h-full flex-col rounded-md bg-neutral-200 p-4 shadow-md dark:bg-neutral-800">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            Weave Engine
          </h1>
          <p className="mt-0.5 text-[11px] text-neutral-500 dark:text-neutral-400">
            Reasonings por projeto e sprint, com action items e interações
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void refresh()}
            className="rounded border border-neutral-300 bg-white px-2 py-1 text-[11px] font-medium text-neutral-700 hover:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:border-neutral-600"
          >
            {refreshing ? "Atualizando..." : "Atualizar"}
          </button>
          <Link
            href="/weave-ai/chat"
            className="inline-flex items-center gap-1 rounded bg-yellow-400 px-2 py-1 text-[11px] font-semibold text-neutral-950 hover:brightness-95"
          >
            <BrainCircuit className="h-3.5 w-3.5" />
            Abrir Weave AI
          </Link>
        </div>
      </header>

      <section className="flex-1">
        <div className="mb-2 flex items-center justify-between border-b border-neutral-200 pb-1.5 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <FolderKanban className="h-3.5 w-3.5 text-neutral-600 dark:text-neutral-400" />
            <h2 className="text-xs font-semibold tracking-wide text-neutral-700 dark:text-neutral-300">
              Feed de Reasonings
            </h2>
          </div>
          {canManageProjects && projects.length > 0 && (
            <button
              type="button"
              onClick={() => onCreateReasoning(projects[0].id)}
              className="inline-flex items-center gap-1 rounded bg-white px-2 py-1 text-[11px] font-semibold text-neutral-700 hover:brightness-95 dark:bg-neutral-900 dark:text-neutral-200"
              title="Criar reasoning (sprint ativo do projeto)"
            >
              <Plus className="h-3.5 w-3.5" />
              Criar
            </button>
          )}
        </div>

        {loading && (
          <div className="rounded-lg border border-neutral-200 bg-white p-3 text-[11px] text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300">
            Carregando reasonings…
          </div>
        )}

        {!loading && error && (
          <div className="rounded-lg border border-red-200 bg-white p-3 text-[11px] text-red-700 dark:border-red-900/50 dark:bg-neutral-900 dark:text-red-300">
            {error}
          </div>
        )}

        {!loading && !error && projects.length === 0 && (
          <div className="rounded-lg border border-neutral-200 bg-white p-3 text-[11px] text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300">
            Você ainda não tem projetos.{" "}
            <Link className="font-semibold text-yellow-700 hover:underline dark:text-yellow-400" href="/projects/new">
              Criar projeto
            </Link>
          </div>
        )}

        {!loading && !error && projects.length > 0 && feed.length === 0 && (
          <div className="rounded-lg border border-neutral-200 bg-white p-3 text-[11px] text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300">
            Ainda não há reasonings nos seus projetos recentes.
            {canManageProjects && (
              <button
                type="button"
                onClick={() => onCreateReasoning(projects[0].id)}
                className="ml-2 inline-flex items-center gap-1 rounded bg-yellow-400 px-2 py-1 font-semibold text-neutral-950 hover:brightness-95"
              >
                <Plus className="h-3.5 w-3.5" />
                Criar primeiro
              </button>
            )}
          </div>
        )}

        <div className="space-y-2">
          {feed.map((r) => {
            const expanded = expandedReasoningId === r.id;
            const items = actionItemsByReasoningId.get(r.id) || [];
            const statusChip =
              r.safety_label && r.safety_label !== "safe"
                ? { label: r.safety_label, cls: "bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300" }
                : { label: r.status || "completed", cls: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200" };

            return (
              <div
                key={r.id}
                className="rounded-lg border border-neutral-200 bg-white p-3 shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded px-2 py-0.5 text-[10px] font-semibold ${statusChip.cls}`}>
                        {statusChip.label}
                      </span>
                      <span className="text-[10px] font-medium tracking-wide text-neutral-500 dark:text-neutral-400">
                        {r.projectName}
                      </span>
                      {r.sprint_title && (
                        <span className="text-[10px] text-neutral-400 dark:text-neutral-500">
                          · {r.sprint_title}
                        </span>
                      )}
                      {r.is_read ? (
                        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="h-3 w-3" /> lido
                        </span>
                      ) : null}
                    </div>
                    <h3 className="mt-1 truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                      {r.title}
                    </h3>
                    <p className="mt-0.5 text-[11px] text-neutral-500 dark:text-neutral-400">
                      Tipo: <span className="font-medium">{r.reasoning_type}</span>
                      {typeof r.action_items_count === "number" ? (
                        <>
                          {" "}
                          · Action items: <span className="font-medium">{r.action_items_count}</span>
                        </>
                      ) : null}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => void onTogglePinned(r.projectId, r.id, !r.is_pinned)}
                      className="rounded border border-neutral-200 bg-white p-1 text-neutral-600 hover:border-neutral-300 hover:text-neutral-900 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-300 dark:hover:border-neutral-700 dark:hover:text-white"
                      title={r.is_pinned ? "Desafixar" : "Fixar"}
                    >
                      {r.is_pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => void onDismiss(r.projectId, r.id)}
                      className="rounded border border-neutral-200 bg-white p-1 text-neutral-600 hover:border-neutral-300 hover:text-neutral-900 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-300 dark:hover:border-neutral-700 dark:hover:text-white"
                      title="Dispensar"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void openDetail(r.projectId, r.id)}
                      className="inline-flex items-center gap-1 rounded bg-yellow-400 px-2 py-1 text-[11px] font-semibold text-neutral-950 hover:brightness-95"
                      title="Abrir detalhe"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Detalhe
                    </button>
                    <button
                      type="button"
                      onClick={() => void toggleExpand(r.projectId, r.id)}
                      className="rounded border border-neutral-200 bg-white p-1 text-neutral-600 hover:border-neutral-300 hover:text-neutral-900 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-300 dark:hover:border-neutral-700 dark:hover:text-white"
                      title="Action items"
                    >
                      <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
                    </button>
                  </div>
                </div>

                {expanded && (
                  <div className="mt-3 rounded border border-neutral-100 bg-neutral-50 p-2 dark:border-neutral-800 dark:bg-neutral-950">
                    {items.length === 0 ? (
                      <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
                        Sem action items para este reasoning.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {items.map((it) => (
                          <label key={it.id} className="flex items-start gap-2 text-[11px]">
                            <input
                              type="checkbox"
                              className="mt-0.5"
                              checked={Boolean(it.is_completed)}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                void onToggleActionItemCompleted(r.projectId, r.id, it.id, e.target.checked)
                              }
                            />
                            <div className="min-w-0">
                              <div className={`text-neutral-800 dark:text-neutral-200 ${it.is_completed ? "line-through opacity-60" : ""}`}>
                                {it.content}
                              </div>
                              {it.assigned_to_name ? (
                                <div className="text-[10px] text-neutral-500 dark:text-neutral-400">
                                  Atribuído: {it.assigned_to_name}
                                </div>
                              ) : null}
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {detailReasoningId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[85vh] w-full max-w-3xl overflow-auto rounded-lg bg-white p-4 shadow-xl dark:bg-neutral-950">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                  Detalhe do reasoning
                </div>
                <div className="mt-0.5 text-[11px] text-neutral-500 dark:text-neutral-400">
                  Conteúdo pesado retornado por `GET /projects/:id/reasonings/:reasoningId`
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDetailReasoningId(null)}
                title="Fechar"
                aria-label="Fechar"
                className="rounded border border-neutral-200 bg-white p-1 text-neutral-600 hover:border-neutral-300 hover:text-neutral-900 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {!detail ? (
              <div className="text-[11px] text-neutral-500 dark:text-neutral-400">Carregando…</div>
            ) : (
              <div className="space-y-3">
                {detail.title ? (
                  <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                    {detail.title}
                  </h3>
                ) : null}

                <pre className="whitespace-pre-wrap rounded border border-neutral-200 bg-neutral-50 p-3 text-[11px] text-neutral-800 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200">
                  {detail.output_markdown || "(sem output_markdown)"}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}

      {creatingForProjectId && (
        <CreateReasoningModal
          projectId={creatingForProjectId}
          onClose={() => setCreatingForProjectId(null)}
          onSubmit={(payload) => void submitCreateReasoning(creatingForProjectId, payload)}
        />
      )}
    </div>
  );
}

function CreateReasoningModal({
  projectId,
  onClose,
  onSubmit,
}: {
  projectId: string;
  onClose: () => void;
  onSubmit: (payload: { reasoningType: string; title: string; outputMarkdown: string }) => void;
}) {
  const [reasoningType, setReasoningType] = useState("general");
  const [title, setTitle] = useState("");
  const [outputMarkdown, setOutputMarkdown] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-xl rounded-lg bg-white p-4 shadow-xl dark:bg-neutral-950">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              Criar reasoning
            </div>
            <div className="mt-0.5 text-[11px] text-neutral-500 dark:text-neutral-400">
              Projeto: {projectId}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            title="Fechar"
            aria-label="Fechar"
            className="rounded border border-neutral-200 bg-white p-1 text-neutral-600 hover:border-neutral-300 hover:text-neutral-900 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-2">
          <label className="block">
            <div className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">Tipo</div>
            <input
              value={reasoningType}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReasoningType(e.target.value)}
              className="mt-1 w-full rounded border border-neutral-200 bg-white px-2 py-1 text-[12px] text-neutral-900 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100"
              placeholder="ex.: sprint_review, daily_standup, general"
            />
          </label>

          <label className="block">
            <div className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">Título</div>
            <input
              value={title}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
              className="mt-1 w-full rounded border border-neutral-200 bg-white px-2 py-1 text-[12px] text-neutral-900 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100"
              placeholder="Resumo curto do reasoning"
            />
          </label>

          <label className="block">
            <div className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">Output (Markdown)</div>
            <textarea
              value={outputMarkdown}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setOutputMarkdown(e.target.value)}
              className="mt-1 h-40 w-full resize-none rounded border border-neutral-200 bg-white px-2 py-1 text-[12px] text-neutral-900 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100"
              placeholder="Cole o conteúdo em markdown aqui (output_markdown)"
            />
          </label>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-neutral-200 bg-white px-3 py-1.5 text-[12px] font-medium text-neutral-700 hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => {
                if (!title.trim()) {
                  toast.error("Informe um título");
                  return;
                }
                onSubmit({ reasoningType: reasoningType.trim() || "general", title: title.trim(), outputMarkdown });
              }}
              className="rounded bg-yellow-400 px-3 py-1.5 text-[12px] font-semibold text-neutral-950 hover:brightness-95"
            >
              Criar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
