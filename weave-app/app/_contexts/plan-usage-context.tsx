"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAuth } from "@/app/_contexts/auth-context";
import {
  buildUserPatchFromPlanMe,
  fetchPlanUsageMe,
} from "@/app/_services/plans-service/plan-usage-service";
import type { PlanMeResponse } from "@/app/_services/plans-service/plan-usage.schema";
import { setPlanLimitSyncHandler } from "@/app/_services/plan-limit-sync";
import { localGatesFromUser } from "@/app/_utils/plan-limit-check";

const POLL_MS = 90_000;

type PlanUsageContextValue = {
  gates: PlanMeResponse["gates"] | null;
  lastSyncedAt: string | null;
  isRefreshing: boolean;
  refreshPlanUsage: () => Promise<void>;
  canCreateNote: boolean;
  canCreateProject: boolean;
};

const PlanUsageContext = createContext<PlanUsageContextValue | undefined>(undefined);

export function PlanUsageProvider({ children }: { children: React.ReactNode }) {
  const { user, authenticated, mergeUser } = useAuth();
  const [serverGates, setServerGates] = useState<PlanMeResponse["gates"] | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshPlanUsage = useCallback(async () => {
    if (!authenticated) return;
    setIsRefreshing(true);
    try {
      const data = await fetchPlanUsageMe();
      mergeUser(buildUserPatchFromPlanMe(data));
      setServerGates(data.gates);
      setLastSyncedAt(data.as_of);
    } catch {
      /* keep previous gates / user */
    } finally {
      setIsRefreshing(false);
    }
  }, [authenticated, mergeUser]);

  const refreshRef = useRef(refreshPlanUsage);
  refreshRef.current = refreshPlanUsage;

  useEffect(() => {
    setPlanLimitSyncHandler(() => refreshRef.current());
    return () => setPlanLimitSyncHandler(null);
  }, []);

  useEffect(() => {
    if (!authenticated) {
      setServerGates(null);
      setLastSyncedAt(null);
      return;
    }
    void refreshPlanUsage();
  }, [authenticated, refreshPlanUsage]);

  useEffect(() => {
    if (!authenticated || typeof window === "undefined") return;

    const id = window.setInterval(() => {
      void refreshRef.current();
    }, POLL_MS);

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void refreshRef.current();
      }
    };
    const onFocus = () => {
      void refreshRef.current();
    };

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onFocus);

    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onFocus);
    };
  }, [authenticated]);

  const gates = useMemo(() => {
    return serverGates ?? localGatesFromUser(user);
  }, [serverGates, user]);

  const canCreateNote = gates?.notes.allowed !== false;
  const canCreateProject = gates?.projects.allowed !== false;

  const value = useMemo(
    () => ({
      gates,
      lastSyncedAt,
      isRefreshing,
      refreshPlanUsage,
      canCreateNote,
      canCreateProject,
    }),
    [gates, lastSyncedAt, isRefreshing, refreshPlanUsage, canCreateNote, canCreateProject]
  );

  return <PlanUsageContext.Provider value={value}>{children}</PlanUsageContext.Provider>;
}

export function usePlanUsage(): PlanUsageContextValue {
  const ctx = useContext(PlanUsageContext);
  if (!ctx) {
    throw new Error("usePlanUsage must be used within PlanUsageProvider");
  }
  return ctx;
}
