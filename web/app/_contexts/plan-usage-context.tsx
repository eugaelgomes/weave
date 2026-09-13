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
  canSendAiMessage: boolean;
  canExportNote: boolean;
  canExportBackup: boolean;
  canUploadStorage: boolean;
  canInviteTeamMember: boolean;
};

const PlanUsageContext = createContext<PlanUsageContextValue | undefined>(undefined);

export function PlanUsageProvider({ children }: { children: React.ReactNode }) {
  const { user, authenticated, mergeUser } = useAuth();
  const hasCompletedOnboarding = user?.onboarding_state?.step === "COMPLETED";
  const [serverGates, setServerGates] = useState<PlanMeResponse["gates"] | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshPlanUsage = useCallback(async () => {
    if (!authenticated || !hasCompletedOnboarding) return;
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
  }, [authenticated, hasCompletedOnboarding, mergeUser]);

  const refreshRef = useRef(refreshPlanUsage);
  refreshRef.current = refreshPlanUsage;

  useEffect(() => {
    setPlanLimitSyncHandler(() => refreshRef.current());
    return () => setPlanLimitSyncHandler(null);
  }, []);

  useEffect(() => {
    if (!authenticated || !hasCompletedOnboarding) {
      setServerGates(null);
      setLastSyncedAt(null);
      return;
    }
    void refreshPlanUsage();
  }, [authenticated, hasCompletedOnboarding, refreshPlanUsage]);

  useEffect(() => {
    if (!authenticated || !hasCompletedOnboarding || typeof window === "undefined") return;

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
  }, [authenticated, hasCompletedOnboarding]);

  const gates = useMemo(() => {
    return serverGates ?? localGatesFromUser(user);
  }, [serverGates, user]);

  const canCreateNote = gates?.notes.allowed !== false;
  const canCreateProject = gates?.projects.allowed !== false;
  const canSendAiMessage = gates?.weave_ai_messages_monthly.allowed !== false;
  const canExportNote = gates?.exports_notes_monthly.allowed !== false;
  const canExportBackup = gates?.backups_monthly.allowed !== false;
  const canUploadStorage = gates?.storage_upload_mb_monthly.allowed !== false;
  const canInviteTeamMember = gates?.team_members.allowed !== false;

  const value = useMemo(
    () => ({
      gates,
      lastSyncedAt,
      isRefreshing,
      refreshPlanUsage,
      canCreateNote,
      canCreateProject,
      canSendAiMessage,
      canExportNote,
      canExportBackup,
      canUploadStorage,
      canInviteTeamMember,
    }),
    [
      gates,
      lastSyncedAt,
      isRefreshing,
      refreshPlanUsage,
      canCreateNote,
      canCreateProject,
      canSendAiMessage,
      canExportNote,
      canExportBackup,
      canUploadStorage,
      canInviteTeamMember,
    ]
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
