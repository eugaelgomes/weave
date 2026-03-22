"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { useAuth } from "./auth-context";
import {
  listAgents,
  createAgent as createAgentService,
  updateAgent as updateAgentService,
  deleteAgent as deleteAgentService,
  shareAgent as shareAgentService,
  getAgentById,
  type Agent,
  type CreateAgentData,
} from "../_services/ai-agent-service/agent-service";

interface AgentContextType {
  agents: Agent[];
  loading: boolean;
  error: string | null;
  loadAgents: () => Promise<void>;
  createAgent: (data: CreateAgentData) => Promise<Agent>;
  updateAgent: (id: string, data: Partial<CreateAgentData>) => Promise<Agent>;
  deleteAgent: (id: string) => Promise<void>;
  shareAgent: (id: string, sharedWith: { userId: string; permission: string }[]) => Promise<Agent>;
  getAgent: (id: string) => Promise<Agent>;
}

const AgentContext = createContext<AgentContextType | undefined>(undefined);

export function AgentProvider({ children }: { children: React.ReactNode }) {
  const { authenticated } = useAuth();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAgents = useCallback(async () => {
    if (!authenticated) return;
    setLoading(true);
    setError(null);
    try {
      const data = await listAgents();
      setAgents(data);
    } catch (err: any) {
      setError(err.message || "Failed to load agents");
    } finally {
      setLoading(false);
    }
  }, [authenticated]);

  const createAgent = async (data: CreateAgentData) => {
    setLoading(true);
    setError(null);
    try {
      const newAgent = await createAgentService(data);
      setAgents((prev) => [...prev, newAgent]);
      return newAgent;
    } catch (err: any) {
      setError(err.message || "Failed to create agent");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateAgent = async (id: string, data: Partial<CreateAgentData>) => {
    setLoading(true);
    setError(null);
    try {
      const updatedAgent = await updateAgentService(id, data);
      setAgents((prev) => prev.map((a) => (a.id === id ? updatedAgent : a)));
      return updatedAgent;
    } catch (err: any) {
      setError(err.message || "Failed to update agent");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteAgent = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      await deleteAgentService(id);
      setAgents((prev) => prev.filter((a) => a.id !== id));
    } catch (err: any) {
      setError(err.message || "Failed to delete agent");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const shareAgent = async (id: string, sharedWith: { userId: string; permission: string }[]) => {
    setLoading(true);
    setError(null);
    try {
      const updatedAgent = await shareAgentService(id, sharedWith);
      setAgents((prev) => prev.map((a) => (a.id === id ? updatedAgent : a)));
      return updatedAgent;
    } catch (err: any) {
      setError(err.message || "Failed to share agent");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getAgent = async (id: string) => {
    const existing = agents.find((a) => a.id === id);
    if (existing) return existing;

    try {
      const agent = await getAgentById(id);
      setAgents((prev) => {
        const alreadyExists = prev.some((item) => item.id === agent.id);
        if (alreadyExists) {
          return prev.map((item) => (item.id === agent.id ? agent : item));
        }
        return [...prev, agent];
      });
      return agent;
    } catch (err: any) {
      setError(err.message || "Agent not found");
      throw err;
    }
  };

  useEffect(() => {
    if (authenticated) {
      loadAgents(); // Initial load
    }
  }, [authenticated, loadAgents]);

  return (
    <AgentContext.Provider
      value={{
        agents,
        loading,
        error,
        loadAgents,
        createAgent,
        updateAgent,
        deleteAgent,
        shareAgent,
        getAgent,
      }}
    >
      {children}
    </AgentContext.Provider>
  );
}

export function useAgent() {
  const context = useContext(AgentContext);
  if (context === undefined) {
    throw new Error("useAgent must be used within an AgentProvider");
  }
  return context;
}
