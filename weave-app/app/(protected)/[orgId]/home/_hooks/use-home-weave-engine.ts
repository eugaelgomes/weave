"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useProjects } from "@/app/_contexts/projects-context";
import type { ProjectOverview } from "@/app/_contexts/projects-context";
import type {
  ReasoningActionItem,
  ReasoningContent,
  ReasoningLean,
} from "@/app/_services/engine-service/reasonings.schema";
import {
  fetchProjectReasonings,
  fetchReasoningActionItems,
  fetchReasoningById,
} from "@/app/_services/engine-service/reasonings-service";

export type HomeReasoningItem = ReasoningLean & {
  projectId: string;
  projectName: string;
};

type UseHomeWeaveEngineState = {
  loading: boolean;
  error: string | null;
  projects: ProjectOverview[];
  reasonings: HomeReasoningItem[];
  actionItemsByReasoningId: Map<string, ReasoningActionItem[]>;
  contentByReasoningId: Map<string, ReasoningContent>;
  refreshing: boolean;
};

export function useHomeWeaveEngine(options?: { projectsLimit?: number; perProjectLimit?: number }) {
  const projectsLimit = options?.projectsLimit ?? 4;
  const perProjectLimit = options?.perProjectLimit ?? 5;

  const { getRecentProjects } = useProjects();

  const [state, setState] = useState<UseHomeWeaveEngineState>({
    loading: true,
    refreshing: false,
    error: null,
    projects: [],
    reasonings: [],
    actionItemsByReasoningId: new Map(),
    contentByReasoningId: new Map(),
  });

  const actionItemsCacheRef = useRef<Map<string, ReasoningActionItem[]>>(new Map());
  const contentCacheRef = useRef<Map<string, ReasoningContent>>(new Map());

  const projects = useMemo<ProjectOverview[]>(
    () => getRecentProjects().slice(0, projectsLimit),
    [getRecentProjects, projectsLimit]
  );

  const refresh = useCallback(async () => {
    setState((prev: UseHomeWeaveEngineState) => ({ ...prev, refreshing: true, error: null }));
    try {
      const perProject = await Promise.all(
        projects.map(async (p: ProjectOverview) => {
          const list = await fetchProjectReasonings(p.id, { limit: perProjectLimit });
          return { project: p, list };
        })
      );

      const merged: HomeReasoningItem[] = perProject.flatMap(
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

      setState((prev: UseHomeWeaveEngineState) => ({
        ...prev,
        loading: false,
        refreshing: false,
        error: null,
        projects,
        reasonings: merged,
        actionItemsByReasoningId: new Map(actionItemsCacheRef.current),
        contentByReasoningId: new Map(contentCacheRef.current),
      }));
    } catch (err: unknown) {
      setState((prev: UseHomeWeaveEngineState) => ({
        ...prev,
        loading: false,
        refreshing: false,
        error: err instanceof Error ? err.message : "Falha ao carregar reasonings.",
        projects,
      }));
    }
  }, [projects, perProjectLimit]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await refresh();
      } finally {
        if (cancelled) return;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const ensureActionItems = useCallback(async (projectId: string, reasoningId: string) => {
    if (actionItemsCacheRef.current.has(reasoningId)) {
      return actionItemsCacheRef.current.get(reasoningId) || [];
    }
    const items = await fetchReasoningActionItems(projectId, reasoningId);
    actionItemsCacheRef.current.set(reasoningId, items);
    setState((prev: UseHomeWeaveEngineState) => ({
      ...prev,
      actionItemsByReasoningId: new Map(actionItemsCacheRef.current),
    }));
    return items;
  }, []);

  const setActionItems = useCallback((reasoningId: string, items: ReasoningActionItem[]) => {
    actionItemsCacheRef.current.set(reasoningId, items);
    setState((prev: UseHomeWeaveEngineState) => ({
      ...prev,
      actionItemsByReasoningId: new Map(actionItemsCacheRef.current),
    }));
  }, []);

  const ensureContent = useCallback(async (projectId: string, reasoningId: string) => {
    if (contentCacheRef.current.has(reasoningId)) {
      return contentCacheRef.current.get(reasoningId) as ReasoningContent;
    }
    const content = await fetchReasoningById(projectId, reasoningId);
    contentCacheRef.current.set(reasoningId, content);
    setState((prev: UseHomeWeaveEngineState) => ({
      ...prev,
      contentByReasoningId: new Map(contentCacheRef.current),
    }));
    return content;
  }, []);

  return {
    ...state,
    refresh,
    ensureActionItems,
    setActionItems,
    ensureContent,
  };
}
