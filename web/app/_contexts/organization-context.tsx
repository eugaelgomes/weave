"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "./auth-context";
import {
  fetchWorkspace as fetchWorkspaceService,
  createWorkspace as createWorkspaceService,
  updateWorkspace as updateWorkspaceService,
  uploadWorkspaceLogo as uploadWorkspaceLogoService,
  uploadWorkspaceBanner as uploadWorkspaceBannerService,
  updateWorkspaceProperties as updateWorkspacePropertiesService,
  deleteWorkspace as deleteWorkspaceService,
  restoreWorkspace as restoreWorkspaceService,
  fetchWorkspaceMembers as fetchMembersService,
  fetchPendingInvites as fetchInvitesService,
  fetchWorkspaceAreas as fetchAreasService,
  fetchAreaMembers as fetchAreaMembersService,
  createWorkspaceArea as createAreaService,
  getWorkspaceArea as getAreaService,
  updateWorkspaceArea as updateAreaService,
  deleteWorkspaceArea as deleteAreaService,
  addAreaMember as addAreaMemberService,
  updateAreaMember as updateAreaMemberService,
  removeAreaMember as removeAreaMemberService,
  addMemberDirectly as addMemberDirectlyService,
  inviteMember as inviteMemberService,
  cancelInvite as cancelInviteService,
  removeMember as removeMemberService,
  updateMemberRole as updateMemberRoleService,
  type Workspace,
  type WorkspaceMember,
  type WorkspaceInvite,
  type WorkspaceArea,
  type WorkspaceAreaMember,
  type CreateWorkspaceData,
  type UpdateWorkspaceData,
  type WorkspaceProperties,
  type InviteMemberData,
  type CreateWorkspaceAreaInput,
  type UpdateWorkspaceAreaInput,
  type AddAreaMemberInput,
  type UpdateAreaMemberInput,
  type WorkspaceMembersData,
  type WorkspaceRole,
} from "../_services/workspace";

export type {
  WorkspaceArea,
  WorkspaceAreaMember,
  WorkspaceMember,
  WorkspaceAreaMemberRole,
  WorkspaceAreaProperties,
  WorkspaceMembersData,
  WorkspaceRole,
} from "../_services/workspace";

export interface WorkspaceStats {
  totalMembers: number;
  totalProjects: number;
  totalAdmins: number;
  totalInvited: number;
  featuresEnabled: number;
}

export interface WorkspaceContextType {
  // Estado
  workspace: Workspace | null;
  members: WorkspaceMember[];
  memberStats: Omit<WorkspaceMembersData, "list_workspace_members"> | null;
  invites: WorkspaceInvite[];
  areas: WorkspaceArea[];
  areaMembers: Record<string, WorkspaceAreaMember[]>;
  loading: boolean;
  areasLoading: boolean;
  areaMembersLoading: boolean;
  error: string | null;
  areasError: string | null;
  areaMembersError: string | null;
  lastFetch: Date | null;
  hasWorkspace: boolean;

  // CRUD Workspaceanização
  fetchWorkspaceData: () => Promise<void>; // Busca Workspace + Membros + Convites
  refreshWorkspace: () => Promise<void>;
  createWorkspace: (workspaceData: CreateWorkspaceData) => Promise<Workspace | null>;
  updateWorkspace: (workspaceData: UpdateWorkspaceData) => Promise<Workspace | null>;
  uploadLogo: (file: File) => Promise<Workspace | null>;
  uploadBanner: (file: File) => Promise<Workspace | null>;
  updateProperties: (properties: WorkspaceProperties) => Promise<Workspace | null>;
  deleteWorkspace: () => Promise<boolean>;
  restoreWorkspace: () => Promise<Workspace | null>;

  // Gestão de Membros
  addMember: (memberId: string, role: string) => Promise<boolean>; // Adição direta (Admin)
  inviteMember: (data: InviteMemberData) => Promise<{ success: boolean; message: string }>; // Convite por email
  cancelInvite: (inviteId: string) => Promise<boolean>;
  removeMember: (memberId: string) => Promise<boolean>;
  updateMemberRole: (memberId: string, role: WorkspaceRole) => Promise<boolean>;

  // Gestão de Áreas
  fetchAreas: (force?: boolean) => Promise<WorkspaceArea[]>;
  getAreaById: (areaId: string, options?: { force?: boolean }) => Promise<WorkspaceArea | null>;
  createArea: (data: CreateWorkspaceAreaInput) => Promise<WorkspaceArea | null>;
  updateArea: (
    areaId: string,
    data: UpdateWorkspaceAreaInput
  ) => Promise<WorkspaceArea | null>;
  deleteArea: (areaId: string) => Promise<boolean>;
  fetchAreaMembers: (areaId: string, force?: boolean) => Promise<WorkspaceAreaMember[]>;
  addAreaMember: (
    areaId: string,
    data: AddAreaMemberInput
  ) => Promise<WorkspaceAreaMember | null>;
  updateAreaMember: (
    areaId: string,
    memberId: string,
    data: UpdateAreaMemberInput
  ) => Promise<WorkspaceAreaMember | null>;
  removeAreaMember: (areaId: string, memberId: string) => Promise<boolean>;

  // Dados Derivados
  getStats: () => WorkspaceStats;
  getMemberRole: (userId: string) => WorkspaceRole | null;
  isOwner: (userId: string) => boolean;
  isAdmin: (userId: string) => boolean;
  isMember: (userId: string) => boolean;
  canManageMembers: (userId: string) => boolean;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

function workspaceFromSession(
  user: ReturnType<typeof useAuth>["user"],
  requestedPublicId?: string
): Workspace | null {
  const activeWorkspace = user?.user_workspace;

  if (
    !user?.id ||
    !activeWorkspace?.id ||
    !activeWorkspace.public_id ||
    (requestedPublicId && activeWorkspace.public_id !== requestedPublicId)
  ) {
    return null;
  }

  return {
    id: activeWorkspace.id,
    public_id: activeWorkspace.public_id,
    user_id: user.id,
    workspace_name: activeWorkspace.name || user.workspace_name || "Workspace",
    unique_name: activeWorkspace.unique_name || user.workspace_unique_name || "",
    logo_url: activeWorkspace.logo_url ?? user.workspace_logo_url,
    deleted: false,
    created_at: "",
    updated_at: "",
  };
}

export function useWorkspace(): WorkspaceContextType {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error("useWorkspace deve ser usado dentro de um WorkspaceProvider");
  }
  return context;
}

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const params = useParams<{ publicId?: string }>();
  const requestedPublicId =
    typeof params.publicId === "string" ? params.publicId : undefined;

  // Estados
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [memberStats, setMemberStats] = useState<Omit<
    WorkspaceMembersData,
    "list_workspace_members"
  > | null>(null);
  const [invites, setInvites] = useState<WorkspaceInvite[]>([]);
  const [areas, setAreas] = useState<WorkspaceArea[]>([]);
  const [areaMembers, setAreaMembers] = useState<Record<string, WorkspaceAreaMember[]>>({});

  const [loading, setLoading] = useState(false);
  const [areasLoading, setAreasLoading] = useState(false);
  const [areaMembersLoading, setAreaMembersLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [areasError, setAreasError] = useState<string | null>(null);
  const [areaMembersError, setAreaMembersError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);
  const [initialFetchDone, setInitialFetchDone] = useState(false);
  const [areasFetched, setAreasFetched] = useState(false);

  useEffect(() => {
    setInitialFetchDone(false);
    setWorkspace(null);
  }, [requestedPublicId]);

  // 1. BUSCAR DADOS COMPLETOS (Workspace + Membros + Convites)
  const fetchWorkspaceData = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    setError(null);

    try {
      // 1. Busca Workspaceanização
      const orgData = await fetchWorkspaceService(requestedPublicId);
      setWorkspace(orgData);

      if (orgData) {
        // 2. Se tem organização, busca membros e convites em paralelo
        const [membersData, invitesData] = await Promise.all([
          fetchMembersService(),
          fetchInvitesService(),
        ]);
        if (membersData) {
          setMembers(membersData.list_workspace_members);
          setMemberStats({
            count: membersData.count,
            count_by_role: membersData.count_by_role,
            count_by_status: membersData.count_by_status,
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
      // The authenticated session already identifies the active workspace. Do
      // not turn a transient details request into the misleading create-workspace
      // screen when that workspace is exactly the one in the scoped URL.
      const sessionWorkspace = workspaceFromSession(user, requestedPublicId);
      if (sessionWorkspace) {
        setWorkspace(sessionWorkspace);
      }
      setInitialFetchDone(true);
      // Não setamos workspace como null aqui imediatamente se for um erro de rede temporário,
      // mas se for 404 o service já retorna null.
      if (err instanceof Error) {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, [requestedPublicId, user]);

  // 1.1 Refresh Manual
  const refreshWorkspace = useCallback(async () => {
    await fetchWorkspaceData();
  }, [fetchWorkspaceData]);

  // 2. CRIAR ORGANIZAÇÃO
  const createWorkspace = useCallback(
    async (workspaceData: CreateWorkspaceData): Promise<Workspace | null> => {
      if (!user?.id) return null;
      setLoading(true);
      setError(null);
      try {
        const newWorkspace = await createWorkspaceService(workspaceData, user.id);
        setWorkspace(newWorkspace);
        // Ao criar, o criador é o único membro/dono
        await fetchWorkspaceData(); // Recarrega tudo para garantir consistência
        return newWorkspace;
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Erro ao criar organização");
        return null;
      } finally {
        setLoading(false);
      }
    },
    [user?.id, fetchWorkspaceData]
  );

  // 3. ATUALIZAR ORGANIZAÇÃO
  const updateWorkspace = useCallback(
    async (workspaceData: UpdateWorkspaceData): Promise<Workspace | null> => {
      setLoading(true);
      setError(null);
      try {
        const updatedWorkspace = await updateWorkspaceService(workspaceData);
        setWorkspace(updatedWorkspace);
        return updatedWorkspace;
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
  const uploadLogo = useCallback(async (file: File): Promise<Workspace | null> => {
    setLoading(true);
    setError(null);
    try {
      const updatedWorkspace = await uploadWorkspaceLogoService(file);
      setWorkspace(updatedWorkspace);
      return updatedWorkspace;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar logo");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // 3. ATUALIZAR BANNER
  const uploadBanner = useCallback(async (file: File): Promise<Workspace | null> => {
    setLoading(true);
    setError(null);
    try {
      const updatedWorkspace = await uploadWorkspaceBannerService(file);
      setWorkspace(updatedWorkspace);
      return updatedWorkspace;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar banner");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // 3.1 ATUALIZAR PROPERTIES
  const updateProperties = useCallback(
    async (properties: WorkspaceProperties): Promise<Workspace | null> => {
      setLoading(true);
      setError(null);
      try {
        const updatedWorkspace = await updateWorkspacePropertiesService(properties);
        setWorkspace(updatedWorkspace);
        return updatedWorkspace;
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
  const deleteWorkspace = useCallback(async (): Promise<boolean> => {
    setLoading(true);
    try {
      const success = await deleteWorkspaceService();
      if (success) {
        setWorkspace(null);
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
  const restoreWorkspace = useCallback(async (): Promise<Workspace | null> => {
    setLoading(true);
    try {
      const restoredWorkspace = await restoreWorkspaceService();
      setWorkspace(restoredWorkspace);
      await fetchWorkspaceData(); // Recarrega dados completos
      return restoredWorkspace;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao restaurar organização");
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchWorkspaceData]);

  // 5. MEMBROS: Adicionar Direto (Admin)
  const addMember = useCallback(
    async (memberId: string, role: string = "MEMBER"): Promise<boolean> => {
      setLoading(true);
      try {
        await addMemberDirectlyService(memberId, role);
        const updatedMembers = await fetchMembersService();
        if (updatedMembers) {
          setMembers(updatedMembers.list_workspace_members);
          setMemberStats({
            count: updatedMembers.count,
            count_by_role: updatedMembers.count_by_role,
            count_by_status: updatedMembers.count_by_status,
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

  const updateMemberRole = useCallback(
    async (memberId: string, role: WorkspaceRole): Promise<boolean> => {
      setLoading(true);
      try {
        const updatedMember = await updateMemberRoleService(memberId, role);

        setMembers((prev) =>
          prev.map((member) =>
            member.id === memberId
              ? {
                  ...member,
                  membership: {
                    ...member.membership,
                    role: updatedMember?.membership?.role ?? role,
                    updated_at: updatedMember?.membership?.updated_at,
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
    },
    []
  );

  // 6.1 GESTÃO DE ÁREAS
  const fetchAreas = useCallback(
    async (force = false): Promise<WorkspaceArea[]> => {
      if (!workspace?.id) {
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
    [workspace?.id, areasFetched, areas]
  );

  const getAreaById = useCallback(
    async (areaId: string, options: { force?: boolean } = {}): Promise<WorkspaceArea | null> => {
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
    async (data: CreateWorkspaceAreaInput): Promise<WorkspaceArea | null> => {
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
    async (areaId: string, data: UpdateWorkspaceAreaInput): Promise<WorkspaceArea | null> => {
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
    async (areaId: string, force = false): Promise<WorkspaceAreaMember[]> => {
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
    async (areaId: string, data: AddAreaMemberInput): Promise<WorkspaceAreaMember | null> => {
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
    ): Promise<WorkspaceAreaMember | null> => {
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
  const getStats = useCallback((): WorkspaceStats => {
    if (!workspace) {
      return {
        totalMembers: 0,
        totalProjects: 0,
        totalAdmins: 0,
        totalInvited: 0,
        featuresEnabled: 0,
      };
    }

    // Calcula stats baseados nos estados de members e invites
    const properties = workspace.properties || {};
    const features = properties.features || {};
    const featuresEnabled = Object.values(features).filter(Boolean).length;

    const adminsCount = members.filter(
      (m) => m.membership?.role === "ADMIN" || m.membership?.role === "SUPER_ADMIN"
    ).length;

    return {
      totalMembers: members.length,
      totalProjects: 0, // Projetos precisariam vir de um ProjectService separado
      totalAdmins: adminsCount,
      totalInvited: invites.length,
      featuresEnabled,
    };
  }, [workspace, members, invites]);

  // Verifica permissões baseando-se no ID do usuário na lista de membros atualizada
  const getMemberRole = useCallback(
    (userId: string) => {
      if (!userId || members.length === 0) return null;
      const member = members.find((m) => m.id === userId);
      return member?.membership?.role ?? null;
    },
    [members]
  );

  const isOwner = useCallback(
    (userId: string): boolean => {
      // Check rápido na prop owner da organização
      if (workspace?.user_id === userId) return true;
      // Fallback para lista de membros
      return getMemberRole(userId) === "SUPER_ADMIN";
    },
    [workspace, getMemberRole]
  );

  const isAdmin = useCallback(
    (userId: string): boolean => {
      const role = getMemberRole(userId);
      return role === "ADMIN";
    },
    [getMemberRole]
  );

  const isMember = useCallback(
    (userId: string): boolean => {
      const role = getMemberRole(userId);
      return role === "MEMBER";
    },
    [getMemberRole]
  );

  const canManageMembers = useCallback(
    (userId: string): boolean => {
      return isOwner(userId) || isAdmin(userId);
    },
    [isOwner, isAdmin]
  );

  // 8. INITIAL LOAD — só busca se o usuário tem workspace_id (vem do login/me)
  useEffect(() => {
    if (user?.id && (requestedPublicId || user.workspace_id) && !initialFetchDone && !loading) {
      fetchWorkspaceData();
    } else if (user?.id && !requestedPublicId && !user.workspace_id) {
      setInitialFetchDone(true);
    }
  }, [user?.id, user?.workspace_id, requestedPublicId, initialFetchDone, loading, fetchWorkspaceData]);

  useEffect(() => {
    if (workspace?.id && !areasFetched) {
      fetchAreas().catch(() => {});
    }
  }, [workspace?.id, areasFetched, fetchAreas]);

  const hasWorkspace = workspace !== null && !workspace.deleted;

  const value: WorkspaceContextType = {
    workspace,
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
    hasWorkspace,
    fetchWorkspaceData,
    refreshWorkspace,
    createWorkspace,
    updateWorkspace,
    uploadLogo,
    uploadBanner,
    updateProperties,
    deleteWorkspace,
    restoreWorkspace,
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
    getMemberRole,
    isOwner,
    isAdmin,
    isMember,
    canManageMembers,
  };

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}
