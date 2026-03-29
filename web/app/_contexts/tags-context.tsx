"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { useAuth } from "./auth-context";
import {
  fetchProjectTags,
  createProjectTag,
  updateProjectTag,
  deleteProjectTag,
  type ProjectTag,
  type CreateProjectTagData,
  type UpdateProjectTagData,
} from "../_services/projects-service/project-taxonomy-service";

interface TagsContextType {
  tagsByProject: Record<string, ProjectTag[]>;
  loading: boolean;
  error: string | null;

  loadTags: (projectId: string) => Promise<ProjectTag[]>;
  createTag: (projectId: string, data: CreateProjectTagData) => Promise<ProjectTag | null>;
  updateTag: (
    projectId: string,
    tagId: string,
    data: UpdateProjectTagData
  ) => Promise<ProjectTag | null>;
  deleteTag: (projectId: string, tagId: string) => Promise<boolean>;
}

const TagsContext = createContext<TagsContextType | undefined>(undefined);

export function TagsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [tagsByProject, setTagsByProject] = useState<Record<string, ProjectTag[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTags = useCallback(
    async (projectId: string): Promise<ProjectTag[]> => {
      if (!user?.id) return [];

      setLoading(true);
      setError(null);
      try {
        const tags = await fetchProjectTags(projectId);
        setTagsByProject((prev) => ({ ...prev, [projectId]: tags }));
        return tags;
      } catch (err: unknown) {
        console.error("Erro ao buscar tags:", err);
        const errorMsg = err instanceof Error ? err.message : "Erro ao buscar tags";
        setError(errorMsg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [user?.id]
  );

  const createTag = useCallback(
    async (projectId: string, data: CreateProjectTagData): Promise<ProjectTag | null> => {
      if (!user?.id) return null;
      setLoading(true);
      setError(null);
      try {
        const tag = await createProjectTag(projectId, data);
        setTagsByProject((prev) => ({
          ...prev,
          [projectId]: [...(prev[projectId] || []), tag],
        }));
        return tag;
      } catch (err: unknown) {
        console.error("Erro ao criar tag:", err);
        const errorMsg = err instanceof Error ? err.message : "Erro ao criar tag";
        setError(errorMsg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [user?.id]
  );

  const updateTag = useCallback(
    async (
      projectId: string,
      tagId: string,
      data: UpdateProjectTagData
    ): Promise<ProjectTag | null> => {
      if (!user?.id) return null;
      try {
        const tag = await updateProjectTag(projectId, tagId, data);
        setTagsByProject((prev) => {
          const projectTags = prev[projectId] || [];
          return {
            ...prev,
            [projectId]: projectTags.map((t) => (t.id === tagId ? tag : t)),
          };
        });
        return tag;
      } catch (err: unknown) {
        console.error("Erro ao atualizar tag:", err);
        throw err;
      }
    },
    [user?.id]
  );

  const deleteTag = useCallback(
    async (projectId: string, tagId: string): Promise<boolean> => {
      if (!user?.id) return false;
      try {
        await deleteProjectTag(projectId, tagId);
        setTagsByProject((prev) => {
          const projectTags = prev[projectId] || [];
          return {
            ...prev,
            [projectId]: projectTags.filter((t) => t.id !== tagId),
          };
        });
        return true;
      } catch (err: unknown) {
        console.error("Erro ao remover tag:", err);
        throw err;
      }
    },
    [user?.id]
  );

  return (
    <TagsContext.Provider
      value={{ tagsByProject, loading, error, loadTags, createTag, updateTag, deleteTag }}
    >
      {children}
    </TagsContext.Provider>
  );
}

export function useTags() {
  const context = useContext(TagsContext);
  if (context === undefined) {
    throw new Error("useTags deve ser usado dentro de um TagsProvider");
  }
  return context;
}
