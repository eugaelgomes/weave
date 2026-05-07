"use client";

import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { useProjects } from "@/app/_contexts/projects-context";
import type { ProjectOverview } from "@/app/_contexts/projects-context";
import type {
  ReasoningActionItem,
  ReasoningContent,
  ReasoningLean,
} from "@/app/_services/projects-service/reasonings.schema";
import {
  createReasoning,
  fetchProjectReasonings,
  fetchReasoningActionItems,
  fetchReasoningById,
  updateReasoningActionItem,
  updateReasoningInteraction,
} from "@/app/_services/projects-service/reasonings-service";
import { fetchActiveSprint } from "@/app/_services/projects-service/projects-service";

export type WeaveEngineFeedItem = ReasoningLean & {
  projectId: string;
  projectName: string;
};

type WeaveEngineContextValue = {
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  projects: ProjectOverview[];
  feed: WeaveEngineFeedItem[];
  actionItemsByReasoningId: Map<string, ReasoningActionItem[]>;
  contentByReasoningId: Map<string, ReasoningContent>;

  refreshFeed: () => Promise<void>;
  ensureActionItems: (projectId: string, reasoningId: string) => Promise<ReasoningActionItem[]>;
  ensureContent: (projectId: string, reasoningId: string) => Promise<ReasoningContent>;
  setActionItemsLocal: (reasoningId: string, items: ReasoningActionItem[]) => void;

  togglePinned: (projectId: string, reasoningId: string, nextPinned: boolean) => Promise<void>;
  dismiss: (projectId: string, reasoningId: string) => Promise<void>;
  markRead: (projectId: string, reasoningId: string) => Promise<void>;
  toggleActionItemCompleted: (
    projectId: string,
    reasoningId: string,
    itemId: string,
    nextCompleted: boolean
  ) => Promise<void>;

  createReasoningFromMarkdown: (projectId: string, payload: {
    reasoningType: string;
    title: string;
    outputMarkdown: string;
  }) => Promise<void>;
};

const WeaveEngineContext = createContext<WeaveEngineContextValue | undefined>(undefined);

export function WeaveEngineProvider({ children }: { children: React.ReactNode }) {
  const { getRecentProjects } = useProjects();
  const projectsLimit = 4;
  const perProjectLimit = 6;

  const projects = useMemo<ProjectOverview[]>(
    () => getRecentProjects().slice(0, projectsLimit),
    [getRecentProjects]
  );

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feed, setFeed] = useState<WeaveEngineFeedItem[]>([]);

  const actionItemsCacheRef = useRef<Map<string, ReasoningActionItem[]>>(new Map());
  const contentCacheRef = useRef<Map<string, ReasoningContent>>(new Map());
  const [actionItemsByReasoningId, setActionItemsByReasoningId] = useState<Map<string, ReasoningActionItem[]>>(
    new Map()
  );
  const [contentByReasoningId, setContentByReasoningId] = useState<Map<string, ReasoningContent>>(
    new Map()
  );

  const refreshFeed = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      const perProject = await Promise.all(
        projects.map(async (p: ProjectOverview) => {
          const list = await fetchProjectReasonings(p.id, { limit: perProjectLimit });
          return { project: p, list };
        })
      );

      const merged: WeaveEngineFeedItem[] = perProject.flatMap(
        ({ project, list }: { project: ProjectOverview; list: ReasoningLean[] }) =>
          list.map((r: ReasoningLean) => ({
            ...r,
            projectId: project.id,
            projectName: project.title,
          }))
      );

      merged.sort((a, b) => {
        const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
        const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
        return tb - ta;
      });

      setFeed(merged);
      setActionItemsByReasoningId(new Map(actionItemsCacheRef.current));
      setContentByReasoningId(new Map(contentCacheRef.current));
      setLoading(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Falha ao carregar reasonings.");
      setLoading(false);
    } finally {
      setRefreshing(false);
    }
  }, [projects]);

  const ensureActionItems = useCallback(async (projectId: string, reasoningId: string) => {
    if (actionItemsCacheRef.current.has(reasoningId)) {
      return actionItemsCacheRef.current.get(reasoningId) || [];
    }
    const items = await fetchReasoningActionItems(projectId, reasoningId);
    actionItemsCacheRef.current.set(reasoningId, items);
    setActionItemsByReasoningId(new Map(actionItemsCacheRef.current));
    return items;
  }, []);

  const setActionItemsLocal = useCallback((reasoningId: string, items: ReasoningActionItem[]) => {
    actionItemsCacheRef.current.set(reasoningId, items);
    setActionItemsByReasoningId(new Map(actionItemsCacheRef.current));
  }, []);

  const ensureContent = useCallback(async (projectId: string, reasoningId: string) => {
    if (contentCacheRef.current.has(reasoningId)) {
      return contentCacheRef.current.get(reasoningId) as ReasoningContent;
    }
    const content = await fetchReasoningById(projectId, reasoningId);
    contentCacheRef.current.set(reasoningId, content);
    setContentByReasoningId(new Map(contentCacheRef.current));
    return content;
  }, []);

  const togglePinned = useCallback(async (projectId: string, reasoningId: string, nextPinned: boolean) => {
    await updateReasoningInteraction(projectId, reasoningId, { isPinned: nextPinned });
    await refreshFeed();
  }, [refreshFeed]);

  const dismiss = useCallback(async (projectId: string, reasoningId: string) => {
    await updateReasoningInteraction(projectId, reasoningId, { isDismissed: true });
    await refreshFeed();
  }, [refreshFeed]);

  const markRead = useCallback(async (projectId: string, reasoningId: string) => {
    await updateReasoningInteraction(projectId, reasoningId, { isRead: true });
    await refreshFeed();
  }, [refreshFeed]);

  const toggleActionItemCompleted = useCallback(
    async (projectId: string, reasoningId: string, itemId: string, nextCompleted: boolean) => {
      await updateReasoningActionItem(projectId, reasoningId, itemId, { isCompleted: nextCompleted });
      const current = actionItemsCacheRef.current.get(reasoningId) || [];
      const next = current.map((it) => (it.id === itemId ? { ...it, is_completed: nextCompleted } : it));
      setActionItemsLocal(reasoningId, next);
    },
    [setActionItemsLocal]
  );

  const createReasoningFromMarkdown = useCallback(async (projectId: string, payload: { reasoningType: string; title: string; outputMarkdown: string }) => {
    const sprint = await fetchActiveSprint(projectId);
    if (!sprint?.id) {
      throw new Error("Sem sprint ativo para este projeto.");
    }
    await createReasoning(projectId, {
      sprintId: sprint.id,
      reasoningType: payload.reasoningType,
      title: payload.title,
      content: { outputMarkdown: payload.outputMarkdown },
    });
    await refreshFeed();
  }, [refreshFeed]);

  const value = useMemo<WeaveEngineContextValue>(
    () => ({
      loading,
      refreshing,
      error,
      projects,
      feed,
      actionItemsByReasoningId,
      contentByReasoningId,
      refreshFeed,
      ensureActionItems,
      ensureContent,
      setActionItemsLocal,
      togglePinned,
      dismiss,
      markRead,
      toggleActionItemCompleted,
      createReasoningFromMarkdown,
    }),
    [
      loading,
      refreshing,
      error,
      projects,
      feed,
      actionItemsByReasoningId,
      contentByReasoningId,
      refreshFeed,
      ensureActionItems,
      ensureContent,
      setActionItemsLocal,
      togglePinned,
      dismiss,
      markRead,
      toggleActionItemCompleted,
      createReasoningFromMarkdown,
    ]
  );

  return <WeaveEngineContext.Provider value={value}>{children}</WeaveEngineContext.Provider>;
}

export function useWeaveEngine() {
  const ctx = useContext(WeaveEngineContext);
  if (!ctx) throw new Error("useWeaveEngine must be used within WeaveEngineProvider");
  return ctx;
}

