// src/app/contexts/PlanContext.tsx
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useAuth } from "@/app/contexts/AuthContext";
import { listPlans, Plan } from "@/app/services/plansService";

interface PlanContextType {
  plans: Plan[];
  isLoading: boolean;
  error: string | null;
  fetchPlans: () => Promise<void>;
}

const PlanContext = createContext<PlanContextType | undefined>(undefined);

export function PlanProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPlans = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await listPlans();
      setPlans(data.plans || []);
    } catch (err: any) {
      setError(err.message || "Erro ao carregar planos");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchPlans();
    }
  }, [isAuthenticated]);

  return (
    <PlanContext.Provider value={{ plans, isLoading, error, fetchPlans }}>
      {children}
    </PlanContext.Provider>
  );
}

export function usePlans() {
  const context = useContext(PlanContext);
  if (context === undefined) {
    throw new Error("usePlans deve ser usado dentro de um PlanProvider");
  }
  return context;
}