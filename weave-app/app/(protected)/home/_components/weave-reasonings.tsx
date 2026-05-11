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
import { cn } from "@/lib/utils";

/** Shell aligned with home carousels (notes / projects). */
const weaveReasoningsShellClass =
  "flex h-full flex-col rounded-md border border-neutral-200 bg-neutral-50 p-2 shadow-md sm:p-3 dark:border-neutral-800 dark:bg-neutral-950";

const primaryCtaClass =
  "inline-flex items-center justify-center gap-1 rounded-md bg-brand-primary-500 px-2 py-1 text-[11px] font-semibold text-neutral-950 shadow-sm transition-colors hover:bg-yellow-600 sm:px-2.5";

const primaryCtaMdClass =
  "inline-flex items-center justify-center rounded-md bg-brand-primary-500 px-3 py-1.5 text-[12px] font-semibold text-neutral-950 shadow-sm transition-colors hover:bg-yellow-600";

const secondaryOutlineButtonClass =
  "inline-flex items-center justify-center gap-1 rounded-md border border-neutral-200 bg-white px-2 py-1 text-[11px] font-medium text-neutral-700 shadow-sm transition-colors hover:border-neutral-300 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:border-neutral-700 dark:hover:bg-neutral-800/80";

const secondaryOutlineButtonMdClass =
  "inline-flex items-center justify-center rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-[12px] font-medium text-neutral-700 transition-colors hover:border-neutral-300 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800/80";

const ghostIconButtonClass =
  "rounded-md border border-neutral-200 bg-white p-1 text-neutral-600 shadow-sm transition-colors hover:border-neutral-300 hover:bg-neutral-50 hover:text-neutral-900 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-300 dark:hover:border-neutral-700 dark:hover:bg-neutral-900 dark:hover:text-white";

const insetNoticeClass =
  "rounded-lg border border-neutral-200 bg-white p-3 text-[11px] text-neutral-600 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300";

const feedCardClass =
  "rounded-lg border border-neutral-200 bg-white p-3 shadow-sm dark:border-neutral-800 dark:bg-neutral-900";

const actionItemsPanelClass =
  "mt-3 rounded-md border border-neutral-200 bg-muted p-2 dark:border-neutral-800 dark:bg-neutral-900/90";

const modalOverlayClass =
  "fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm";

const modalPanelClass =
  "flex max-h-[min(85vh,100dvh)] w-full flex-col overflow-y-auto rounded-lg border border-neutral-200 bg-white p-4 shadow-xl dark:border-neutral-800 dark:bg-neutral-950 sm:p-6";

const formControlClass =
  "mt-1 w-full rounded-md border border-neutral-200 bg-white px-2 py-1.5 text-[12px] text-neutral-900 transition-colors focus-visible:border-brand-primary-500 focus-visible:ring-1 focus-visible:ring-brand-primary-500/30 focus-visible:outline-none dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100";

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
    <div className={weaveReasoningsShellClass}>
      <header className="mb-3 flex flex-col gap-3 sm:mb-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-base font-semibold text-neutral-900 sm:text-lg dark:text-neutral-100">
            Weave Engine
          </h1>
          <p className="mt-0.5 text-[11px] text-neutral-500 dark:text-neutral-400">
            Reasonings por projeto e sprint, com action items e interações
          </p>
        </div>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end">
          <button type="button" onClick={() => void refresh()} className={secondaryOutlineButtonClass}>
            {refreshing ? "Atualizando..." : "Atualizar"}
          </button>
          <Link href="/weave-ai/chat" className={primaryCtaClass}>
            <BrainCircuit className="h-3.5 w-3.5 shrink-0" />
            Abrir Weave AI
          </Link>
        </div>
      </header>

      <section className="flex-1">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200 pb-1.5 dark:border-neutral-800">
          <div className="flex min-w-0 items-center gap-2">
            <FolderKanban className="h-3.5 w-3.5 shrink-0 text-neutral-600 dark:text-neutral-400" />
            <h2 className="text-xs font-semibold tracking-wide text-neutral-700 dark:text-neutral-300">
              Feed de Reasonings
            </h2>
          </div>
          {canManageProjects && projects.length > 0 && (
            <button
              type="button"
              onClick={() => onCreateReasoning(projects[0].id)}
              className={secondaryOutlineButtonClass}
              title="Criar reasoning (sprint ativo do projeto)"
            >
              <Plus className="h-3.5 w-3.5 shrink-0" />
              Criar
            </button>
          )}
        </div>

        {loading && <div className={insetNoticeClass}>Carregando reasonings…</div>}

        {!loading && error && (
          <div className="rounded-lg border border-red-200 bg-white p-3 text-[11px] text-red-700 shadow-sm dark:border-red-900/50 dark:bg-neutral-900 dark:text-red-300">
            {error}
          </div>
        )}

        {!loading && !error && projects.length === 0 && (
          <div className={insetNoticeClass}>
            Você ainda não tem projetos.{" "}
            <Link
              className="font-semibold text-brand-primary-700 underline-offset-2 hover:underline dark:text-brand-primary-400"
              href="/projects/new"
            >
              Criar projeto
            </Link>
          </div>
        )}

        {!loading && !error && projects.length > 0 && feed.length === 0 && (
          <div className={insetNoticeClass}>
            Ainda não há reasonings nos seus projetos recentes.
            {canManageProjects && (
              <button
                type="button"
                onClick={() => onCreateReasoning(projects[0].id)}
                className={cn(primaryCtaClass, "mt-2 w-full sm:ml-2 sm:mt-0 sm:inline-flex sm:w-auto")}
              >
                <Plus className="h-3.5 w-3.5 shrink-0" />
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
                : {
                    label: r.status || "completed",
                    cls: "bg-brand-primary-500/10 text-brand-primary-700 dark:text-brand-primary-400",
                  };

            return (
              <div key={r.id} className={feedCardClass}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${statusChip.cls}`}>
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
                    <h3 className="mt-1 text-sm font-semibold text-neutral-900 sm:truncate dark:text-neutral-100">
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

                  <div className="flex w-full flex-wrap items-center justify-end gap-1 sm:w-auto sm:shrink-0">
                    <button
                      type="button"
                      onClick={() => void onTogglePinned(r.projectId, r.id, !r.is_pinned)}
                      className={ghostIconButtonClass}
                      title={r.is_pinned ? "Desafixar" : "Fixar"}
                    >
                      {r.is_pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => void onDismiss(r.projectId, r.id)}
                      className={ghostIconButtonClass}
                      title="Dispensar"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void openDetail(r.projectId, r.id)}
                      className={cn(primaryCtaClass, "min-h-8")}
                      title="Abrir detalhe"
                      aria-label="Abrir detalhe"
                    >
                      <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                      <span className="hidden sm:inline">Detalhe</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void toggleExpand(r.projectId, r.id)}
                      className={ghostIconButtonClass}
                      title="Action items"
                      aria-label={expanded ? "Recolher lista de action items" : "Expandir lista de action items"}
                    >
                      <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
                    </button>
                  </div>
                </div>

                {expanded && (
                  <div className={actionItemsPanelClass}>
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
                              className="mt-0.5 accent-brand-primary-500"
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
        <div className={modalOverlayClass} role="presentation">
          <div className={cn(modalPanelClass, "max-w-3xl")} role="dialog" aria-modal="true" aria-labelledby="reasoning-detail-title">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div id="reasoning-detail-title" className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
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
                className={ghostIconButtonClass}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {!detail ? (
              <div className="text-[11px] text-neutral-500 dark:text-neutral-400">Carregando…</div>
            ) : (
              <div className="space-y-3">
                {detail.title ? (
                  <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{detail.title}</h3>
                ) : null}

                <pre className="whitespace-pre-wrap rounded-md border border-neutral-200 bg-neutral-50 p-3 text-[11px] text-neutral-800 dark:border-neutral-800 dark:bg-neutral-900/90 dark:text-neutral-200">
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
    <div className={modalOverlayClass} role="presentation">
      <div
        className={cn(modalPanelClass, "max-w-xl")}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-reasoning-title"
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div id="create-reasoning-title" className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              Criar reasoning
            </div>
            <div className="mt-0.5 break-all text-[11px] text-neutral-500 dark:text-neutral-400">Projeto: {projectId}</div>
          </div>
          <button type="button" onClick={onClose} title="Fechar" aria-label="Fechar" className={ghostIconButtonClass}>
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3">
          <label className="block">
            <div className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">Tipo</div>
            <input
              value={reasoningType}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReasoningType(e.target.value)}
              className={formControlClass}
              placeholder="ex.: sprint_review, daily_standup, general"
            />
          </label>

          <label className="block">
            <div className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">Título</div>
            <input
              value={title}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
              className={formControlClass}
              placeholder="Resumo curto do reasoning"
            />
          </label>

          <label className="block">
            <div className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">Output (Markdown)</div>
            <textarea
              value={outputMarkdown}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setOutputMarkdown(e.target.value)}
              className={cn(formControlClass, "h-40 resize-none")}
              placeholder="Cole o conteúdo em markdown aqui (output_markdown)"
            />
          </label>

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} className={cn(secondaryOutlineButtonMdClass, "w-full sm:w-auto")}>
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
              className={cn(primaryCtaMdClass, "w-full sm:w-auto")}
            >
              Criar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
