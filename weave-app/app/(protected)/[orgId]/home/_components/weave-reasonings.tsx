"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, RefreshCw, Eye } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { AiFredokaIcon } from "@/app/(protected)/_components/layout/icons/ai-fredoka-icon";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/app/_contexts/auth-context";
import { ORG_PERMISSIONS, orgRoleHasPermission } from "@/app/_utils/org-permissions";
import { useWeaveEngine } from "@/app/_contexts/weave-engine-context";
import type { WeaveEngineFeedItem } from "@/app/_contexts/weave-engine-context";
import { useLanguage } from "@/app/_contexts/language-context";
import { cn } from "@/lib/utils";
import { ReasoningFeedItem } from "@/app/(protected)/[orgId]/home/_components/reasoning-feed-item";
import { ReasoningDetailDialog } from "@/app/(protected)/[orgId]/home/_components/reasoning-detail-dialog";
import {
  engineInsetNoticeClass,
  engineFeedScrollClass,
  engineShellPageClass,
  engineTextLinkClass,
} from "@/app/(protected)/[orgId]/weave-engine/_components/engine-styles";
import { interpolate } from "@/app/(protected)/[orgId]/home/_components/engine-utils";

export type WeaveEngineDashboardProps = {
  variant?: "home" | "page";
};

export default function WeaveEngineDashboard({ variant = "home" }: WeaveEngineDashboardProps) {
  const router = useRouter();
  const params = useParams();
  const orgId = params?.orgId as string;
  const { t, locale } = useLanguage();
  const copy = t.home.engine;
  const dateLocale = locale === "en-US" ? "en-US" : locale === "es-ES" ? "es-ES" : "pt-BR";
  const [titleIndex, setTitleIndex] = useState(0);

  useEffect(() => {
    const variations = copy.titleVariations;
    if (variations && variations.length > 0) {
      const randomIndex = Math.floor(Math.random() * variations.length);
      setTitleIndex(randomIndex);
    }
  }, [copy.titleVariations]);

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
    markRead,
    toggleActionItemCompleted,
  } = useWeaveEngine();

  const openComposer = useCallback(
    (projectId?: string) => {
      const params = new URLSearchParams();
      if (projectId) params.set("projectId", projectId);
      params.set("from", variant === "page" ? "engine" : "home");
      const qs = params.toString();
      router.push(`/${orgId}/weave-engine/compose${qs ? `?${qs}` : ""}`);
    },
    [router, variant]
  );

  const [expandedReasoningId, setExpandedReasoningId] = useState<string | null>(null);
  const [detailReasoningId, setDetailReasoningId] = useState<string | null>(null);
  const [detailProjectName, setDetailProjectName] = useState<string | undefined>();

  const detail = detailReasoningId ? contentByReasoningId.get(detailReasoningId) : undefined;

  const visibleReasonings = useMemo(() => reasonings.filter((r) => !r.is_dismissed), [reasonings]);

  const pinned = useMemo(() => visibleReasonings.filter((r) => r.is_pinned), [visibleReasonings]);

  const recent = useMemo(
    () => visibleReasonings.filter((r) => !r.is_pinned).slice(0, 12),
    [visibleReasonings]
  );

  const summary = useMemo(() => {
    const unread = visibleReasonings.filter((r) => !r.is_read).length;
    const review = visibleReasonings.filter(
      (r) => r.safety_label && r.safety_label !== "safe"
    ).length;
    return { total: visibleReasonings.length, unread, review };
  }, [visibleReasonings]);

  const summaryParts = useMemo(() => {
    if (summary.total === 0) return [];
    const parts = [interpolate(copy.summaryInsights, { count: summary.total })];
    if (summary.unread > 0) {
      parts.push(interpolate(copy.summaryUnread, { count: summary.unread }));
    }
    if (summary.review > 0) {
      parts.push(interpolate(copy.summaryReview, { count: summary.review }));
    }
    return parts;
  }, [summary, copy]);

  const openDetail = async (item: WeaveEngineFeedItem) => {
    try {
      setDetailReasoningId(item.id);
      setDetailProjectName(item.projectName);
      await ensureContent(item.projectId, item.id);
      await markRead(item.projectId, item.id).catch(() => {});
    } catch (err: unknown) {
      toast.error(copy.errorLoadDetail, {
        description: err instanceof Error ? err.message : copy.unexpectedError,
      });
    }
  };

  const toggleExpand = async (item: WeaveEngineFeedItem) => {
    const next = expandedReasoningId === item.id ? null : item.id;
    setExpandedReasoningId(next);
    if (next) {
      try {
        await ensureActionItems(item.projectId, item.id);
      } catch (err: unknown) {
        toast.error(copy.errorLoadActions, {
          description: err instanceof Error ? err.message : copy.unexpectedError,
        });
      }
    }
  };

  const onTogglePinned = async (item: WeaveEngineFeedItem, nextPinned: boolean) => {
    try {
      await togglePinned(item.projectId, item.id, nextPinned);
    } catch (err: unknown) {
      toast.error(copy.errorUpdate, {
        description: err instanceof Error ? err.message : copy.unexpectedError,
      });
    }
  };

  const onDismiss = async (item: WeaveEngineFeedItem) => {
    try {
      await dismiss(item.projectId, item.id);
      if (expandedReasoningId === item.id) setExpandedReasoningId(null);
      if (detailReasoningId === item.id) setDetailReasoningId(null);
    } catch (err: unknown) {
      toast.error(copy.errorDismiss, {
        description: err instanceof Error ? err.message : copy.unexpectedError,
      });
    }
  };

  const onToggleActionItemCompleted = async (
    item: WeaveEngineFeedItem,
    actionItemId: string,
    nextCompleted: boolean
  ) => {
    try {
      const current = actionItemsByReasoningId.get(item.id) || [];
      const next = current.map((it) =>
        it.id === actionItemId ? { ...it, is_completed: nextCompleted } : it
      );
      setActionItemsLocal(item.id, next);
      await toggleActionItemCompleted(item.projectId, item.id, actionItemId, nextCompleted);
    } catch (err: unknown) {
      toast.error(copy.errorUpdate, {
        description: err instanceof Error ? err.message : copy.unexpectedError,
      });
    }
  };

  const renderFeedItems = (items: WeaveEngineFeedItem[]) =>
    items.map((r) => (
      <ReasoningFeedItem
        key={r.id}
        item={r}
        expanded={expandedReasoningId === r.id}
        actionItems={actionItemsByReasoningId.get(r.id) || []}
        locale={dateLocale}
        copy={copy}
        onRead={() => void openDetail(r)}
        onToggleExpand={() => void toggleExpand(r)}
        onTogglePinned={() => void onTogglePinned(r, !r.is_pinned)}
        onDismiss={() => void onDismiss(r)}
        onToggleActionItem={(itemId, completed) =>
          void onToggleActionItemCompleted(r, itemId, completed)
        }
      />
    ));

  const hasFeed = pinned.length > 0 || recent.length > 0;

  return (
    <div
      className={cn(
        "relative flex w-full flex-col rounded-2xl bg-white/70 p-2 shadow-lg shadow-black/5 backdrop-blur-lg dark:bg-[#252525]/70 dark:shadow-black/20",
        variant === "page" && hasFeed && engineShellPageClass,
        variant === "home" && "h-[400px]"
      )}
    >
      <div className="absolute inset-0 -z-10 overflow-hidden rounded-2xl">
        <div
          className="bg-brand-yellow/20 dark:bg-brand-yellow/10 absolute top-0 -left-10 h-full w-2/3 animate-pulse rounded-full blur-2xl"
          style={{ animationDuration: "4s" }}
        />
        <div
          className="absolute top-0 -right-10 h-full w-2/3 animate-pulse rounded-full bg-sky-400/20 blur-2xl dark:bg-sky-500/10"
          style={{ animationDuration: "5s", animationDelay: "1s" }}
        />
      </div>
      {variant === "home" && (
        <div className="animate-in fade-in mb-3 flex w-full items-center justify-start duration-500">
          <h2 className="font-fredoka text-lg font-medium tracking-tight text-neutral-500 dark:text-neutral-500">
            {t.home.greetingPrefix}{" "}
            <span className="text-brand-yellow dark:text-brand-yellow font-semibold">
              {user?.user_name?.split(" ")[0] || user?.username || ""}
            </span>
            ,
          </h2>
        </div>
      )}
      <header className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        {variant === "home" ? (
          <div className="min-w-0">
            <h2 className="font-fredoka text-sm font-medium text-neutral-400 dark:text-neutral-300">
              {copy.titleVariations[titleIndex]}
            </h2>
          </div>
        ) : (
          <div className="min-w-0 flex-1" />
        )}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1 text-[11px] font-medium text-neutral-600 transition-all duration-200 hover:bg-neutral-50 hover:text-neutral-900 active:scale-95 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700 dark:hover:text-neutral-100"
          >
            <RefreshCw className={cn("h-3 w-3 text-neutral-400", refreshing && "animate-spin")} />
            {refreshing ? copy.refreshing : copy.refresh}
          </button>
          {variant === "home" && (
            <Link
              href={`/${orgId}/weave-engine`}
              className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1 text-[11px] font-medium text-neutral-600 transition-all duration-200 hover:bg-neutral-50 hover:text-neutral-900 active:scale-95 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700 dark:hover:text-neutral-100"
            >
              <Eye className="h-3 w-3 text-neutral-400" />
              {copy.viewAll}
            </Link>
          )}
          <Link
            href={`/${orgId}/weave-ai/chat`}
            className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1 text-[11px] font-medium text-neutral-600 transition-all duration-200 hover:bg-neutral-50 hover:text-neutral-900 active:scale-95 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700 dark:hover:text-neutral-100"
          >
            <AiFredokaIcon className="text-[10px] text-neutral-500 dark:text-neutral-400" />
            {copy.openAi}
          </Link>
          {variant === "page" && canManageProjects && projects.length > 0 && (
            <button
              type="button"
              onClick={() => openComposer(projects[0].id)}
              className={cn(engineTextLinkClass, "inline-flex items-center gap-1")}
            >
              <Plus className="h-3 w-3" />
              {copy.create}
            </button>
          )}
        </div>
      </header>

      <section className={cn(((variant === "page" && hasFeed) || variant === "home") && "flex min-h-0 flex-1 flex-col")}>
        {variant === "page" && (
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
              {copy.feedTitle}
            </h3>
            {canManageProjects && projects.length > 0 && (
              <button
                type="button"
                onClick={() => openComposer(projects[0].id)}
                className={cn(engineTextLinkClass, "inline-flex items-center gap-1")}
              >
                <Plus className="h-3 w-3" />
                {copy.create}
              </button>
            )}
          </div>
        )}

        {loading && <div className={engineInsetNoticeClass}>{copy.loading}</div>}

        {!loading && error && (
          <div className={cn(engineInsetNoticeClass, "text-neutral-600 dark:text-neutral-300")}>
            {error}
          </div>
        )}

        {!loading && !error && projects.length === 0 && (
          <div className={engineInsetNoticeClass}>
            {copy.emptyProjects}{" "}
            <Link href={`/${orgId}/projects/new`} className={engineTextLinkClass}>
              {copy.createProject}
            </Link>
          </div>
        )}

        {!loading && !error && projects.length > 0 && !hasFeed && (
          <div className={engineInsetNoticeClass}>
            <p>{copy.emptyFeed}</p>
            {canManageProjects && (
              <button
                type="button"
                onClick={() => openComposer(projects[0]?.id)}
                className={cn(engineTextLinkClass, "mt-2 inline-block")}
              >
                {copy.createFirst}
              </button>
            )}
          </div>
        )}

        {!loading && !error && hasFeed && (
          <div className={cn(variant === "page" ? engineFeedScrollClass : "min-h-0 flex-1 overflow-y-auto pr-1")}>
            {summaryParts.length > 0 && (
              <p className="mb-2 shrink-0 text-[11px] font-normal text-neutral-400 dark:text-neutral-500">
                {summaryParts.join(" · ")}
              </p>
            )}

            <div
              className={cn(
                variant === "home"
                  ? "flex flex-col gap-1"
                  : "dark:divide-surface-dark-border divide-y divide-neutral-100"
              )}
            >
              {pinned.length > 0 && (
                <p className="py-2 text-[10px] font-normal tracking-wide text-neutral-400 uppercase dark:text-neutral-500">
                  {copy.pinnedSection}
                </p>
              )}
              {renderFeedItems(pinned)}
              {renderFeedItems(recent)}
            </div>
          </div>
        )}
      </section>

      <ReasoningDetailDialog
        open={Boolean(detailReasoningId)}
        detail={detail}
        projectName={detailProjectName}
        locale={dateLocale}
        copy={copy}
        onClose={() => {
          setDetailReasoningId(null);
          setDetailProjectName(undefined);
        }}
      />
    </div>
  );
}
