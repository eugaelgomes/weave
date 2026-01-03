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
  fetchOrganizationMembers as fetchMembersService,
  fetchPendingInvites as fetchInvitesService,
  addMemberDirectly as addMemberDirectlyService,
  inviteMember as inviteMemberService,
  cancelInvite as cancelInviteService,
  removeMember as removeMemberService,
  type Organization,
  type OrganizationMember,
  type OrganizationInvite,
  type CreateOrganizationData,
  type UpdateOrganizationData,
  type OrganizationProperties,
  type InviteMemberData,
} from "../services/organization";

export interface OrganizationStats {
  totalMembers: number;
  totalProjects: number;
  totalAdmins: number;
  totalInvited: number;
  featuresEnabled: number;
  activeDomains: number;
}

export interface OrganizationContextType {
  // Estado
  organization: Organization | null;
  members: OrganizationMember[];
  invites: OrganizationInvite[];
  loading: boolean;
  error: string | null;
  lastFetch: Date | null;
  hasOrganization: boolean;

  // CRUD Organização
  fetchOrganizationData: () => Promise<void>; // Busca Org + Membros + Convites
  refreshOrganization: () => Promise<void>;
  createOrganization: (organizationData: CreateOrganizationData) => Promise<Organization | null>;
  updateOrganization: (organizationData: UpdateOrganizationData) => Promise<Organization | null>;
  updateProperties: (properties: OrganizationProperties) => Promise<Organization | null>;
  deleteOrganization: () => Promise<boolean>;
  restoreOrganization: () => Promise<Organization | null>;

  // Gestão de Membros
  addMember: (memberId: string, role: string) => Promise<boolean>; // Adição direta (Admin)
  inviteMember: (data: InviteMemberData) => Promise<{ success: boolean; message: string }>; // Convite por email
  cancelInvite: (inviteId: string) => Promise<boolean>;
  removeMember: (memberId: string) => Promise<boolean>;

  // Dados Derivados
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

  // Estados
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [invites, setInvites] = useState<OrganizationInvite[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);

  // 1. BUSCAR DADOS COMPLETOS (Org + Membros + Convites)
  const fetchOrganizationData = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    setError(null);

    try {
      // 1. Busca Organização
      const orgData = await fetchOrganizationService();
      setOrganization(orgData);

      if (orgData) {
        // 2. Se tem organização, busca membros e convites em paralelo
        const [membersData, invitesData] = await Promise.all([
          fetchMembersService(),
          fetchInvitesService()
        ]);
        setMembers(membersData);
        setInvites(invitesData);
      } else {
        setMembers([]);
        setInvites([]);
      }

      setLastFetch(new Date());
    } catch (err: unknown) {
      console.error("Erro ao buscar dados da organização:", err);
      // Não setamos organization como null aqui imediatamente se for um erro de rede temporário,
      // mas se for 404 o service já retorna null.
      if (err instanceof Error) {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // 1.1 Refresh Manual
  const refreshOrganization = useCallback(async () => {
    await fetchOrganizationData();
  }, [fetchOrganizationData]);

  // 2. CRIAR ORGANIZAÇÃO
  const createOrganization = useCallback(
    async (organizationData: CreateOrganizationData): Promise<Organization | null> => {
      if (!user?.id) return null;
      setLoading(true);
      setError(null);
      try {
        const newOrg = await createOrganizationService(organizationData);
        setOrganization(newOrg);
        // Ao criar, o criador é o único membro/dono
        await fetchOrganizationData(); // Recarrega tudo para garantir consistência
        return newOrg;
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Erro ao criar organização");
        return null;
      } finally {
        setLoading(false);
      }
    },
    [user?.id, fetchOrganizationData]
  );

  // 3. ATUALIZAR ORGANIZAÇÃO
  const updateOrganization = useCallback(
    async (organizationData: UpdateOrganizationData): Promise<Organization | null> => {
      setLoading(true);
      setError(null);
      try {
        const updatedOrg = await updateOrganizationService(organizationData);
        setOrganization(updatedOrg);
        return updatedOrg;
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Erro ao atualizar organização");
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // 3.1 ATUALIZAR PROPERTIES
  const updateProperties = useCallback(
    async (properties: OrganizationProperties): Promise<Organization | null> => {
      setLoading(true);
      setError(null);
      try {
        const updatedOrg = await updateOrganizationPropertiesService(properties);
        setOrganization(updatedOrg);
        return updatedOrg;
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Erro ao atualizar propriedades");
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // 4. DELETAR
  const deleteOrganization = useCallback(async (): Promise<boolean> => {
    setLoading(true);
    try {
      const success = await deleteOrganizationService();
      if (success) {
        setOrganization(null);
        setMembers([]);
        setInvites([]);
      }
      return success;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao deletar organização");
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // 4.1 RESTAURAR
  const restoreOrganization = useCallback(async (): Promise<Organization | null> => {
    setLoading(true);
    try {
      const restoredOrg = await restoreOrganizationService();
      setOrganization(restoredOrg);
      await fetchOrganizationData(); // Recarrega dados completos
      return restoredOrg;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao restaurar organização");
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchOrganizationData]);

  // 5. MEMBROS: Adicionar Direto (Admin)
  const addMember = useCallback(
    async (memberId: string, role: string = "member"): Promise<boolean> => {
      setLoading(true);
      try {
        await addMemberDirectlyService(memberId, role);
        // Atualiza a lista local
        const updatedMembers = await fetchMembersService();
        setMembers(updatedMembers);
        return true;
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Erro ao adicionar membro");
        return false;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // 5.1 MEMBROS: Convidar por Email
  const inviteMember = useCallback(
    async (data: InviteMemberData): Promise<{ success: boolean; message: string }> => {
      setLoading(true);
      try {
        const res = await inviteMemberService(data);
        // Atualiza a lista de convites
        const updatedInvites = await fetchInvitesService();
        setInvites(updatedInvites);
        return { success: true, message: res.message };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Erro ao enviar convite";
        setError(msg);
        return { success: false, message: msg };
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // 5.2 CANCELAR CONVITE
  const cancelInvite = useCallback(async (inviteId: string): Promise<boolean> => {
      setLoading(true);
      try {
          await cancelInviteService(inviteId);
          setInvites(prev => prev.filter(i => i.invite_id !== inviteId));
          return true;
      } catch (err) {
          setError(err instanceof Error ? err.message : "Erro ao cancelar convite");
          return false;
      } finally {
          setLoading(false);
      }
  }, []);

  // 6. REMOVER MEMBRO
  const removeMember = useCallback(
    async (memberId: string): Promise<boolean> => {
      setLoading(true);
      try {
        await removeMemberService(memberId);
        setMembers((prev) => prev.filter((m) => m.user_id !== memberId));
        return true;
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Erro ao remover membro");
        return false;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // 7. DADOS DERIVADOS E STATS
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

    // Calcula stats baseados nos estados de members e invites
    const properties = organization.properties || {};
    const features = properties.features || {};
    const domains = organization.org_domains || [];
    const featuresEnabled = Object.values(features).filter(Boolean).length;

    const adminsCount = members.filter(m => m.role === 'admin' || m.role === 'owner').length;

    return {
      totalMembers: members.length,
      totalProjects: 0, // Projetos precisariam vir de um ProjectService separado
      totalAdmins: adminsCount,
      totalInvited: invites.length,
      featuresEnabled,
      activeDomains: domains.length,
    };
  }, [organization, members, invites]);

  // Verifica permissões baseando-se no ID do usuário na lista de membros atualizada
  const getMemberRole = useCallback((userId: string) => {
    if (!userId || members.length === 0) return null;
    const member = members.find(m => m.user_id === userId);
    return member ? member.role : null;
  }, [members]);

  const isOwner = useCallback((userId: string): boolean => {
    // Check rápido na prop owner da organização
    if (organization?.user_id === userId) return true;
    // Fallback para lista de membros
    return getMemberRole(userId) === 'owner';
  }, [organization, getMemberRole]);

  const isAdmin = useCallback((userId: string): boolean => {
    const role = getMemberRole(userId);
    return role === 'admin';
  }, [getMemberRole]);

  const isMember = useCallback((userId: string): boolean => {
    const role = getMemberRole(userId);
    return role === 'member';
  }, [getMemberRole]);

  const canManageMembers = useCallback((userId: string): boolean => {
    return isOwner(userId) || isAdmin(userId);
  }, [isOwner, isAdmin]);

  // 8. INITIAL LOAD
  useEffect(() => {
    // Carrega apenas se tiver usuário e ainda não tiver carregado (ou se não estiver carregando)
    if (user?.id && !organization && !loading) {
        fetchOrganizationData();
    }
  }, [user?.id, organization, loading, fetchOrganizationData]);

  const hasOrganization = organization !== null && !organization.deleted;

  const value: OrganizationContextType = {
    organization,
    members,
    invites,
    loading,
    error,
    lastFetch,
    hasOrganization,
    fetchOrganizationData,
    refreshOrganization,
    createOrganization,
    updateOrganization,
    updateProperties,
    deleteOrganization,
    restoreOrganization,
    addMember,
    inviteMember,
    cancelInvite,
    removeMember,
    getStats,
    isOwner,
    isAdmin,
    isMember,
    canManageMembers,
  };

  return <OrganizationContext.Provider value={value}>{children}</OrganizationContext.Provider>;
}