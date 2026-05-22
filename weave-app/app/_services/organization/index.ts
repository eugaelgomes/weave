import { apiClient, handleResponse } from "../api-methods";
import { API_ENDPOINTS } from "../api-methods";
import { OrgJsonSchema } from "./organization.schema";
import {
  type OrgWorkspaceRole,
  type ProjectMemberRoleForInvite,
  isOrgWorkspaceRole,
} from "./org-role-constants";
import getStorageUrl from "@/app/_utils/get-storage-url";

export {
  ORG_WORKSPACE_ROLES,
  PROJECT_MEMBER_ROLES,
  normalizeOrgRoleForUi,
  isOrgWorkspaceRole,
  isProjectMemberRoleForInvite,
  type OrgWorkspaceRole,
  type ProjectMemberRoleForInvite,
  type OrgRoleUiKey,
} from "./org-role-constants";

function orgApiErrorMessage(data: Record<string, unknown>, fallback: string): string {
  const err = data.error;
  return typeof err === "string" ? err : fallback;
}

/**
 * API envelopes are validated as generic JSON objects; cast to domain types after success checks.
 */
function asUnknown<T>(value: unknown): T {
  return value as T;
}

function recordNumbers(value: unknown): Record<string, number> {
  return value != null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, number>)
    : {};
}

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
    role: OrgWorkspaceRole;
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
    areas: Array<{
      area_id: string;
      area_name: string;
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
  role: OrgWorkspaceRole;
  expires_at: string;
  created_at?: string;
  invited_by?: string;
  area_id?: string | null;
  project_member_role?: ProjectMemberRoleForInvite | null;
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
  /** BCP 47 locale (e.g. en-US); returned during org creation and from the API row. */
  default_locale?: string | null;
  country?: string | null;
  properties?: OrganizationProperties;
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
}

export type OrganizationBusinessRole =
  | "TECHNOLOGY"
  | "MARKETING"
  | "BUSINESS"
  | "FINANCE"
  | "HEALTHCARE"
  | "EDUCATION"
  | "RETAIL"
  | "INDUSTRY"
  | "OTHER";

export interface OrganizationStepOneData {
  org_name: string;
  unique_name: string;
  organization_role: OrganizationBusinessRole;
  description?: string;
  logo_url?: string | null;
  default_locale?: string | null;
  country?: string | null;
  language?: string | null;
}

export interface OrganizationStepOneResponse {
  step: string;
  required_fields: string[];
  optional_fields?: string[];
  role_options?: OrganizationBusinessRole[];
  available_roles?: OrganizationBusinessRole[];
  organization: Organization | null;
}

export interface UpdateOrganizationData {
  org_name?: string;
  unique_name?: string;
  logo_url?: string | null;
  banner_url?: string | null;
  description?: string;
  properties?: OrganizationProperties;
}

export interface InviteMemberData {
  email: string;
  role: OrgWorkspaceRole;
  name: string;
  username?: string;
  /** Organization area the invitee is linked to when accepting (required) */
  area_id: string;
  /** Stored on invite; maps to area membership on accept (API: project_member_role) */
  project_member_role?: ProjectMemberRoleForInvite | null;
}

export interface AcceptInviteData {
  token: string;
  name?: string;
  username?: string;
  password?: string;
}

export interface OrganizationInvitePreview {
  org_name: string;
  org_logo_url?: string | null;
  email: string;
  role: string;
  expires_at: string;
  has_account: boolean;
  invited_name?: string | null;
  area_id?: string | null;
  area_name?: string | null;
  project_member_role?: ProjectMemberRoleForInvite | string | null;
}

/** Payload in `data` from POST invites/accept (matches API members.controller acceptInvite). */
export interface AcceptInviteResponse {
  organization: {
    id: string;
    name: string;
  };
  role: string;
  area_id: string | null;
}

// --- Helpers de Transformação ---

const transformBackendOrganization = (data: any): Organization => {
  if (!data) return data;

  if (data.identity) {
    const org = {
      ...data.identity,
      properties: data.properties,
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
    const data = OrgJsonSchema.parse(await handleResponse<unknown>(response));

    if ((data.status === "OK" || data.success) && data.organization_data) {
      return transformBackendOrganization(asUnknown(data.organization_data));
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
  const data = OrgJsonSchema.parse(await handleResponse<unknown>(response));

  const isSuccess = data.status === "OK" || data.success === true;
  const organizationPayload =
    data.data && typeof data.data === "object" && "organization" in data.data
      ? data.data.organization
      : data.data;

  if (!isSuccess || !organizationPayload) {
    throw new Error(orgApiErrorMessage(data, "Erro ao criar organização"));
  }

  return transformBackendOrganization(asUnknown(organizationPayload));
};

export const fetchOrganizationCreationStepOne = async (): Promise<OrganizationStepOneResponse> => {
  const response = await apiClient.get(API_ENDPOINTS.ORGANIZATIONS_CREATION_STEP_ONE);
  const data = OrgJsonSchema.parse(await handleResponse<unknown>(response));

  if ((data.status === "OK" || data.success) && data.data) {
    const body = asUnknown<
      Omit<OrganizationStepOneResponse, "organization"> & { organization?: unknown }
    >(data.data);
    return {
      ...body,
      organization: body.organization ? transformBackendOrganization(body.organization) : null,
    };
  }

  throw new Error(orgApiErrorMessage(data, "Erro ao carregar etapa 1 de criação da organização"));
};

export const saveOrganizationCreationStepOne = async (
  payload: OrganizationStepOneData
): Promise<OrganizationStepOneResponse> => {
  const response = await apiClient.post(API_ENDPOINTS.ORGANIZATIONS_CREATION_STEP_ONE, payload);
  const data = OrgJsonSchema.parse(await handleResponse<unknown>(response));

  if ((data.status === "OK" || data.success) && data.data) {
    const body = asUnknown<
      Omit<OrganizationStepOneResponse, "organization"> & { organization?: unknown }
    >(data.data);
    return {
      ...body,
      organization: body.organization ? transformBackendOrganization(body.organization) : null,
    };
  }

  throw new Error(orgApiErrorMessage(data, "Erro ao salvar etapa 1 de criação da organização"));
};

export const completeOrganizationCreationStepOne =
  async (): Promise<OrganizationStepOneResponse> => {
    const response = await apiClient.post(
      API_ENDPOINTS.ORGANIZATIONS_CREATION_STEP_ONE_COMPLETE,
      {}
    );
    const data = OrgJsonSchema.parse(await handleResponse<unknown>(response));

    if ((data.status === "OK" || data.success) && data.data) {
      const body = asUnknown<
        Omit<OrganizationStepOneResponse, "organization"> & { organization?: unknown }
      >(data.data);
      return {
        ...body,
        organization: body.organization ? transformBackendOrganization(body.organization) : null,
      };
    }

    throw new Error(orgApiErrorMessage(data, "Erro ao concluir etapa 1 de criação da organização"));
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
  const data = OrgJsonSchema.parse(await handleResponse<unknown>(response));

  if (!data.success || !data.data) {
    throw new Error(orgApiErrorMessage(data, "Erro ao atualizar organização"));
  }

  return transformBackendOrganization(asUnknown(data.data));
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
  const data = OrgJsonSchema.parse(await handleResponse<unknown>(response));

  if (!data.success || !data.data) {
    throw new Error(orgApiErrorMessage(data, "Erro ao atualizar propriedades"));
  }

  return transformBackendOrganization(asUnknown(data.data));
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
  const data = OrgJsonSchema.parse(await handleResponse<unknown>(response));
  return data.success === true;
};

/**
 * Restaura organização.
 */
export const restoreOrganization = async (userId?: string): Promise<Organization> => {
  const payload = { userId };
  const response = await apiClient.post(API_ENDPOINTS.ORGANIZATIONS_RESTORE, payload);
  const data = OrgJsonSchema.parse(await handleResponse<unknown>(response));

  if (!data.success || !data.data) {
    throw new Error(orgApiErrorMessage(data, "Erro ao restaurar organização"));
  }

  return transformBackendOrganization(asUnknown(data.data));
};

// --- Áreas ---

export const fetchOrganizationAreas = async (): Promise<OrganizationArea[]> => {
  try {
    const response = await apiClient.get(API_ENDPOINTS.ORGANIZATIONS_AREAS);
    const data = OrgJsonSchema.parse(await handleResponse<unknown>(response));

    if ((data.status === "OK" || data.success) && Array.isArray(data.data)) {
      return data.data.map((raw: unknown) => transformBackendArea(raw));
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
    const data = OrgJsonSchema.parse(await handleResponse<unknown>(response));

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
  const data = OrgJsonSchema.parse(await handleResponse<unknown>(response));

  if ((data.status === "OK" || data.success) && data.data) {
    return transformBackendArea(asUnknown(data.data));
  }

  throw new Error(orgApiErrorMessage(data, "Erro ao criar área"));
};

export const getOrganizationArea = async (areaId: string): Promise<OrganizationArea> => {
  const response = await apiClient.get(API_ENDPOINTS.ORGANIZATIONS_AREA_BY_ID(areaId));
  const data = OrgJsonSchema.parse(await handleResponse<unknown>(response));

  if ((data.status === "OK" || data.success) && data.data) {
    return transformBackendArea(asUnknown(data.data));
  }

  throw new Error(orgApiErrorMessage(data, "Erro ao buscar área"));
};

export const updateOrganizationArea = async (
  areaId: string,
  payload: UpdateOrganizationAreaInput
): Promise<OrganizationArea> => {
  const response = await apiClient.put(API_ENDPOINTS.ORGANIZATIONS_AREA_BY_ID(areaId), payload);
  const data = OrgJsonSchema.parse(await handleResponse<unknown>(response));

  if ((data.status === "OK" || data.success) && data.data) {
    return transformBackendArea(asUnknown(data.data));
  }

  throw new Error(orgApiErrorMessage(data, "Erro ao atualizar área"));
};

export const deleteOrganizationArea = async (areaId: string): Promise<OrganizationArea> => {
  const response = await apiClient.delete(API_ENDPOINTS.ORGANIZATIONS_AREA_BY_ID(areaId));
  const data = OrgJsonSchema.parse(await handleResponse<unknown>(response));

  if ((data.status === "OK" || data.success) && data.data) {
    return transformBackendArea(asUnknown(data.data));
  }

  throw new Error(orgApiErrorMessage(data, "Erro ao remover área"));
};

export const addAreaMember = async (
  areaId: string,
  payload: AddAreaMemberInput
): Promise<OrganizationAreaMember> => {
  const response = await apiClient.post(API_ENDPOINTS.ORGANIZATIONS_AREA_MEMBERS(areaId), payload);
  const data = OrgJsonSchema.parse(await handleResponse<unknown>(response));

  if ((data.status === "OK" || data.success) && data.data) {
    return asUnknown<OrganizationAreaMember>(data.data);
  }

  throw new Error(orgApiErrorMessage(data, "Erro ao adicionar membro na área"));
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
  const data = OrgJsonSchema.parse(await handleResponse<unknown>(response));

  if ((data.status === "OK" || data.success) && data.data) {
    return asUnknown<OrganizationAreaMember>(data.data);
  }

  throw new Error(orgApiErrorMessage(data, "Erro ao atualizar membro da área"));
};

export const removeAreaMember = async (
  areaId: string,
  memberId: string
): Promise<OrganizationAreaMember> => {
  const response = await apiClient.delete(
    API_ENDPOINTS.ORGANIZATIONS_AREA_MEMBER(areaId, memberId)
  );
  const data = OrgJsonSchema.parse(await handleResponse<unknown>(response));

  if ((data.status === "OK" || data.success) && data.data) {
    return asUnknown<OrganizationAreaMember>(data.data);
  }

  throw new Error(orgApiErrorMessage(data, "Erro ao remover membro da área"));
};

// --- Membros e Convites ---

/** Respostas da API usam `status: "OK"` ou `success: true` */
function isApiSuccess(data: Record<string, unknown>): boolean {
  return data.status === "OK" || data.success === true;
}

export interface OrganizationMembersData {
  count: number;
  count_by_role: Record<string, number>;
  count_by_status: Record<string, number>;
  count_by_suspended: Record<string, number>;
  list_org_members: OrganizationMember[];
}

export const fetchOrganizationMembers = async (
  userId?: string
): Promise<OrganizationMembersData | null> => {
  try {
    const url = userId
      ? `${API_ENDPOINTS.ORGANIZATIONS_MEMBERS}?userId=${userId}`
      : API_ENDPOINTS.ORGANIZATIONS_MEMBERS;

    const response = await apiClient.get(url);
    const data = OrgJsonSchema.parse(await handleResponse<unknown>(response));

    if (data.status === "OK" && data.list_org_members) {
      const countRaw = data.count;
      const count =
        typeof countRaw === "number"
          ? countRaw
          : typeof countRaw === "string"
            ? Number(countRaw) || 0
            : 0;
      return {
        count,
        count_by_role: recordNumbers(data.count_by_role),
        count_by_status: recordNumbers(data.count_by_status),
        count_by_suspended: recordNumbers(data.count_by_suspended),
        list_org_members: (data.list_org_members as Array<{ member_data: OrganizationMember }>).map(
          (item) => item.member_data
        ),
      };
    }
    return null;
  } catch (error) {
    console.error("Erro ao buscar membros:", error);
    return null;
  }
};

export const addMemberDirectly = async (
  memberId: string,
  role: string,
  userId?: string
): Promise<OrganizationMember> => {
  const normalized =
    typeof role === "string" ? (role.trim().toUpperCase() as OrgWorkspaceRole) : role;
  if (!isOrgWorkspaceRole(normalized)) {
    throw new Error("Invalid organization role");
  }
  const payload = { memberId, role: normalized, userId };
  const response = await apiClient.post(API_ENDPOINTS.ORGANIZATIONS_MEMBERS, payload);
  const data = OrgJsonSchema.parse(await handleResponse<unknown>(response));

  if (!data.success || !data.data) {
    throw new Error(orgApiErrorMessage(data, "Erro ao adicionar membro"));
  }
  return asUnknown<OrganizationMember>(data.data);
};

export const inviteMember = async (
  inviteData: InviteMemberData,
  userId?: string
): Promise<{ message: string }> => {
  const payload: Record<string, unknown> = {
    email: inviteData.email,
    name: inviteData.name,
    role: inviteData.role,
    userId,
  };
  if (inviteData.username !== undefined) payload.username = inviteData.username;
  payload.area_id = inviteData.area_id;
  if (inviteData.project_member_role) {
    payload.project_member_role = inviteData.project_member_role;
  }
  const response = await apiClient.post(API_ENDPOINTS.ORGANIZATIONS_INVITES, payload);
  const data = OrgJsonSchema.parse(await handleResponse<unknown>(response));

  if (!isApiSuccess(data)) {
    throw new Error(orgApiErrorMessage(data, "Erro ao enviar convite"));
  }
  const msg = data.message;
  return {
    message: typeof msg === "string" ? msg : "Convite enviado com sucesso",
  };
};

export const fetchPendingInvites = async (userId?: string): Promise<OrganizationInvite[]> => {
  try {
    const url = userId
      ? `${API_ENDPOINTS.ORGANIZATIONS_INVITES}?userId=${userId}`
      : API_ENDPOINTS.ORGANIZATIONS_INVITES;

    const response = await apiClient.get(url);
    const data = OrgJsonSchema.parse(await handleResponse<unknown>(response));

    if (isApiSuccess(data) && Array.isArray(data.data)) {
      return asUnknown<OrganizationInvite[]>(data.data);
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
  const data = OrgJsonSchema.parse(await handleResponse<unknown>(response));

  if (!isApiSuccess(data)) {
    throw new Error(orgApiErrorMessage(data, "Erro ao cancelar convite"));
  }
};

export const previewOrganizationInvite = async (
  token: string
): Promise<OrganizationInvitePreview> => {
  const response = await apiClient.get(
    `${API_ENDPOINTS.ORGANIZATIONS_INVITES}/preview?token=${encodeURIComponent(token)}`
  );
  const data = OrgJsonSchema.parse(await handleResponse<unknown>(response));
  if (!data.data) {
    throw new Error("Resposta inválida do servidor");
  }
  
  const previewData = data.data as any;
  if (previewData.org_logo_url) {
    previewData.org_logo_url = getStorageUrl(previewData.org_logo_url);
  }
  
  return asUnknown<OrganizationInvitePreview>(previewData);
};

export const acceptInvite = async (
  acceptData: AcceptInviteData,
  userId?: string
): Promise<AcceptInviteResponse> => {
  const payload = { ...acceptData, userId };
  const response = await apiClient.post(`${API_ENDPOINTS.ORGANIZATIONS_INVITES}/accept`, payload);
  const data = OrgJsonSchema.parse(await handleResponse<unknown>(response));

  if (data.status !== "OK" && data.success !== true) {
    throw new Error(orgApiErrorMessage(data, "Erro ao aceitar convite"));
  }
  if (data.data == null || typeof data.data !== "object") {
    throw new Error(orgApiErrorMessage(data, "Erro ao aceitar convite"));
  }
  return asUnknown<AcceptInviteResponse>(data.data);
};

export const removeMember = async (
  memberId: string,
  userId?: string
): Promise<OrganizationMember> => {
  const url = userId
    ? `${API_ENDPOINTS.ORGANIZATIONS_MEMBER(memberId)}?userId=${userId}`
    : API_ENDPOINTS.ORGANIZATIONS_MEMBER(memberId);

  const response = await apiClient.delete(url);
  const data = OrgJsonSchema.parse(await handleResponse<unknown>(response));

  if (!data.success || !data.data) {
    throw new Error(orgApiErrorMessage(data, "Erro ao remover membro"));
  }
  return asUnknown<OrganizationMember>(data.data);
};

export const updateMemberRole = async (
  memberId: string,
  role: OrgWorkspaceRole,
  userId?: string
): Promise<OrganizationMember> => {
  const url = userId
    ? `${API_ENDPOINTS.ORGANIZATIONS_MEMBER(memberId)}?userId=${userId}`
    : API_ENDPOINTS.ORGANIZATIONS_MEMBER(memberId);

  const normalized =
    typeof role === "string" ? (role.trim().toUpperCase() as OrgWorkspaceRole) : role;
  if (!isOrgWorkspaceRole(normalized)) {
    throw new Error("Invalid organization role");
  }

  const response = await apiClient.patch(url, { role: normalized, userId });
  const data = OrgJsonSchema.parse(await handleResponse<unknown>(response));

  if ((data.status !== "OK" && !data.success) || !data.data) {
    throw new Error(orgApiErrorMessage(data, "Erro ao atualizar função do membro"));
  }

  return asUnknown<OrganizationMember>(data.data);
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

  const response = await apiClient.put(API_ENDPOINTS.ORGANIZATIONS_LOGO, formData, {
    // handled implicitly
  });

  const data = OrgJsonSchema.parse(await handleResponse<unknown>(response));
  const logoBody = asUnknown<{ organization?: unknown } | null | undefined>(data.data);

  if (!data.success || !logoBody?.organization) {
    throw new Error(orgApiErrorMessage(data, "Erro ao fazer upload do logo"));
  }

  return transformBackendOrganization(logoBody.organization);
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

  const response = await apiClient.put(API_ENDPOINTS.ORGANIZATIONS_BANNER, formData, {
    // "Content-Type": "multipart/form-data" handled automatically when passing FormData
  });

  const data = OrgJsonSchema.parse(await handleResponse<unknown>(response));
  const bannerBody = asUnknown<{ organization?: unknown } | null | undefined>(data.data);

  if (!data.success || !bannerBody?.organization) {
    throw new Error(orgApiErrorMessage(data, "Erro ao fazer upload do banner"));
  }

  return transformBackendOrganization(bannerBody.organization);
};

// --- Domínios ---

export const fetchDomains = async (userId?: string): Promise<OrganizationDomain[]> => {
  try {
    const url = userId
      ? `${API_ENDPOINTS.ORGANIZATIONS_DOMAINS}?userId=${userId}`
      : API_ENDPOINTS.ORGANIZATIONS_DOMAINS;

    const response = await apiClient.get(url);
    const data = OrgJsonSchema.parse(await handleResponse<unknown>(response));

    if (data.status === "OK" && data.domains) {
      return asUnknown<OrganizationDomain[]>(data.domains);
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
  const data = OrgJsonSchema.parse(await handleResponse<unknown>(response));

  if (data.status !== "OK" || !data.data) {
    throw new Error(
      data.data && typeof data.data === "string"
        ? data.data
        : orgApiErrorMessage(data, "Erro ao criar domínio")
    );
  }
  return asUnknown<OrganizationDomain>(data.data);
};

export const verifyDomain = async (
  domainId: string,
  userId?: string
): Promise<{ domain: OrganizationDomain; dns_checks: any }> => {
  const endpoint = API_ENDPOINTS.ORGANIZATIONS_DOMAIN_VERIFY(domainId);
  const url = userId ? `${endpoint}?userId=${userId}` : endpoint;

  const response = await apiClient.post(url, {});
  const data = OrgJsonSchema.parse(await handleResponse<unknown>(response));

  if (data.status !== "OK" || !data.data) {
    throw new Error(orgApiErrorMessage(data, "Erro ao verificar domínio"));
  }

  return {
    domain: asUnknown<OrganizationDomain>(data.data),
    dns_checks: data.dns_checks,
  };
};

export const deleteDomain = async (domainId: string, userId?: string): Promise<void> => {
  const endpoint = API_ENDPOINTS.ORGANIZATIONS_DOMAIN_DELETE(domainId);
  const url = userId ? `${endpoint}?userId=${userId}` : endpoint;

  const response = await apiClient.delete(url);
  const data = OrgJsonSchema.parse(await handleResponse<unknown>(response));

  if (data.status !== "OK") {
    throw new Error(orgApiErrorMessage(data, "Erro ao deletar domínio"));
  }
};
