// services/organization-service/OrganizationService.ts
import { apiClient, handleResponse } from "../api-methods";
import { API_ENDPOINTS } from "../api-routes";

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

export interface OrganizationMembers {
  owner: string;
  admins: string[];
  members: string[];
  invited: string[];
}

export interface OrganizationProjects {
  projects: string[];
  count: number;
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
  members?: OrganizationMembers;
  projects?: OrganizationProjects;
  org_domains?: string[] | null;
  deleted: boolean;
  created_at: string;
  updated_at: string;
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
  members?: OrganizationMembers;
  projects?: OrganizationProjects;
  org_domains?: string[] | null;
}

export interface AddMemberData {
  memberId: string;
  role?: "admin" | "member";
}

// Helper para tratar propriedades que podem vir como string JSON do banco
const parseOrganizationProperties = (org: Organization): Organization => {
  if (typeof org.properties === "string") {
    try {
      org.properties = JSON.parse(org.properties);
    } catch (e) {
      console.error("Erro ao parsear properties:", e);
      org.properties = undefined;
    }
  }

  if (typeof org.members === "string") {
    try {
      org.members = JSON.parse(org.members);
    } catch (e) {
      console.error("Erro ao parsear members:", e);
      org.members = undefined;
    }
  }

  if (typeof org.projects === "string") {
    try {
      org.projects = JSON.parse(org.projects);
    } catch (e) {
      console.error("Erro ao parsear projects:", e);
      org.projects = undefined;
    }
  }

  if (typeof org.org_domains === "string") {
    try {
      org.org_domains = JSON.parse(org.org_domains);
    } catch (e) {
      console.error("Erro ao parsear org_domains:", e);
      org.org_domains = null;
    }
  }

  return org;
};

/**
 * Busca a organização do usuário autenticado
 */
export const fetchOrganization = async (): Promise<Organization | null> => {
  try {
    const response = await apiClient.get(API_ENDPOINTS.ORGANIZATIONS);
    const data = await handleResponse(response);

    if (data.success && data.data) {
      return parseOrganizationProperties(data.data);
    }

    return null;
  } catch (error: any) {
    // Se não encontrou organização (404), retorna null ao invés de erro
    if (error.message?.includes("não encontrada") || error.status === 404) {
      return null;
    }
    throw error;
  }
};

/**
 * Cria uma nova organização
 */
export const createOrganization = async (
  organizationData: CreateOrganizationData
): Promise<Organization> => {
  const response = await apiClient.post(API_ENDPOINTS.ORGANIZATIONS, organizationData);
  const data = await handleResponse(response);

  if (!data.success || !data.data) {
    throw new Error(data.error || "Erro ao criar organização");
  }

  return parseOrganizationProperties(data.data);
};

/**
 * Atualiza a organização do usuário
 */
export const updateOrganization = async (
  organizationData: UpdateOrganizationData
): Promise<Organization> => {
  const response = await apiClient.put(API_ENDPOINTS.ORGANIZATIONS, organizationData);
  const data = await handleResponse(response);

  if (!data.success || !data.data) {
    throw new Error(data.error || "Erro ao atualizar organização");
  }

  return parseOrganizationProperties(data.data);
};

/**
 * Atualiza apenas as properties da organização
 */
export const updateOrganizationProperties = async (
  properties: OrganizationProperties
): Promise<Organization> => {
  const response = await apiClient.patch(API_ENDPOINTS.ORGANIZATIONS_PROPERTIES, {
    properties,
  });
  const data = await handleResponse(response);

  if (!data.success || !data.data) {
    throw new Error(data.error || "Erro ao atualizar propriedades");
  }

  return parseOrganizationProperties(data.data);
};

/**
 * Deleta (soft delete) a organização do usuário
 */
export const deleteOrganization = async (): Promise<boolean> => {
  const response = await apiClient.delete(API_ENDPOINTS.ORGANIZATIONS);
  const data = await handleResponse(response);

  return data.success === true;
};

/**
 * Restaura a organização deletada
 */
export const restoreOrganization = async (): Promise<Organization> => {
  const response = await apiClient.post(API_ENDPOINTS.ORGANIZATIONS_RESTORE);
  const data = await handleResponse(response);

  if (!data.success || !data.data) {
    throw new Error(data.error || "Erro ao restaurar organização");
  }

  return parseOrganizationProperties(data.data);
};

/**
 * Adiciona um membro à organização
 */
export const addMember = async (memberData: AddMemberData): Promise<Organization> => {
  const response = await apiClient.post(API_ENDPOINTS.ORGANIZATIONS_MEMBERS, memberData);
  const data = await handleResponse(response);

  if (!data.success || !data.data) {
    throw new Error(data.error || "Erro ao adicionar membro");
  }

  return parseOrganizationProperties(data.data);
};

/**
 * Remove um membro da organização
 */
export const removeMember = async (memberId: string): Promise<Organization> => {
  const response = await apiClient.delete(API_ENDPOINTS.ORGANIZATIONS_MEMBER(memberId));
  const data = await handleResponse(response);

  if (!data.success || !data.data) {
    throw new Error(data.error || "Erro ao remover membro");
  }

  return parseOrganizationProperties(data.data);
};
