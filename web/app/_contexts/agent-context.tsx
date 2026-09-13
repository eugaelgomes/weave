"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { useAuth } from "./auth-context";
import {
  listAgents,
  createAgent as createAgentService,
  updateAgent as updateAgentService,
  deleteAgent as deleteAgentService,
  shareAgent as shareAgentService,
  getAgentById,
  fetchAgentProviders,
  type Agent,
  type CreateAgentData,
  type AgentProviderResponse,
} from "../_services/ai-agent-service/agent-service";

interface AgentContextType {
  agents: Agent[];
  agentProviders: AgentProviderResponse[];
  loading: boolean;
  error: string | null;
  loadAgents: () => Promise<void>;
  loadProviders: () => Promise<void>;
  createAgent: (data: CreateAgentData) => Promise<Agent>;
  updateAgent: (id: string, data: Partial<CreateAgentData>) => Promise<Agent>;
  deleteAgent: (id: string) => Promise<void>;
  shareAgent: (id: string, sharedWith: { userId: string; permission: string }[]) => Promise<Agent>;
  getAgent: (id: string) => Promise<Agent>;
  toggleAgentActive: (id: string, is_active: boolean) => Promise<Agent>;
  duplicateAgent: (id: string) => Promise<Agent>;
}

export type { Agent, CreateAgentData, AgentProviderResponse };

const AgentContext = createContext<AgentContextType | undefined>(undefined);

export function AgentProvider({ children }: { children: React.ReactNode }) {
  const { authenticated } = useAuth();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [agentProviders, setAgentProviders] = useState<AgentProviderResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProviders = useCallback(async () => {
    if (!authenticated) return;
    try {
      const data = await fetchAgentProviders();
      setAgentProviders(data);
    } catch (err: any) {
      console.error("Failed to load agent providers:", err);
    }
  }, [authenticated]);

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

  const toggleAgentActive = async (id: string, is_active: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const { toggleAgentActive: toggleActiveService } =
        await import("../_services/ai-agent-service/agent-service");
      const updatedAgent = await toggleActiveService(id, is_active);
      setAgents((prev) => prev.map((a) => (a.id === id ? updatedAgent : a)));
      return updatedAgent;
    } catch (err: any) {
      setError(err.message || "Failed to toggle agent status");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const duplicateAgent = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const { duplicateAgent: duplicateAgentService } =
        await import("../_services/ai-agent-service/agent-service");
      const newAgent = await duplicateAgentService(id);
      setAgents((prev) => [...prev, newAgent]);
      return newAgent;
    } catch (err: any) {
      setError(err.message || "Failed to duplicate agent");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return (
    <AgentContext.Provider
      value={{
        agents,
        agentProviders,
        loading,
        error,
        loadAgents,
        loadProviders,
        createAgent,
        updateAgent,
        deleteAgent,
        shareAgent,
        getAgent,
        toggleAgentActive,
        duplicateAgent,
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
