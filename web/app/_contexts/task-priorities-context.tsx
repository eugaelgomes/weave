"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { useAuth } from "./auth-context";
import {
  fetchTaskPriorities,
  createTaskPriority,
  updateTaskPriority,
  deleteTaskPriority,
  type TaskPriority,
  type CreateTaskPriorityData,
  type UpdateTaskPriorityData,
} from "../_services/projects-service/project-taxonomy-service";

interface TaskPrioritiesContextType {
  prioritiesByProject: Record<string, TaskPriority[]>;
  loading: boolean;
  error: string | null;

  loadPriorities: (projectId: string) => Promise<TaskPriority[]>;
  createPriority: (projectId: string, data: CreateTaskPriorityData) => Promise<TaskPriority | null>;
  updatePriority: (
    projectId: string,
    priorityId: string,
    data: UpdateTaskPriorityData
  ) => Promise<TaskPriority | null>;
  deletePriority: (projectId: string, priorityId: string) => Promise<boolean>;
}

const TaskPrioritiesContext = createContext<TaskPrioritiesContextType | undefined>(undefined);

export function TaskPrioritiesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [prioritiesByProject, setPrioritiesByProject] = useState<Record<string, TaskPriority[]>>(
    {}
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPriorities = useCallback(
    async (projectId: string): Promise<TaskPriority[]> => {
      if (!user?.id) return [];

      setLoading(true);
      setError(null);
      try {
        const priorities = await fetchTaskPriorities(projectId);
        setPrioritiesByProject((prev) => ({ ...prev, [projectId]: priorities }));
        return priorities;
      } catch (err: unknown) {
        console.error("Erro ao buscar prioridades:", err);
        const errorMsg = err instanceof Error ? err.message : "Erro ao buscar prioridades";
        setError(errorMsg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [user?.id]
  );

  const createPriority = useCallback(
    async (projectId: string, data: CreateTaskPriorityData): Promise<TaskPriority | null> => {
      if (!user?.id) return null;
      setLoading(true);
      setError(null);
      try {
        const priority = await createTaskPriority(projectId, data);
        setPrioritiesByProject((prev) => ({
          ...prev,
          [projectId]: [...(prev[projectId] || []), priority],
        }));
        return priority;
      } catch (err: unknown) {
        console.error("Erro ao criar prioridade:", err);
        const errorMsg = err instanceof Error ? err.message : "Erro ao criar prioridade";
        setError(errorMsg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [user?.id]
  );

  const updatePriority = useCallback(
    async (
      projectId: string,
      priorityId: string,
      data: UpdateTaskPriorityData
    ): Promise<TaskPriority | null> => {
      if (!user?.id) return null;
      try {
        const priority = await updateTaskPriority(projectId, priorityId, data);
        setPrioritiesByProject((prev) => {
          const projectPriorities = prev[projectId] || [];
          return {
            ...prev,
            [projectId]: projectPriorities.map((p) => (p.id === priorityId ? priority : p)),
          };
        });
        return priority;
      } catch (err: unknown) {
        console.error("Erro ao atualizar prioridade:", err);
        throw err;
      }
    },
    [user?.id]
  );

  const deletePriority = useCallback(
    async (projectId: string, priorityId: string): Promise<boolean> => {
      if (!user?.id) return false;
      try {
        await deleteTaskPriority(projectId, priorityId);
        setPrioritiesByProject((prev) => {
          const projectPriorities = prev[projectId] || [];
          return {
            ...prev,
            [projectId]: projectPriorities.filter((p) => p.id !== priorityId),
          };
        });
        return true;
      } catch (err: unknown) {
        console.error("Erro ao remover prioridade:", err);
        throw err;
      }
    },
    [user?.id]
  );

  return (
    <TaskPrioritiesContext.Provider
      value={{
        prioritiesByProject,
        loading,
        error,
        loadPriorities,
        createPriority,
        updatePriority,
        deletePriority,
      }}
    >
      {children}
    </TaskPrioritiesContext.Provider>
  );
}

export function useTaskPriorities() {
  const context = useContext(TaskPrioritiesContext);
  if (context === undefined) {
    throw new Error("useTaskPriorities deve ser usado dentro de um TaskPrioritiesProvider");
  }
  return context;
}
