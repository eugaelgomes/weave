"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useAuth } from "./auth-context";
import {
  fetchOrganization as fetchOrganizationService,
  createOrganization as createOrganizationService,
  updateOrganization as updateOrganizationService,
  uploadOrganizationLogo as uploadOrganizationLogoService,
  uploadOrganizationBanner as uploadOrganizationBannerService,
  updateOrganizationProperties as updateOrganizationPropertiesService,
  deleteOrganization as deleteOrganizationService,
  restoreOrganization as restoreOrganizationService,
  fetchOrganizationMembers as fetchMembersService,
  fetchPendingInvites as fetchInvitesService,
  fetchOrganizationAreas as fetchAreasService,
  fetchAreaMembers as fetchAreaMembersService,
  createOrganizationArea as createAreaService,
  getOrganizationArea as getAreaService,
  updateOrganizationArea as updateAreaService,
  deleteOrganizationArea as deleteAreaService,
  addAreaMember as addAreaMemberService,
  updateAreaMember as updateAreaMemberService,
  removeAreaMember as removeAreaMemberService,
  addMemberDirectly as addMemberDirectlyService,
  inviteMember as inviteMemberService,
  cancelInvite as cancelInviteService,
  removeMember as removeMemberService,
  updateMemberRole as updateMemberRoleService,
  type Organization,
  type OrganizationMember,
  type OrganizationInvite,
  type OrganizationArea,
  type OrganizationAreaMember,
  type CreateOrganizationData,
  type UpdateOrganizationData,
  type OrganizationProperties,
  type InviteMemberData,
  type CreateOrganizationAreaInput,
  type UpdateOrganizationAreaInput,
  type AddAreaMemberInput,
  type UpdateAreaMemberInput,
  type OrganizationMembersData,
} from "../_services/organization";

export type {
  OrganizationArea,
  OrganizationAreaMember,
  OrganizationMember,
  OrganizationAreaMemberRole,
  OrganizationAreaProperties,
  OrganizationMembersData,
} from "../_services/organization";

export interface OrganizationStats {
  totalMembers: number;
  totalProjects: number;
  totalAdmins: number;
  totalInvited: number;
  featuresEnabled: number;
}

export interface OrganizationContextType {
  // Estado
  organization: Organization | null;
  members: OrganizationMember[];
  memberStats: Omit<OrganizationMembersData, "list_org_members"> | null;
  invites: OrganizationInvite[];
  areas: OrganizationArea[];
  areaMembers: Record<string, OrganizationAreaMember[]>;
  loading: boolean;
  areasLoading: boolean;
  areaMembersLoading: boolean;
  error: string | null;
  areasError: string | null;
  areaMembersError: string | null;
  lastFetch: Date | null;
  hasOrganization: boolean;

  // CRUD Organização
  fetchOrganizationData: () => Promise<void>; // Busca Org + Membros + Convites
  refreshOrganization: () => Promise<void>;
  createOrganization: (organizationData: CreateOrganizationData) => Promise<Organization | null>;
  updateOrganization: (organizationData: UpdateOrganizationData) => Promise<Organization | null>;
  uploadLogo: (file: File) => Promise<Organization | null>;
  uploadBanner: (file: File) => Promise<Organization | null>;
  updateProperties: (properties: OrganizationProperties) => Promise<Organization | null>;
  deleteOrganization: () => Promise<boolean>;
  restoreOrganization: () => Promise<Organization | null>;

  // Gestão de Membros
  addMember: (memberId: string, role: string) => Promise<boolean>; // Adição direta (Admin)
  inviteMember: (data: InviteMemberData) => Promise<{ success: boolean; message: string }>; // Convite por email
  cancelInvite: (inviteId: string) => Promise<boolean>;
  removeMember: (memberId: string) => Promise<boolean>;
  updateMemberRole: (memberId: string, role: string) => Promise<boolean>;

  // Gestão de Áreas
  fetchAreas: (force?: boolean) => Promise<OrganizationArea[]>;
  getAreaById: (areaId: string, options?: { force?: boolean }) => Promise<OrganizationArea | null>;
  createArea: (data: CreateOrganizationAreaInput) => Promise<OrganizationArea | null>;
  updateArea: (
    areaId: string,
    data: UpdateOrganizationAreaInput
  ) => Promise<OrganizationArea | null>;
  deleteArea: (areaId: string) => Promise<boolean>;
  fetchAreaMembers: (areaId: string, force?: boolean) => Promise<OrganizationAreaMember[]>;
  addAreaMember: (
    areaId: string,
    data: AddAreaMemberInput
  ) => Promise<OrganizationAreaMember | null>;
  updateAreaMember: (
    areaId: string,
    memberId: string,
    data: UpdateAreaMemberInput
  ) => Promise<OrganizationAreaMember | null>;
  removeAreaMember: (areaId: string, memberId: string) => Promise<boolean>;

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
  const [memberStats, setMemberStats] = useState<Omit<
    OrganizationMembersData,
    "list_org_members"
  > | null>(null);
  const [invites, setInvites] = useState<OrganizationInvite[]>([]);
  const [areas, setAreas] = useState<OrganizationArea[]>([]);
  const [areaMembers, setAreaMembers] = useState<Record<string, OrganizationAreaMember[]>>({});

  const [loading, setLoading] = useState(false);
  const [areasLoading, setAreasLoading] = useState(false);
  const [areaMembersLoading, setAreaMembersLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [areasError, setAreasError] = useState<string | null>(null);
  const [areaMembersError, setAreaMembersError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);
  const [initialFetchDone, setInitialFetchDone] = useState(false);
  const [areasFetched, setAreasFetched] = useState(false);

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
          fetchInvitesService(),
        ]);
        if (membersData) {
          setMembers(membersData.list_org_members);
          setMemberStats({
            count: membersData.count,
            count_by_role: membersData.count_by_role,
            count_by_status: membersData.count_by_status,
            count_by_suspended: membersData.count_by_suspended,
          });
        } else {
          setMembers([]);
          setMemberStats(null);
        }
        setInvites(invitesData);
        setAreasFetched(false);
      } else {
        setMembers([]);
        setMemberStats(null);
        setInvites([]);
        setAreas([]);
        setAreaMembers({});
        setAreasFetched(false);
      }

      setLastFetch(new Date());
      setInitialFetchDone(true);
    } catch (err: unknown) {
      console.error("Erro ao buscar dados da organização:", err);
      setInitialFetchDone(true);
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

  // 3. ATUALIZAR LOGO
  const uploadLogo = useCallback(async (file: File): Promise<Organization | null> => {
    setLoading(true);
    setError(null);
    try {
      const updatedOrg = await uploadOrganizationLogoService(file);
      setOrganization(updatedOrg);
      return updatedOrg;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar logo");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // 3. ATUALIZAR BANNER
  const uploadBanner = useCallback(async (file: File): Promise<Organization | null> => {
    setLoading(true);
    setError(null);
    try {
      const updatedOrg = await uploadOrganizationBannerService(file);
      setOrganization(updatedOrg);
      return updatedOrg;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar banner");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

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
        setAreas([]);
        setAreaMembers({});
        setAreasFetched(false);
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
        const updatedMembers = await fetchMembersService();
        if (updatedMembers) {
          setMembers(updatedMembers.list_org_members);
          setMemberStats({
            count: updatedMembers.count,
            count_by_role: updatedMembers.count_by_role,
            count_by_status: updatedMembers.count_by_status,
            count_by_suspended: updatedMembers.count_by_suspended,
          });
        } else {
          setMembers([]);
          setMemberStats(null);
        }
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
      setInvites((prev) => prev.filter((i) => i.invite_id !== inviteId));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao cancelar convite");
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // 6. REMOVER MEMBRO
  const removeMember = useCallback(async (memberId: string): Promise<boolean> => {
    setLoading(true);
    try {
      await removeMemberService(memberId);
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
      return true;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao remover membro");
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateMemberRole = useCallback(async (memberId: string, role: string): Promise<boolean> => {
    setLoading(true);
    try {
      const updatedMember = await updateMemberRoleService(
        memberId,
        role as OrganizationMember["membership"]["role"]
      );

      setMembers((prev) =>
        prev.map((member) =>
          member.id === memberId
            ? {
                ...member,
                membership: {
                  ...member.membership,
                  role: updatedMember.membership.role,
                  updated_at: updatedMember.membership.updated_at,
                },
              }
            : member
        )
      );

      return true;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar função do membro");
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // 6.1 GESTÃO DE ÁREAS
  const fetchAreas = useCallback(
    async (force = false): Promise<OrganizationArea[]> => {
      if (!organization?.id) {
        setAreas([]);
        setAreasFetched(false);
        return [];
      }

      if (areasFetched && !force) {
        return areas;
      }

      setAreasLoading(true);
      setAreasError(null);

      try {
        const fetchedAreas = await fetchAreasService();
        setAreas(fetchedAreas);
        setAreasFetched(true);
        return fetchedAreas;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Erro ao carregar áreas";
        setAreasError(message);
        throw err;
      } finally {
        setAreasLoading(false);
      }
    },
    [organization?.id, areasFetched, areas]
  );

  const getAreaById = useCallback(
    async (areaId: string, options: { force?: boolean } = {}): Promise<OrganizationArea | null> => {
      if (!areaId) return null;
      const { force = false } = options;

      if (!force) {
        const cached = areas.find((area) => area.id === areaId);
        if (cached) {
          return cached;
        }
      }

      try {
        const area = await getAreaService(areaId);
        setAreas((prev) => {
          const exists = prev.some((item) => item.id === area.id);
          return exists ? prev.map((item) => (item.id === area.id ? area : item)) : [...prev, area];
        });
        return area;
      } catch (err: unknown) {
        setAreasError(err instanceof Error ? err.message : "Erro ao buscar área");
        return null;
      }
    },
    [areas]
  );

  const createArea = useCallback(
    async (data: CreateOrganizationAreaInput): Promise<OrganizationArea | null> => {
      setAreasLoading(true);
      setAreasError(null);
      try {
        const newArea = await createAreaService(data);
        setAreas((prev) => [...prev, newArea]);
        return newArea;
      } catch (err: unknown) {
        setAreasError(err instanceof Error ? err.message : "Erro ao criar área");
        return null;
      } finally {
        setAreasLoading(false);
      }
    },
    []
  );

  const updateArea = useCallback(
    async (areaId: string, data: UpdateOrganizationAreaInput): Promise<OrganizationArea | null> => {
      setAreasLoading(true);
      setAreasError(null);
      try {
        const updated = await updateAreaService(areaId, data);
        setAreas((prev) => prev.map((area) => (area.id === areaId ? updated : area)));
        return updated;
      } catch (err: unknown) {
        setAreasError(err instanceof Error ? err.message : "Erro ao atualizar área");
        return null;
      } finally {
        setAreasLoading(false);
      }
    },
    []
  );

  const deleteArea = useCallback(async (areaId: string): Promise<boolean> => {
    setAreasLoading(true);
    setAreasError(null);
    try {
      await deleteAreaService(areaId);
      setAreas((prev) => prev.filter((area) => area.id !== areaId));
      setAreaMembers((prev) => {
        if (!(areaId in prev)) return prev;
        const { [areaId]: _removed, ...rest } = prev;
        return rest;
      });
      return true;
    } catch (err: unknown) {
      setAreasError(err instanceof Error ? err.message : "Erro ao remover área");
      return false;
    } finally {
      setAreasLoading(false);
    }
  }, []);

  const fetchMembersByArea = useCallback(
    async (areaId: string, force = false): Promise<OrganizationAreaMember[]> => {
      if (!areaId) return [];

      if (!force && areaMembers[areaId]) {
        return areaMembers[areaId];
      }

      setAreaMembersLoading(true);
      setAreaMembersError(null);

      try {
        const membersList = await fetchAreaMembersService(areaId);
        setAreaMembers((prev) => ({ ...prev, [areaId]: membersList }));
        return membersList;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Erro ao carregar membros da área";
        setAreaMembersError(message);
        throw err;
      } finally {
        setAreaMembersLoading(false);
      }
    },
    [areaMembers]
  );

  const addAreaMember = useCallback(
    async (areaId: string, data: AddAreaMemberInput): Promise<OrganizationAreaMember | null> => {
      setAreaMembersLoading(true);
      setAreaMembersError(null);
      try {
        const member = await addAreaMemberService(areaId, data);
        setAreaMembers((prev) => {
          const current = prev[areaId] ?? [];
          return { ...prev, [areaId]: [...current, member] };
        });
        return member;
      } catch (err: unknown) {
        setAreaMembersError(err instanceof Error ? err.message : "Erro ao adicionar membro à área");
        return null;
      } finally {
        setAreaMembersLoading(false);
      }
    },
    []
  );

  const updateAreaMember = useCallback(
    async (
      areaId: string,
      memberId: string,
      data: UpdateAreaMemberInput
    ): Promise<OrganizationAreaMember | null> => {
      setAreaMembersLoading(true);
      setAreaMembersError(null);
      try {
        const updated = await updateAreaMemberService(areaId, memberId, data);
        setAreaMembers((prev) => {
          const current = prev[areaId] ?? [];
          return {
            ...prev,
            [areaId]: current.map((member) =>
              member.user_id === memberId ? { ...member, ...updated } : member
            ),
          };
        });
        return updated;
      } catch (err: unknown) {
        setAreaMembersError(
          err instanceof Error ? err.message : "Erro ao atualizar membro da área"
        );
        return null;
      } finally {
        setAreaMembersLoading(false);
      }
    },
    []
  );

  const removeAreaMember = useCallback(
    async (areaId: string, memberId: string): Promise<boolean> => {
      setAreaMembersLoading(true);
      setAreaMembersError(null);
      try {
        await removeAreaMemberService(areaId, memberId);
        setAreaMembers((prev) => {
          const current = prev[areaId] ?? [];
          return {
            ...prev,
            [areaId]: current.filter((member) => member.user_id !== memberId),
          };
        });
        return true;
      } catch (err: unknown) {
        setAreaMembersError(err instanceof Error ? err.message : "Erro ao remover membro da área");
        return false;
      } finally {
        setAreaMembersLoading(false);
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
      };
    }

    // Calcula stats baseados nos estados de members e invites
    const properties = organization.properties || {};
    const features = properties.features || {};
    const featuresEnabled = Object.values(features).filter(Boolean).length;

    const adminsCount = members.filter(
      (m) => m.membership.role === "admin" || m.membership.role === "super_admin"
    ).length;

    return {
      totalMembers: members.length,
      totalProjects: 0, // Projetos precisariam vir de um ProjectService separado
      totalAdmins: adminsCount,
      totalInvited: invites.length,
      featuresEnabled,
    };
  }, [organization, members, invites]);

  // Verifica permissões baseando-se no ID do usuário na lista de membros atualizada
  const getMemberRole = useCallback(
    (userId: string) => {
      if (!userId || members.length === 0) return null;
      const member = members.find((m) => m.id === userId);
      return member ? member.membership.role : null;
    },
    [members]
  );

  const isOwner = useCallback(
    (userId: string): boolean => {
      // Check rápido na prop owner da organização
      if (organization?.user_id === userId) return true;
      // Fallback para lista de membros
      return getMemberRole(userId) === "super_admin";
    },
    [organization, getMemberRole]
  );

  const isAdmin = useCallback(
    (userId: string): boolean => {
      const role = getMemberRole(userId);
      return role === "admin";
    },
    [getMemberRole]
  );

  const isMember = useCallback(
    (userId: string): boolean => {
      const role = getMemberRole(userId);
      return role === "member";
    },
    [getMemberRole]
  );

  const canManageMembers = useCallback(
    (userId: string): boolean => {
      return isOwner(userId) || isAdmin(userId);
    },
    [isOwner, isAdmin]
  );

  // 8. INITIAL LOAD — só busca se o usuário tem org_id (vem do login/me)
  useEffect(() => {
    if (user?.id && user.org_id && !initialFetchDone && !loading) {
      fetchOrganizationData();
    } else if (user?.id && !user.org_id) {
      setInitialFetchDone(true);
    }
  }, [user?.id, user?.org_id, initialFetchDone, loading, fetchOrganizationData]);

  useEffect(() => {
    if (organization?.id && !areasFetched) {
      fetchAreas().catch(() => {});
    }
  }, [organization?.id, areasFetched, fetchAreas]);

  const hasOrganization = organization !== null && !organization.deleted;

  const value: OrganizationContextType = {
    organization,
    members,
    memberStats,
    invites,
    areas,
    areaMembers,
    loading,
    areasLoading,
    areaMembersLoading,
    error,
    areasError,
    areaMembersError,
    lastFetch,
    hasOrganization,
    fetchOrganizationData,
    refreshOrganization,
    createOrganization,
    updateOrganization,
    uploadLogo,
    uploadBanner,
    updateProperties,
    deleteOrganization,
    restoreOrganization,
    addMember,
    inviteMember,
    cancelInvite,
    removeMember,
    updateMemberRole,
    fetchAreas,
    getAreaById,
    createArea,
    updateArea,
    deleteArea,
    fetchAreaMembers: fetchMembersByArea,
    addAreaMember,
    updateAreaMember,
    removeAreaMember,
    getStats,
    isOwner,
    isAdmin,
    isMember,
    canManageMembers,
  };

  return <OrganizationContext.Provider value={value}>{children}</OrganizationContext.Provider>;
}
