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

export interface OrganizationInvite {
  invite_id: string;
  email: string;
  role: "admin" | "member" | "guest";
  expires_at: string;
  created_at?: string;
  invited_by?: string;
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
