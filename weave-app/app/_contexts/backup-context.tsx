"use client";

import React, { createContext, useCallback, useContext } from "react";
import { useAuth } from "@/app/_contexts/auth-context";
import {
  getBackupStatus as getBackupStatusService,
  requestBackup as requestBackupService,
  type BackupOptions,
  type BackupJob,
} from "@/app/_services/backup-service/backup-service";

type BackupContextValue = {
  requestBackup: (options?: BackupOptions) => Promise<{
    jobId: string;
    message?: string;
    estimatedTime?: string;
  }>;
  getBackupStatus: (jobId: string) => Promise<BackupJob>;
};

const BackupContext = createContext<BackupContextValue | undefined>(undefined);

export function BackupProvider({ children }: { children: React.ReactNode }) {
  const { authenticated } = useAuth();

  const requestBackup = useCallback(async (options?: BackupOptions) => {
    if (!authenticated) {
      throw new Error("Unauthorized");
    }
    const res = await requestBackupService(options);
    return {
      jobId: res.job_id,
      message: res.message,
      estimatedTime: res.estimated_time,
    };
  }, [authenticated]);

  const getBackupStatus = useCallback(async (jobId: string) => {
    if (!authenticated) {
      throw new Error("Unauthorized");
    }
    return await getBackupStatusService(jobId);
  }, [authenticated]);

  return (
    <BackupContext.Provider value={{ requestBackup, getBackupStatus }}>
      {children}
    </BackupContext.Provider>
  );
}

export function useBackup() {
  const ctx = useContext(BackupContext);
  if (!ctx) throw new Error("useBackup must be used within BackupProvider");
  return ctx;
}

