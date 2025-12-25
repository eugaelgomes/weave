"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useAuth } from "./AuthContext";
import {
  fetchOrganization as fetchOrganizationService,
  createOrganization as createOrganizationService,
  updateOrganization as updateOrganizationService,
  updateOrganizationProperties as updateOrganizationPropertiesService,
  deleteOrganization as deleteOrganizationService,
  restoreOrganization as restoreOrganizationService,
  addMember as addMemberService,
  removeMember as removeMemberService,
  type Organization,
  type CreateOrganizationData,
  type UpdateOrganizationData,
  type OrganizationProperties,
  type AddMemberData,
} from "../services/organization-service/orgs-service";

export interface OrganizationStats {
  totalMembers: number;
  totalProjects: number;
  totalAdmins: number;
  totalInvited: number;
  storageUsed?: number;
  storageLimit?: number;
  featuresEnabled: number;
  activeDomains: number;
}

export interface OrganizationContextType {
  // Estado
  organization: Organization | null;
  loading: boolean;
  error: string | null;
  lastFetch: Date | null;
  hasOrganization: boolean;

  // Funções principais
  fetchOrganization: () => Promise<void>;
  refreshOrganization: () => Promise<void>;
  createOrganization: (organizationData: CreateOrganizationData) => Promise<Organization | null>;
  updateOrganization: (organizationData: UpdateOrganizationData) => Promise<Organization | null>;
  updateProperties: (properties: OrganizationProperties) => Promise<Organization | null>;
  deleteOrganization: () => Promise<boolean>;
  restoreOrganization: () => Promise<Organization | null>;

  // Funções de membros
  addMember: (memberId: string, role?: "admin" | "member") => Promise<boolean>;
  removeMember: (memberId: string) => Promise<boolean>;

  // Funções de dados derivados
  getStats: () => OrganizationStats;
  isOwner: (userId: string) => boolean;
  isAdmin: (userId: string) => boolean;
  isMember: (userId: string) => boolean;
  canManageMembers: (userId: string) => boolean;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export function useOrganization(): OrganizationContextType {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error("useOrganization deve ser usado dentro de um OrganizationProvider");
  }
  return context;
}

export function OrganizationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  // Estado
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);

  // 1. BUSCAR ORGANIZAÇÃO (READ)
  const fetchOrganization = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    setError(null);

    try {
      const organizationData = await fetchOrganizationService();
      setOrganization(organizationData);
      setLastFetch(new Date());
    } catch (err: unknown) {
      console.error("Erro ao buscar organização:", err);
      setError(err instanceof Error ? err.message : "Erro ao buscar organização");
      setOrganization(null);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // 1.1. REFRESH MANUAL
  const refreshOrganization = useCallback(async () => {
    await fetchOrganization();
  }, [fetchOrganization]);

  // 2. CRIAR ORGANIZAÇÃO (CREATE)
  const createOrganization = useCallback(
    async (organizationData: CreateOrganizationData): Promise<Organization | null> => {
      if (!user?.id) return null;

      setLoading(true);
      setError(null);

      try {
        const newOrganization = await createOrganizationService(organizationData);
        setOrganization(newOrganization);
        setLastFetch(new Date());
        return newOrganization;
      } catch (err: unknown) {
        console.error("Erro ao criar organização:", err);
        setError(err instanceof Error ? err.message : "Erro ao criar organização");
        return null;
      } finally {
        setLoading(false);
      }
    },
    [user?.id]
  );

  // 3. ATUALIZAR ORGANIZAÇÃO (UPDATE)
  const updateOrganization = useCallback(
    async (organizationData: UpdateOrganizationData): Promise<Organization | null> => {
      if (!user?.id || !organization) return null;

      setLoading(true);
      setError(null);

      try {
        const updatedOrganization = await updateOrganizationService(organizationData);
        setOrganization(updatedOrganization);
        setLastFetch(new Date());
        return updatedOrganization;
      } catch (err: unknown) {
        console.error("Erro ao atualizar organização:", err);
        setError(err instanceof Error ? err.message : "Erro ao atualizar organização");
        return null;
      } finally {
        setLoading(false);
      }
    },
    [user?.id, organization]
  );

  // 3.1. ATUALIZAR APENAS PROPERTIES
  const updateProperties = useCallback(
    async (properties: OrganizationProperties): Promise<Organization | null> => {
      if (!user?.id || !organization) return null;

      setLoading(true);
      setError(null);

      try {
        const updatedOrganization = await updateOrganizationPropertiesService(properties);
        setOrganization(updatedOrganization);
        setLastFetch(new Date());
        return updatedOrganization;
      } catch (err: unknown) {
        console.error("Erro ao atualizar properties:", err);
        setError(err instanceof Error ? err.message : "Erro ao atualizar properties");
        return null;
      } finally {
        setLoading(false);
      }
    },
    [user?.id, organization]
  );

  // 4. DELETAR ORGANIZAÇÃO (DELETE - Soft Delete)
  const deleteOrganization = useCallback(async (): Promise<boolean> => {
    if (!user?.id || !organization) return false;

    setLoading(true);
    setError(null);

    try {
      const success = await deleteOrganizationService();
      if (success) {
        setOrganization(null);
        setLastFetch(new Date());
      }
      return success;
    } catch (err: unknown) {
      console.error("Erro ao deletar organização:", err);
      setError(err instanceof Error ? err.message : "Erro ao deletar organização");
      return false;
    } finally {
      setLoading(false);
    }
  }, [user?.id, organization]);

  // 4.1. RESTAURAR ORGANIZAÇÃO
  const restoreOrganization = useCallback(async (): Promise<Organization | null> => {
    if (!user?.id) return null;

    setLoading(true);
    setError(null);

    try {
      const restoredOrganization = await restoreOrganizationService();
      setOrganization(restoredOrganization);
      setLastFetch(new Date());
      return restoredOrganization;
    } catch (err: unknown) {
      console.error("Erro ao restaurar organização:", err);
      setError(err instanceof Error ? err.message : "Erro ao restaurar organização");
      return null;
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // 5. ADICIONAR MEMBRO
  const addMember = useCallback(
    async (memberId: string, role: "admin" | "member" = "member"): Promise<boolean> => {
      if (!user?.id || !organization) return false;

      setLoading(true);
      setError(null);

      try {
        const memberData: AddMemberData = { memberId, role };
        const updatedOrganization = await addMemberService(memberData);
        setOrganization(updatedOrganization);
        setLastFetch(new Date());
        return true;
      } catch (err: unknown) {
        console.error("Erro ao adicionar membro:", err);
        setError(err instanceof Error ? err.message : "Erro ao adicionar membro");
        return false;
      } finally {
        setLoading(false);
      }
    },
    [user?.id, organization]
  );

  // 6. REMOVER MEMBRO
  const removeMember = useCallback(
    async (memberId: string): Promise<boolean> => {
      if (!user?.id || !organization) return false;

      setLoading(true);
      setError(null);

      try {
        const updatedOrganization = await removeMemberService(memberId);
        setOrganization(updatedOrganization);
        setLastFetch(new Date());
        return true;
      } catch (err: unknown) {
        console.error("Erro ao remover membro:", err);
        setError(err instanceof Error ? err.message : "Erro ao remover membro");
        return false;
      } finally {
        setLoading(false);
      }
    },
    [user?.id, organization]
  );

  // 7. FUNÇÕES DE DADOS DERIVADOS

  const getStats = useCallback((): OrganizationStats => {
    if (!organization) {
      return {
        totalMembers: 0,
        totalProjects: 0,
        totalAdmins: 0,
        totalInvited: 0,
        featuresEnabled: 0,
        activeDomains: 0,
      };
    }

    const members = organization.members || { owner: "", admins: [], members: [], invited: [] };
    const projects = organization.projects || { projects: [], count: 0 };
    const properties = organization.properties || {};
    const features = properties.features || {};
    const domains = organization.org_domains || [];

    const featuresEnabled = Object.values(features).filter(Boolean).length;

    return {
      totalMembers: 1 + (members.admins?.length || 0) + (members.members?.length || 0),
      totalProjects: projects.count || projects.projects?.length || 0,
      totalAdmins: members.admins?.length || 0,
      totalInvited: members.invited?.length || 0,
      featuresEnabled,
      activeDomains: domains.length,
    };
  }, [organization]);

  const isOwner = useCallback(
    (userId: string): boolean => {
      return organization?.members?.owner === userId;
    },
    [organization]
  );

  const isAdmin = useCallback(
    (userId: string): boolean => {
      return organization?.members?.admins?.includes(userId) || false;
    },
    [organization]
  );

  const isMember = useCallback(
    (userId: string): boolean => {
      return organization?.members?.members?.includes(userId) || false;
    },
    [organization]
  );

  const canManageMembers = useCallback(
    (userId: string): boolean => {
      return isOwner(userId) || isAdmin(userId);
    },
    [isOwner, isAdmin]
  );

  // 8. EFEITOS

  // Buscar organização ao montar o componente
  useEffect(() => {
    if (user?.id && !organization && !loading) {
      fetchOrganization();
    }
  }, [user?.id, organization, loading, fetchOrganization]);

  const hasOrganization = organization !== null && !organization.deleted;

  const value: OrganizationContextType = {
    organization,
    loading,
    error,
    lastFetch,
    hasOrganization,
    fetchOrganization,
    refreshOrganization,
    createOrganization,
    updateOrganization,
    updateProperties,
    deleteOrganization,
    restoreOrganization,
    addMember,
    removeMember,
    getStats,
    isOwner,
    isAdmin,
    isMember,
    canManageMembers,
  };

  return <OrganizationContext.Provider value={value}>{children}</OrganizationContext.Provider>;
}
