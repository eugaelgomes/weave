"use client";

import React, { createContext, useContext, ReactNode } from "react";
import { useAuth } from "./auth-context";

type ActiveModules = {
  projects: boolean;
  notes: boolean;
  agent_house: boolean;
  weave_flow: boolean;
  calendar: boolean;
  [key: string]: boolean;
};

interface ModulesContextType {
  activeModules: ActiveModules;
  isModuleActive: (moduleName: string) => boolean;
}

const ModulesContext = createContext<ModulesContextType | undefined>(undefined);

export function ModulesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  // If no user is logged in, default to true or false.
  // We read from the backend payload (user.user_organization.active_modules).
  const rawModules = user?.user_organization?.active_modules;
  const activeModules: ActiveModules = {
    projects: rawModules?.projects ?? true,
    notes: rawModules?.notes ?? true,
    agent_house: rawModules?.agent_house ?? true,
    weave_flow: rawModules?.weave_flow ?? true,
    calendar: rawModules?.calendar ?? true,
  };

  const isModuleActive = (moduleName: string) => {
    return activeModules[moduleName] ?? true;
  };

  return (
    <ModulesContext.Provider value={{ activeModules, isModuleActive }}>
      {children}
    </ModulesContext.Provider>
  );
}

export function useModules() {
  const context = useContext(ModulesContext);
  if (context === undefined) {
    throw new Error("useModules must be used within a ModulesProvider");
  }
  return context;
}
