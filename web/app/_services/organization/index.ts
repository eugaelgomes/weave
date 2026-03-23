import { apiClient, handleResponse } from "../api-methods";
import { API_ENDPOINTS } from "../api-methods";

// --- Interfaces ---

export interface OrganizationProperties {
  theme?: "light" | "dark" | "auto";
  language?: string;
  timezone?: string;
  allowPublicNotes?: boolean;
  maxMembers?: number;
  maxProjects?: number;
  features?: {
    aiAgent?: boolean;
    backup?: boolean;
    collaboration?: boolean;
    passwordManager?: boolean;
  };
  branding?: {
    primaryColor?: string;
    secondaryColor?: string;
    customDomain?: string | null;
  };
  notifications?: {
    email?: boolean;
    push?: boolean;
    digest?: "daily" | "weekly" | "monthly";
  };
}

export interface OrganizationMember {
  id: string;
  name?: string;
  username?: string;
  email?: string;
  avatar_url?: string | null;
  membership: {
    role: "super_admin" | "admin" | "member" | "guest";
    status: "active" | "pending" | "suspended";
    suspended: boolean;
    created_at: string;
    updated_at: string;
  };
  activity: {
    notes_count: number;
    projects: Array<{
      project_id: string;
      project_name: string;
      role: string;
    }>;
    last_login_at: string | null;
  };
  invited_by: {
    id: string;
    name?: string;
    username?: string;
    avatar_url?: string | null;
  } | null;
}

export interface OrganizationAreaMetrics {
  headcount?: number;
  projects?: number;
  impact?: number;
  coverage?: number;
}

export interface OrganizationAreaProperties {
  color?: string;
  status?: "ativo" | "planejamento" | "pausado" | "arquivado" | string;
  focus?: string;
  metrics?: OrganizationAreaMetrics;
  tags?: string[];
  [key: string]: unknown;
}

export interface OrganizationArea {
  id: string;
  organization_id: string;
  parent_area_id: string | null;
  area_name: string;
  slug?: string;
  description?: string | null;
  properties?: OrganizationAreaProperties;
  active?: boolean;
  deleted?: boolean;
  created_at?: string;
  updated_at?: string;
}

export type OrganizationAreaMemberRole = "manager" | "editor" | "viewer";

export interface OrganizationAreaMember {
  organization_id: string;
  area_id: string;
  user_id: string;
  role: OrganizationAreaMemberRole | string;
  added_by?: string;
  created_at?: string;
  updated_at?: string;
  removed_at?: string | null;
  name?: string;
  username?: string;
  email?: string;
  avatar_url?: string | null;
}

export interface CreateOrganizationAreaInput {
  area_name: string;
  parent_area_id?: string | null;
  slug?: string | null;
  description?: string | null;
  properties?: OrganizationAreaProperties;
}

export interface UpdateOrganizationAreaInput {
  area_name?: string;
  parent_area_id?: string | null;
  slug?: string | null;
  description?: string | null;
  properties?: OrganizationAreaProperties;
  active?: boolean;
}

export interface AddAreaMemberInput {
  user_id: string;
  role?: OrganizationAreaMemberRole;
}

export interface UpdateAreaMemberInput {
  role: OrganizationAreaMemberRole;
}

export interface OrganizationInvite {
  invite_id: string;
  email: string;
  role: "admin" | "member" | "guest";
  expires_at: string;
  created_at?: string;
  invited_by?: string;
}

export interface OrganizationDomain {
  id: string;
  domain_name: string;
  verification_token: string;
  status: "PENDING" | "VERIFIED" | "FAILED";
  verified_at?: string;
  created_at: string;
  instructions?: {
    type: string;
    host: string;
    value: string;
    description: string;
  };
  dns_checks?: any;
}

export interface Owner {
  id: string;
  name: string;
  username: string;
  email: string;
  avatar_url?: string | null;
}

export interface Organization {
  id: string;
  user_id: string;
  org_name: string;
  unique_name: string;
  logo_url?: string | null;
  banner_url?: string | null;
  description?: string;
  properties?: OrganizationProperties;
  org_domains?: string[] | null;
  deleted: boolean;
  created_at: string;
  updated_at: string;
  owner?: Owner;
  settings?: any;
  plan_snapshot?: any;
  address?: any;
  delete_at?: string;
  deleted_by?: string;
  plan_id?: string;
  branding_properties?: any;
  integrations?: any;
  plan_name?: string;
  plan_details?: any;
  plan_value?: number;
  currency?: string;
  billing_cycle?: string;
}

export interface CreateOrganizationData {
  org_name: string;
  unique_name?: string;
  logo_url?: string;
  banner_url?: string;
  description?: string;
  properties?: OrganizationProperties;
  org_domains?: string[];
}

export interface UpdateOrganizationData {
  org_name?: string;
  unique_name?: string;
  logo_url?: string | null;
  banner_url?: string | null;
  description?: string;
  properties?: OrganizationProperties;
  org_domains?: string[] | null;
}

export interface InviteMemberData {
  email: string;
  role: "admin" | "member" | "guest";
  name?: string;
  username?: string;
}

export interface AcceptInviteData {
  token: string;
  name?: string;
  username?: string;
  password?: string;
}

// --- Helpers de Transformação ---

const transformBackendOrganization = (data: any): Organization => {
  if (!data) return data;

  if (data.identity) {
    let org = {
      ...data.identity,
      properties: data.properties,
      org_domains: data.org_domains,
      deleted: data.deleted,
      created_at: data.created_at,
      updated_at: data.updated_at,
      owner: data.owners && data.owners.length > 0 ? data.owners[0] : undefined,
    };
    return parseOrganizationProperties(org);
  }

  return parseOrganizationProperties(data);
};

const parseOrganizationProperties = (org: Organization): Organization => {
  if (typeof org.properties === "string") {
    try {
      org.properties = JSON.parse(org.properties);
    } catch (e) {
      org.properties = {};
    }
  }

  if (typeof org.org_domains === "string") {
    try {
      org.org_domains = JSON.parse(org.org_domains);
    } catch (e) {
      org.org_domains = [];
    }
  }

  return org;
};

const parseAreaProperties = (area: OrganizationArea): OrganizationArea => {
  if (typeof area.properties === "string") {
    try {
      area.properties = JSON.parse(area.properties);
    } catch (error) {
      area.properties = {};
    }
  }

  return area;
};

const transformBackendArea = (payload: any): OrganizationArea => {
  if (!payload) return payload;

  const area: OrganizationArea = {
    id: payload.id,
    organization_id: payload.organization_id,
    parent_area_id: payload.parent_area_id ?? null,
    area_name: payload.area_name,
    slug: payload.slug,
    description: payload.description,
    properties: payload.properties,
    active: payload.active,
    deleted: payload.deleted,
    created_at: payload.created_at,
    updated_at: payload.updated_at,
  };

  return parseAreaProperties(area);
};

// --- Services ---

/**
 * Busca a organização.
 * Se userId for passado, envia como query param: /organizations?userId=...
 */
export const fetchOrganization = async (userId?: string): Promise<Organization | null> => {
  try {
    // Constrói a URL com query string se userId existir
    const url = userId
      ? `${API_ENDPOINTS.ORGANIZATIONS}?userId=${userId}`
      : API_ENDPOINTS.ORGANIZATIONS;

    const response = await apiClient.get(url);
    const data = await handleResponse<{
      status?: string;
      success?: boolean;
      organization_data?: any;
      error?: string;
    }>(response);

    if ((data.status === "OK" || data.success) && data.organization_data) {
      return transformBackendOrganization(data.organization_data);
    }

    return null;
  } catch (error: any) {
    if (error.message?.includes("não encontrada") || error.status === 404) {
      return null;
    }
    throw error;
  }
};

/**
 * Cria uma nova organização.
 * userId injetado no corpo da requisição.
 */
export const createOrganization = async (
  organizationData: CreateOrganizationData,
  userId?: string
): Promise<Organization> => {
  // Mescla os dados da organização com o userId
  const payload = { ...organizationData, userId };

  const response = await apiClient.post(API_ENDPOINTS.ORGANIZATIONS, payload);
  const data = await handleResponse<{ success?: boolean; data?: Organization; error?: string }>(
    response
  );

  if (!data.success || !data.data) {
    throw new Error(data.error || "Erro ao criar organização");
  }

  return transformBackendOrganization(data.data);
};

/**
 * Atualiza a organização.
 * userId injetado no corpo da requisição.
 */
export const updateOrganization = async (
  organizationData: UpdateOrganizationData,
  userId?: string
): Promise<Organization> => {
  const payload = { ...organizationData, userId };

  const response = await apiClient.put(API_ENDPOINTS.ORGANIZATIONS, payload);
  const data = await handleResponse<{ success?: boolean; data?: Organization; error?: string }>(
    response
  );

  if (!data.success || !data.data) {
    throw new Error(data.error || "Erro ao atualizar organização");
  }

  return transformBackendOrganization(data.data);
};

/**
 * Atualiza propriedades.
 * userId injetado no corpo da requisição.
 */
export const updateOrganizationProperties = async (
  properties: OrganizationProperties,
  userId?: string
): Promise<Organization> => {
  const payload = { properties, userId };

  const response = await apiClient.patch(API_ENDPOINTS.ORGANIZATIONS_PROPERTIES, payload);
  const data = await handleResponse<{ success?: boolean; data?: Organization; error?: string }>(
    response
  );

  if (!data.success || !data.data) {
    throw new Error(data.error || "Erro ao atualizar propriedades");
  }

  return transformBackendOrganization(data.data);
};

/**
 * Deleta organização.
 * Se userId for necessário, passa no body (alguns servidores não aceitam body em DELETE, verifique sua config)
 * ou via query param. Aqui assumi query param para DELETE.
 */
export const deleteOrganization = async (userId?: string): Promise<boolean> => {
  const url = userId
    ? `${API_ENDPOINTS.ORGANIZATIONS}?userId=${userId}`
    : API_ENDPOINTS.ORGANIZATIONS;

  const response = await apiClient.delete(url);
  const data = await handleResponse<{ success?: boolean }>(response);
  return data.success === true;
};

/**
 * Restaura organização.
 */
export const restoreOrganization = async (userId?: string): Promise<Organization> => {
  const payload = { userId };
  const response = await apiClient.post(API_ENDPOINTS.ORGANIZATIONS_RESTORE, payload);
  const data = await handleResponse<{ success?: boolean; data?: Organization; error?: string }>(
    response
  );

  if (!data.success || !data.data) {
    throw new Error(data.error || "Erro ao restaurar organização");
  }

  return transformBackendOrganization(data.data);
};

// --- Áreas ---

export const fetchOrganizationAreas = async (): Promise<OrganizationArea[]> => {
  try {
    const response = await apiClient.get(API_ENDPOINTS.ORGANIZATIONS_AREAS);
    const data = await handleResponse<{
      status?: string;
      success?: boolean;
      data?: any[];
      error?: string;
    }>(response);

    if ((data.status === "OK" || data.success) && Array.isArray(data.data)) {
      return data.data.map(transformBackendArea);
    }

    return [];
  } catch (error) {
    console.error("Erro ao buscar áreas da organização:", error);
    throw error instanceof Error
      ? error
      : new Error("Não foi possível carregar as áreas da organização");
  }
};

export const fetchAreaMembers = async (areaId: string): Promise<OrganizationAreaMember[]> => {
  try {
    const response = await apiClient.get(API_ENDPOINTS.ORGANIZATIONS_AREA_MEMBERS(areaId));
    const data = await handleResponse<{
      status?: string;
      success?: boolean;
      members?: any[];
      error?: string;
    }>(response);

    if ((data.status === "OK" || data.success) && Array.isArray(data.members)) {
      return data.members as OrganizationAreaMember[];
    }

    return [];
  } catch (error) {
    console.error(`Erro ao buscar membros da área ${areaId}:`, error);
    throw error instanceof Error
      ? error
      : new Error("Não foi possível carregar os membros da área");
  }
};

export const createOrganizationArea = async (
  payload: CreateOrganizationAreaInput
): Promise<OrganizationArea> => {
  const response = await apiClient.post(API_ENDPOINTS.ORGANIZATIONS_AREAS, payload);
  const data = await handleResponse<{
    status?: string;
    success?: boolean;
    data?: any;
    error?: string;
  }>(response);

  if ((data.status === "OK" || data.success) && data.data) {
    return transformBackendArea(data.data);
  }

  throw new Error(data.error || "Erro ao criar área");
};

export const getOrganizationArea = async (areaId: string): Promise<OrganizationArea> => {
  const response = await apiClient.get(API_ENDPOINTS.ORGANIZATIONS_AREA_BY_ID(areaId));
  const data = await handleResponse<{
    status?: string;
    success?: boolean;
    data?: any;
    error?: string;
  }>(response);

  if ((data.status === "OK" || data.success) && data.data) {
    return transformBackendArea(data.data);
  }

  throw new Error(data.error || "Erro ao buscar área");
};

export const updateOrganizationArea = async (
  areaId: string,
  payload: UpdateOrganizationAreaInput
): Promise<OrganizationArea> => {
  const response = await apiClient.put(API_ENDPOINTS.ORGANIZATIONS_AREA_BY_ID(areaId), payload);
  const data = await handleResponse<{
    status?: string;
    success?: boolean;
    data?: any;
    error?: string;
  }>(response);

  if ((data.status === "OK" || data.success) && data.data) {
    return transformBackendArea(data.data);
  }

  throw new Error(data.error || "Erro ao atualizar área");
};

export const deleteOrganizationArea = async (areaId: string): Promise<OrganizationArea> => {
  const response = await apiClient.delete(API_ENDPOINTS.ORGANIZATIONS_AREA_BY_ID(areaId));
  const data = await handleResponse<{
    status?: string;
    success?: boolean;
    data?: any;
    error?: string;
  }>(response);

  if ((data.status === "OK" || data.success) && data.data) {
    return transformBackendArea(data.data);
  }

  throw new Error(data.error || "Erro ao remover área");
};

export const addAreaMember = async (
  areaId: string,
  payload: AddAreaMemberInput
): Promise<OrganizationAreaMember> => {
  const response = await apiClient.post(API_ENDPOINTS.ORGANIZATIONS_AREA_MEMBERS(areaId), payload);
  const data = await handleResponse<{
    status?: string;
    success?: boolean;
    data?: OrganizationAreaMember;
    error?: string;
  }>(response);

  if ((data.status === "OK" || data.success) && data.data) {
    return data.data;
  }

  throw new Error(data.error || "Erro ao adicionar membro na área");
};

export const updateAreaMember = async (
  areaId: string,
  memberId: string,
  payload: UpdateAreaMemberInput
): Promise<OrganizationAreaMember> => {
  const response = await apiClient.patch(
    API_ENDPOINTS.ORGANIZATIONS_AREA_MEMBER(areaId, memberId),
    payload
  );
  const data = await handleResponse<{
    status?: string;
    success?: boolean;
    data?: OrganizationAreaMember;
    error?: string;
  }>(response);

  if ((data.status === "OK" || data.success) && data.data) {
    return data.data;
  }

  throw new Error(data.error || "Erro ao atualizar membro da área");
};

export const removeAreaMember = async (
  areaId: string,
  memberId: string
): Promise<OrganizationAreaMember> => {
  const response = await apiClient.delete(
    API_ENDPOINTS.ORGANIZATIONS_AREA_MEMBER(areaId, memberId)
  );
  const data = await handleResponse<{
    status?: string;
    success?: boolean;
    data?: OrganizationAreaMember;
    error?: string;
  }>(response);

  if ((data.status === "OK" || data.success) && data.data) {
    return data.data;
  }

  throw new Error(data.error || "Erro ao remover membro da área");
};

// --- Membros e Convites ---

export const fetchOrganizationMembers = async (userId?: string): Promise<OrganizationMember[]> => {
  try {
    const url = userId
      ? `${API_ENDPOINTS.ORGANIZATIONS_MEMBERS}?userId=${userId}`
      : API_ENDPOINTS.ORGANIZATIONS_MEMBERS;

    const response = await apiClient.get(url);
    const data = await handleResponse<{
      status?: string;
      list_org_members?: Array<{ member_data: OrganizationMember }>;
    }>(response);

    if (data.status === "OK" && data.list_org_members) {
      return data.list_org_members.map((item) => item.member_data);
    }
    return [];
  } catch (error) {
    console.error("Erro ao buscar membros:", error);
    return [];
  }
};

export const addMemberDirectly = async (
  memberId: string,
  role: string,
  userId?: string
): Promise<OrganizationMember> => {
  const payload = { memberId, role, userId };
  const response = await apiClient.post(API_ENDPOINTS.ORGANIZATIONS_MEMBERS, payload);
  const data = await handleResponse<{
    success?: boolean;
    data?: OrganizationMember;
    error?: string;
  }>(response);

  if (!data.success || !data.data) {
    throw new Error(data.error || "Erro ao adicionar membro");
  }
  return data.data;
};

export const inviteMember = async (
  inviteData: InviteMemberData,
  userId?: string
): Promise<{ message: string }> => {
  const payload = { ...inviteData, userId };
  const response = await apiClient.post(API_ENDPOINTS.ORGANIZATIONS_INVITES, payload);
  const data = await handleResponse<{ success?: boolean; message?: string; error?: string }>(
    response
  );

  if (!data.success) {
    throw new Error(data.error || "Erro ao enviar convite");
  }
  return { message: data.message || "Convite enviado com sucesso" };
};

export const fetchPendingInvites = async (userId?: string): Promise<OrganizationInvite[]> => {
  try {
    const url = userId
      ? `${API_ENDPOINTS.ORGANIZATIONS_INVITES}?userId=${userId}`
      : API_ENDPOINTS.ORGANIZATIONS_INVITES;

    const response = await apiClient.get(url);
    const data = await handleResponse<{ success?: boolean; data?: OrganizationInvite[] }>(response);

    if (data.success && data.data) {
      return data.data;
    }
    return [];
  } catch (error) {
    return [];
  }
};

export const cancelInvite = async (inviteId: string, userId?: string): Promise<void> => {
  // Passando userId via Query String para DELETE
  const url = userId
    ? `${API_ENDPOINTS.ORGANIZATIONS_INVITES}/${inviteId}?userId=${userId}`
    : `${API_ENDPOINTS.ORGANIZATIONS_INVITES}/${inviteId}`;

  const response = await apiClient.delete(url);
  const data = await handleResponse<{ success?: boolean; error?: string }>(response);

  if (!data.success) {
    throw new Error(data.error || "Erro ao cancelar convite");
  }
};

export const acceptInvite = async (acceptData: AcceptInviteData, userId?: string): Promise<any> => {
  const payload = { ...acceptData, userId };
  const response = await apiClient.post(`${API_ENDPOINTS.ORGANIZATIONS_INVITES}/accept`, payload);
  const data = await handleResponse<{ success?: boolean; data?: any; error?: string }>(response);

  if (!data.success) {
    throw new Error(data.error || "Erro ao aceitar convite");
  }
  return data.data;
};

export const removeMember = async (
  memberId: string,
  userId?: string
): Promise<OrganizationMember> => {
  const url = userId
    ? `${API_ENDPOINTS.ORGANIZATIONS_MEMBER(memberId)}?userId=${userId}`
    : API_ENDPOINTS.ORGANIZATIONS_MEMBER(memberId);

  const response = await apiClient.delete(url);
  const data = await handleResponse<{
    success?: boolean;
    data?: OrganizationMember;
    error?: string;
  }>(response);

  if (!data.success || !data.data) {
    throw new Error(data.error || "Erro ao remover membro");
  }
  return data.data;
};

export const updateMemberRole = async (
  memberId: string,
  role: OrganizationMember["membership"]["role"],
  userId?: string
): Promise<OrganizationMember> => {
  const url = userId
    ? `${API_ENDPOINTS.ORGANIZATIONS_MEMBER(memberId)}?userId=${userId}`
    : API_ENDPOINTS.ORGANIZATIONS_MEMBER(memberId);

  const response = await apiClient.patch(url, { role, userId });
  const data = await handleResponse<{
    success?: boolean;
    status?: string;
    data?: OrganizationMember;
    error?: string;
  }>(response);

  if ((data.status !== "OK" && !data.success) || !data.data) {
    throw new Error(data.error || "Erro ao atualizar função do membro");
  }

  return data.data;
};

// --- Uploads ---

/**
 * Upload do Logo (UserId via FormData)
 */
export const uploadOrganizationLogo = async (
  file: File,
  userId?: string
): Promise<Organization> => {
  const formData = new FormData();
  formData.append("image", file);
  if (userId) {
    formData.append("userId", userId);
  }

  const response = await apiClient.post(API_ENDPOINTS.ORGANIZATIONS_LOGO, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  const data = await handleResponse<{
    success?: boolean;
    data?: { organization: Organization };
    error?: string;
  }>(response);

  if (!data.success || !data.data?.organization) {
    throw new Error(data.error || "Erro ao fazer upload do logo");
  }

  return transformBackendOrganization(data.data.organization);
};

/**
 * Upload do Banner (UserId via FormData)
 */
export const uploadOrganizationBanner = async (
  file: File,
  userId?: string
): Promise<Organization> => {
  const formData = new FormData();
  formData.append("image", file);
  if (userId) {
    formData.append("userId", userId);
  }

  const response = await apiClient.post(API_ENDPOINTS.ORGANIZATIONS_BANNER, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  const data = await handleResponse<{
    success?: boolean;
    data?: { organization: Organization };
    error?: string;
  }>(response);

  if (!data.success || !data.data?.organization) {
    throw new Error(data.error || "Erro ao fazer upload do banner");
  }

  return transformBackendOrganization(data.data.organization);
};

// --- Domínios ---

export const fetchDomains = async (userId?: string): Promise<OrganizationDomain[]> => {
  try {
    const url = userId
      ? `${API_ENDPOINTS.ORGANIZATIONS_DOMAINS}?userId=${userId}`
      : API_ENDPOINTS.ORGANIZATIONS_DOMAINS;

    const response = await apiClient.get(url);
    const data = await handleResponse<{
      status: string;
      domains: OrganizationDomain[];
    }>(response);

    if (data.status === "OK" && data.domains) {
      return data.domains;
    }
    return [];
  } catch (error) {
    console.error("Erro ao buscar domínios:", error);
    return [];
  }
};

export const createDomain = async (
  domain_name: string,
  userId?: string
): Promise<OrganizationDomain> => {
  const url = userId
    ? `${API_ENDPOINTS.ORGANIZATIONS_DOMAINS}?userId=${userId}`
    : API_ENDPOINTS.ORGANIZATIONS_DOMAINS;

  const payload = { domain_name };
  const response = await apiClient.post(url, payload);
  const data = await handleResponse<{
    status: string;
    message: string;
    data: OrganizationDomain;
    error?: string;
  }>(response);

  if (data.status !== "OK" || !data.data) {
    throw new Error(
      data.data && typeof data.data === "string" ? data.data : data.error || "Erro ao criar domínio"
    );
  }
  return data.data;
};

export const verifyDomain = async (
  domainId: string,
  userId?: string
): Promise<{ domain: OrganizationDomain; dns_checks: any }> => {
  const endpoint = API_ENDPOINTS.ORGANIZATIONS_DOMAIN_VERIFY(domainId);
  const url = userId ? `${endpoint}?userId=${userId}` : endpoint;

  const response = await apiClient.post(url, {});
  const data = await handleResponse<{
    status: string;
    message: string;
    data: OrganizationDomain;
    dns_checks?: any;
    error?: string;
  }>(response);

  if (data.status !== "OK" || !data.data) {
    throw new Error(data.error || "Erro ao verificar domínio");
  }

  return { domain: data.data, dns_checks: data.dns_checks };
};

export const deleteDomain = async (domainId: string, userId?: string): Promise<void> => {
  const endpoint = API_ENDPOINTS.ORGANIZATIONS_DOMAIN_DELETE(domainId);
  const url = userId ? `${endpoint}?userId=${userId}` : endpoint;

  const response = await apiClient.delete(url);
  const data = await handleResponse<{
    status: string;
    message: string;
    error?: string;
  }>(response);

  if (data.status !== "OK") {
    throw new Error(data.error || "Erro ao deletar domínio");
  }
};
