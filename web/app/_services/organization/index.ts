import { apiClient, handleResponse } from "../api-methods";
import { API_ENDPOINTS } from "../api-methods";
import { WorkspaceJsonSchema } from "./workspace.schema";
import {
  type WorkspaceRole,
  type ProjectMemberRoleForInvite,
  isWorkspaceRole,
} from "./org-role-constants";
import getStorageUrl from "@/app/_utils/get-storage-url";

export {
  WORKSPACE_ROLES,
  PROJECT_MEMBER_ROLES,
  normalizeWorkspaceRoleForUi,
  isWorkspaceRole,
  isProjectMemberRoleForInvite,
  type WorkspaceRole,
  type ProjectMemberRoleForInvite,
  type WorkspaceRoleUiKey,
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

export interface WorkspaceProperties {
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

export interface WorkspaceMember {
  id: string;
  name?: string;
  username?: string;
  email?: string;
  avatar_url?: string | null;
  membership: {
    role: WorkspaceRole;
    status: "active" | "pending";
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

export interface WorkspaceAreaMetrics {
  headcount?: number;
  projects?: number;
  impact?: number;
  coverage?: number;
}

export interface WorkspaceAreaProperties {
  color?: string;
  status?: "ativo" | "planejamento" | "pausado" | "arquivado" | string;
  focus?: string;
  metrics?: WorkspaceAreaMetrics;
  tags?: string[];
  [key: string]: unknown;
}

export interface WorkspaceArea {
  id: string;
  workspace_id: string;
  parent_area_id: string | null;
  area_name: string;
  slug?: string;
  description?: string | null;
  properties?: WorkspaceAreaProperties;
  active?: boolean;
  deleted?: boolean;
  created_at?: string;
  updated_at?: string;
}

export type WorkspaceAreaMemberRole = "manager" | "editor" | "viewer";

export interface WorkspaceAreaMember {
  workspace_id: string;
  area_id: string;
  user_id: string;
  role: WorkspaceAreaMemberRole | string;
  added_by?: string;
  created_at?: string;
  updated_at?: string;
  removed_at?: string | null;
  name?: string;
  username?: string;
  email?: string;
  avatar_url?: string | null;
}

export interface CreateWorkspaceAreaInput {
  area_name: string;
  parent_area_id?: string | null;
  slug?: string | null;
  description?: string | null;
  properties?: WorkspaceAreaProperties;
}

export interface UpdateWorkspaceAreaInput {
  area_name?: string;
  parent_area_id?: string | null;
  slug?: string | null;
  description?: string | null;
  properties?: WorkspaceAreaProperties;
  active?: boolean;
}

export interface AddAreaMemberInput {
  user_id: string;
  role?: WorkspaceAreaMemberRole;
}

export interface UpdateAreaMemberInput {
  role: WorkspaceAreaMemberRole;
}

export interface WorkspaceInvite {
  invite_id: string;
  email: string;
  role: WorkspaceRole;
  expires_at: string;
  created_at?: string;
  invited_by?: string;
  area_id?: string | null;
  project_member_role?: ProjectMemberRoleForInvite | null;
}

export interface WorkspaceDomain {
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

export interface Workspace {
  id: string;
  public_id: string;
  user_id: string;
  workspace_name: string;
  unique_name: string;
  logo_url?: string | null;
  banner_url?: string | null;
  description?: string;
  /** BCP 47 locale (e.g. en-US); returned during org creation and from the API row. */
  default_locale?: string | null;
  country?: string | null;
  properties?: WorkspaceProperties;
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

export interface CreateWorkspaceData {
  workspace_name: string;
  unique_name?: string;
  logo_url?: string;
  banner_url?: string;
  description?: string;
  properties?: WorkspaceProperties;
}

export type WorkspaceBusinessRole =
  | "TECHNOLOGY"
  | "MARKETING"
  | "BUSINESS"
  | "FINANCE"
  | "HEALTHCARE"
  | "EDUCATION"
  | "RETAIL"
  | "INDUSTRY"
  | "OTHER";

export interface WorkspaceStepOneData {
  workspace_name: string;
  unique_name: string;
  workspace_role: WorkspaceBusinessRole;
  description?: string;
  logo_url?: string | null;
  default_locale?: string | null;
  country?: string | null;
  language?: string | null;
}

export interface WorkspaceStepOneResponse {
  step: string;
  required_fields: string[];
  optional_fields?: string[];
  role_options?: WorkspaceBusinessRole[];
  available_roles?: WorkspaceBusinessRole[];
  workspace: Workspace | null;
}

export interface UpdateWorkspaceData {
  workspace_name?: string;
  unique_name?: string;
  logo_url?: string | null;
  banner_url?: string | null;
  description?: string;
  properties?: WorkspaceProperties;
}

export interface InviteMemberData {
  email: string;
  role: WorkspaceRole;
  name: string;
  username?: string;
  /** Workspace area the invitee is linked to when accepting (required) */
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

export interface WorkspaceInvitePreview {
  workspace_name: string;
  workspace_logo_url?: string | null;
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
  workspace: {
    id: string;
    name: string;
  };
  role: string;
  area_id: string | null;
}

// --- Helpers de Transformação ---

const transformBackendWorkspace = (data: any): Workspace => {
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
    return parseWorkspaceProperties(org);
  }

  return parseWorkspaceProperties(data);
};

const parseWorkspaceProperties = (org: Workspace): Workspace => {
  if (typeof org.properties === "string") {
    try {
      org.properties = JSON.parse(org.properties);
    } catch (e) {
      org.properties = {};
    }
  }

  return org;
};

const parseAreaProperties = (area: WorkspaceArea): WorkspaceArea => {
  if (typeof area.properties === "string") {
    try {
      area.properties = JSON.parse(area.properties);
    } catch (error) {
      area.properties = {};
    }
  }

  return area;
};

const transformBackendArea = (payload: any): WorkspaceArea => {
  if (!payload) return payload;

  const area: WorkspaceArea = {
    id: payload.id,
    workspace_id: payload.workspace_id,
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
 * Se userId for passado, envia como query param: /workspaces?userId=...
 */
export const fetchWorkspace = async (publicId?: string): Promise<Workspace | null> => {
  try {
    const url = publicId
      ? API_ENDPOINTS.WORKSPACE_BY_PUBLIC_ID(publicId)
      : API_ENDPOINTS.ORGANIZATIONS;

    const response = await apiClient.get(url);
    const data = WorkspaceJsonSchema.parse(await handleResponse<unknown>(response));

    const orgPayload = data.workspace_data || data.data;
    if ((data.status === "OK" || data.success) && orgPayload) {
      return transformBackendWorkspace(asUnknown(orgPayload));
    }

    return null;
  } catch (error: any) {
    if (
      error.message?.includes("não encontrada") ||
      error.message?.includes("not found") ||
      error.status === 404
    ) {
      return null;
    }
    throw error;
  }
};

/**
 * Cria uma nova organização.
 * userId injetado no corpo da requisição.
 */
export const createWorkspace = async (
  workspaceData: CreateWorkspaceData,
  userId?: string
): Promise<Workspace> => {
  // Mescla os dados da organização com o userId
  const payload = { ...workspaceData, userId };

  const response = await apiClient.post(API_ENDPOINTS.ORGANIZATIONS, payload);
  const data = WorkspaceJsonSchema.parse(await handleResponse<unknown>(response));

  const isSuccess = data.status === "OK" || data.success === true;
  const workspacePayload =
    data.data && typeof data.data === "object" && "workspace" in data.data
      ? data.data.workspace
      : data.data;

  if (!isSuccess || !workspacePayload) {
    throw new Error(orgApiErrorMessage(data, "Erro ao criar organização"));
  }

  return transformBackendWorkspace(asUnknown(workspacePayload));
};

export const fetchWorkspaceCreationStepOne = async (): Promise<WorkspaceStepOneResponse> => {
  const response = await apiClient.get(API_ENDPOINTS.ORGANIZATIONS_CREATION_STEP_ONE);
  const data = WorkspaceJsonSchema.parse(await handleResponse<unknown>(response));

  if ((data.status === "OK" || data.success) && data.data) {
    const body = asUnknown<
      Omit<WorkspaceStepOneResponse, "workspace"> & { workspace?: unknown }
    >(data.data);
    return {
      ...body,
      workspace: body.workspace ? transformBackendWorkspace(body.workspace) : null,
    };
  }

  throw new Error(orgApiErrorMessage(data, "Erro ao carregar etapa 1 de criação da organização"));
};

export const saveWorkspaceCreationStepOne = async (
  payload: WorkspaceStepOneData
): Promise<WorkspaceStepOneResponse> => {
  const response = await apiClient.post(API_ENDPOINTS.ORGANIZATIONS_CREATION_STEP_ONE, payload);
  const data = WorkspaceJsonSchema.parse(await handleResponse<unknown>(response));

  if ((data.status === "OK" || data.success) && data.data) {
    const body = asUnknown<
      Omit<WorkspaceStepOneResponse, "workspace"> & { workspace?: unknown }
    >(data.data);
    return {
      ...body,
      workspace: body.workspace ? transformBackendWorkspace(body.workspace) : null,
    };
  }

  throw new Error(orgApiErrorMessage(data, "Erro ao salvar etapa 1 de criação da organização"));
};

export const completeWorkspaceCreationStepOne =
  async (): Promise<WorkspaceStepOneResponse> => {
    const response = await apiClient.post(
      API_ENDPOINTS.ORGANIZATIONS_CREATION_STEP_ONE_COMPLETE,
      {}
    );
    const data = WorkspaceJsonSchema.parse(await handleResponse<unknown>(response));

    if ((data.status === "OK" || data.success) && data.data) {
      const body = asUnknown<
        Omit<WorkspaceStepOneResponse, "workspace"> & { workspace?: unknown }
      >(data.data);
      return {
        ...body,
        workspace: body.workspace ? transformBackendWorkspace(body.workspace) : null,
      };
    }

    throw new Error(orgApiErrorMessage(data, "Erro ao concluir etapa 1 de criação da organização"));
  };

/**
 * Atualiza a organização.
 * userId injetado no corpo da requisição.
 */
export const updateWorkspace = async (
  workspaceData: UpdateWorkspaceData,
  userId?: string
): Promise<Workspace> => {
  const payload = { ...workspaceData, userId };

  const response = await apiClient.put(API_ENDPOINTS.ORGANIZATIONS, payload);
  const data = WorkspaceJsonSchema.parse(await handleResponse<unknown>(response));

  if (!data.success || !data.data) {
    throw new Error(orgApiErrorMessage(data, "Erro ao atualizar organização"));
  }

  return transformBackendWorkspace(asUnknown(data.data));
};

/**
 * Atualiza propriedades.
 * userId injetado no corpo da requisição.
 */
export const updateWorkspaceProperties = async (
  properties: WorkspaceProperties,
  userId?: string
): Promise<Workspace> => {
  const payload = { properties, userId };

  const response = await apiClient.patch(API_ENDPOINTS.ORGANIZATIONS_PROPERTIES, payload);
  const data = WorkspaceJsonSchema.parse(await handleResponse<unknown>(response));

  if (!data.success || !data.data) {
    throw new Error(orgApiErrorMessage(data, "Erro ao atualizar propriedades"));
  }

  return transformBackendWorkspace(asUnknown(data.data));
};

/**
 * Deleta organização.
 * Se userId for necessário, passa no body (alguns servidores não aceitam body em DELETE, verifique sua config)
 * ou via query param. Aqui assumi query param para DELETE.
 */
export const deleteWorkspace = async (userId?: string): Promise<boolean> => {
  const url = userId
    ? `${API_ENDPOINTS.ORGANIZATIONS}?userId=${userId}`
    : API_ENDPOINTS.ORGANIZATIONS;

  const response = await apiClient.delete(url);
  const data = WorkspaceJsonSchema.parse(await handleResponse<unknown>(response));
  return data.success === true;
};

/**
 * Restaura organização.
 */
export const restoreWorkspace = async (userId?: string): Promise<Workspace> => {
  const payload = { userId };
  const response = await apiClient.post(API_ENDPOINTS.ORGANIZATIONS_RESTORE, payload);
  const data = WorkspaceJsonSchema.parse(await handleResponse<unknown>(response));

  if (!data.success || !data.data) {
    throw new Error(orgApiErrorMessage(data, "Erro ao restaurar organização"));
  }

  return transformBackendWorkspace(asUnknown(data.data));
};

// --- Áreas ---

export const fetchWorkspaceAreas = async (): Promise<WorkspaceArea[]> => {
  try {
    const response = await apiClient.get(API_ENDPOINTS.ORGANIZATIONS_AREAS);
    const payload = await handleResponse<unknown>(response);
    // handleResponse unwraps successful `{ success, data }` API envelopes.
    // The areas endpoint therefore arrives here as a plain array; retain the
    // object fallback for callers/mocks that return an unwrapped payload.
    const areas = Array.isArray(payload) ? payload : WorkspaceJsonSchema.parse(payload).data;

    if (Array.isArray(areas)) {
      return areas.map((raw: unknown) => transformBackendArea(raw));
    }

    return [];
  } catch (error) {
    console.error("Erro ao buscar áreas da organização:", error);
    throw error instanceof Error
      ? error
      : new Error("Não foi possível carregar as áreas da organização");
  }
};

export const fetchAreaMembers = async (areaId: string): Promise<WorkspaceAreaMember[]> => {
  try {
    const response = await apiClient.get(API_ENDPOINTS.ORGANIZATIONS_AREA_MEMBERS(areaId));
    const data = WorkspaceJsonSchema.parse(await handleResponse<unknown>(response));

    if ((data.status === "OK" || data.success) && Array.isArray(data.members)) {
      return data.members as WorkspaceAreaMember[];
    }

    return [];
  } catch (error) {
    console.error(`Erro ao buscar membros da área ${areaId}:`, error);
    throw error instanceof Error
      ? error
      : new Error("Não foi possível carregar os membros da área");
  }
};

export const createWorkspaceArea = async (
  payload: CreateWorkspaceAreaInput
): Promise<WorkspaceArea> => {
  const response = await apiClient.post(API_ENDPOINTS.ORGANIZATIONS_AREAS, payload);
  const data = WorkspaceJsonSchema.parse(await handleResponse<unknown>(response));

  if ((data.status === "OK" || data.success) && data.data) {
    return transformBackendArea(asUnknown(data.data));
  }

  throw new Error(orgApiErrorMessage(data, "Erro ao criar área"));
};

export const getWorkspaceArea = async (areaId: string): Promise<WorkspaceArea> => {
  const response = await apiClient.get(API_ENDPOINTS.ORGANIZATIONS_AREA_BY_ID(areaId));
  const data = WorkspaceJsonSchema.parse(await handleResponse<unknown>(response));

  if ((data.status === "OK" || data.success) && data.data) {
    return transformBackendArea(asUnknown(data.data));
  }

  throw new Error(orgApiErrorMessage(data, "Erro ao buscar área"));
};

export const updateWorkspaceArea = async (
  areaId: string,
  payload: UpdateWorkspaceAreaInput
): Promise<WorkspaceArea> => {
  const response = await apiClient.put(API_ENDPOINTS.ORGANIZATIONS_AREA_BY_ID(areaId), payload);
  const data = WorkspaceJsonSchema.parse(await handleResponse<unknown>(response));

  if ((data.status === "OK" || data.success) && data.data) {
    return transformBackendArea(asUnknown(data.data));
  }

  throw new Error(orgApiErrorMessage(data, "Erro ao atualizar área"));
};

export const deleteWorkspaceArea = async (areaId: string): Promise<WorkspaceArea> => {
  const response = await apiClient.delete(API_ENDPOINTS.ORGANIZATIONS_AREA_BY_ID(areaId));
  const data = WorkspaceJsonSchema.parse(await handleResponse<unknown>(response));

  if ((data.status === "OK" || data.success) && data.data) {
    return transformBackendArea(asUnknown(data.data));
  }

  throw new Error(orgApiErrorMessage(data, "Erro ao remover área"));
};

export const addAreaMember = async (
  areaId: string,
  payload: AddAreaMemberInput
): Promise<WorkspaceAreaMember> => {
  const response = await apiClient.post(API_ENDPOINTS.ORGANIZATIONS_AREA_MEMBERS(areaId), payload);
  const data = WorkspaceJsonSchema.parse(await handleResponse<unknown>(response));

  if ((data.status === "OK" || data.success) && data.data) {
    return asUnknown<WorkspaceAreaMember>(data.data);
  }

  throw new Error(orgApiErrorMessage(data, "Erro ao adicionar membro na área"));
};

export const updateAreaMember = async (
  areaId: string,
  memberId: string,
  payload: UpdateAreaMemberInput
): Promise<WorkspaceAreaMember> => {
  const response = await apiClient.patch(
    API_ENDPOINTS.ORGANIZATIONS_AREA_MEMBER(areaId, memberId),
    payload
  );
  const data = WorkspaceJsonSchema.parse(await handleResponse<unknown>(response));

  if ((data.status === "OK" || data.success) && data.data) {
    return asUnknown<WorkspaceAreaMember>(data.data);
  }

  throw new Error(orgApiErrorMessage(data, "Erro ao atualizar membro da área"));
};

export const removeAreaMember = async (
  areaId: string,
  memberId: string
): Promise<WorkspaceAreaMember> => {
  const response = await apiClient.delete(
    API_ENDPOINTS.ORGANIZATIONS_AREA_MEMBER(areaId, memberId)
  );
  const data = WorkspaceJsonSchema.parse(await handleResponse<unknown>(response));

  if ((data.status === "OK" || data.success) && data.data) {
    return asUnknown<WorkspaceAreaMember>(data.data);
  }

  throw new Error(orgApiErrorMessage(data, "Erro ao remover membro da área"));
};

// --- Membros e Convites ---

/** Respostas da API usam `status: "OK"` ou `success: true` */
function isApiSuccess(data: Record<string, unknown>): boolean {
  return data.status === "OK" || data.success === true;
}

export interface WorkspaceMembersData {
  count: number;
  count_by_role: Record<string, number>;
  count_by_status: Record<string, number>;
  list_workspace_members: WorkspaceMember[];
}

export const fetchWorkspaceMembers = async (
  userId?: string
): Promise<WorkspaceMembersData | null> => {
  try {
    const url = userId
      ? `${API_ENDPOINTS.ORGANIZATIONS_MEMBERS}?userId=${userId}`
      : API_ENDPOINTS.ORGANIZATIONS_MEMBERS;

    const response = await apiClient.get(url);
    const data = WorkspaceJsonSchema.parse(await handleResponse<unknown>(response));

    const membersRaw =
      data.list_workspace_members ||
      data.list_workspace_members ||
      (data.data as any)?.list_workspace_members ||
      (data.data as any)?.list_workspace_members;

    if ((data.status === "OK" || data.success) && membersRaw) {
      const countRaw = data.count ?? (data.data as any)?.count;
      const count =
        typeof countRaw === "number"
          ? countRaw
          : typeof countRaw === "string"
            ? Number(countRaw) || 0
            : 0;
      return {
        count,
        count_by_role: recordNumbers(data.count_by_role || (data.data as any)?.count_by_role),
        count_by_status: recordNumbers(data.count_by_status || (data.data as any)?.count_by_status),
        list_workspace_members: (membersRaw as Array<{ member_data: WorkspaceMember }>).map(
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
): Promise<WorkspaceMember> => {
  const normalized =
    typeof role === "string" ? (role.trim().toUpperCase() as WorkspaceRole) : role;
  if (!isWorkspaceRole(normalized)) {
    throw new Error("Invalid workspace role");
  }
  const payload = { memberId, role: normalized, userId };
  const response = await apiClient.post(API_ENDPOINTS.ORGANIZATIONS_MEMBERS, payload);
  const data = WorkspaceJsonSchema.parse(await handleResponse<unknown>(response));

  if (!data.success || !data.data) {
    throw new Error(orgApiErrorMessage(data, "Erro ao adicionar membro"));
  }
  return asUnknown<WorkspaceMember>(data.data);
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
  const data = WorkspaceJsonSchema.parse(await handleResponse<unknown>(response));

  if (!isApiSuccess(data)) {
    throw new Error(orgApiErrorMessage(data, "Erro ao enviar convite"));
  }
  const msg = data.message;
  return {
    message: typeof msg === "string" ? msg : "Convite enviado com sucesso",
  };
};

export const fetchPendingInvites = async (userId?: string): Promise<WorkspaceInvite[]> => {
  try {
    const url = userId
      ? `${API_ENDPOINTS.ORGANIZATIONS_INVITES}?userId=${userId}`
      : API_ENDPOINTS.ORGANIZATIONS_INVITES;

    const response = await apiClient.get(url);
    const data = WorkspaceJsonSchema.parse(await handleResponse<unknown>(response));

    if (isApiSuccess(data) && Array.isArray(data.data)) {
      return asUnknown<WorkspaceInvite[]>(data.data);
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
  const data = WorkspaceJsonSchema.parse(await handleResponse<unknown>(response));

  if (!isApiSuccess(data)) {
    throw new Error(orgApiErrorMessage(data, "Erro ao cancelar convite"));
  }
};

export const previewWorkspaceInvite = async (
  token: string
): Promise<WorkspaceInvitePreview> => {
  const response = await apiClient.get(
    `${API_ENDPOINTS.ORGANIZATIONS_INVITES}/preview?token=${encodeURIComponent(token)}`
  );
  const data = WorkspaceJsonSchema.parse(await handleResponse<unknown>(response));
  if (!data.data) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[previewWorkspaceInvite] Missing data in OK response", data);
    }
    throw new Error(
      process.env.NODE_ENV === "development"
        ? "Invalid server response: invite preview payload is missing."
        : "Resposta inválida do servidor"
    );
  }

  const previewData = data.data as any;
  if (previewData.workspace_logo_url) {
    previewData.workspace_logo_url = getStorageUrl(previewData.workspace_logo_url);
  }

  return asUnknown<WorkspaceInvitePreview>(previewData);
};

export const acceptInvite = async (
  acceptData: AcceptInviteData,
  userId?: string
): Promise<AcceptInviteResponse> => {
  const payload = { ...acceptData, userId };
  const response = await apiClient.post(`${API_ENDPOINTS.ORGANIZATIONS_INVITES}/accept`, payload);
  const data = WorkspaceJsonSchema.parse(await handleResponse<unknown>(response));

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
): Promise<WorkspaceMember> => {
  const url = userId
    ? `${API_ENDPOINTS.ORGANIZATIONS_MEMBER(memberId)}?userId=${userId}`
    : API_ENDPOINTS.ORGANIZATIONS_MEMBER(memberId);

  const response = await apiClient.delete(url);
  const data = WorkspaceJsonSchema.parse(await handleResponse<unknown>(response));

  if (!data.success || !data.data) {
    throw new Error(orgApiErrorMessage(data, "Erro ao remover membro"));
  }
  return asUnknown<WorkspaceMember>(data.data);
};

export const updateMemberRole = async (
  memberId: string,
  role: WorkspaceRole,
  userId?: string
): Promise<WorkspaceMember> => {
  const url = userId
    ? `${API_ENDPOINTS.ORGANIZATIONS_MEMBER(memberId)}?userId=${userId}`
    : API_ENDPOINTS.ORGANIZATIONS_MEMBER(memberId);

  const normalized =
    typeof role === "string" ? (role.trim().toUpperCase() as WorkspaceRole) : role;
  if (!isWorkspaceRole(normalized)) {
    throw new Error("Invalid workspace role");
  }

  const response = await apiClient.patch(url, { role: normalized, userId });
  const data = WorkspaceJsonSchema.parse(await handleResponse<unknown>(response));

  if ((data.status !== "OK" && !data.success) || !data.data) {
    throw new Error(orgApiErrorMessage(data, "Erro ao atualizar função do membro"));
  }

  return asUnknown<WorkspaceMember>(data.data);
};

// --- Uploads ---

/**
 * Upload do Logo (UserId via FormData)
 */
export const uploadWorkspaceLogo = async (
  file: File,
  userId?: string
): Promise<Workspace> => {
  const formData = new FormData();
  formData.append("image", file);
  if (userId) {
    formData.append("userId", userId);
  }

  const response = await apiClient.put(API_ENDPOINTS.ORGANIZATIONS_LOGO, formData, {
    // handled implicitly
  });

  const data = WorkspaceJsonSchema.parse(await handleResponse<unknown>(response));
  const logoBody = asUnknown<{ workspace?: unknown } | null | undefined>(data.data);

  if (!data.success || !logoBody?.workspace) {
    throw new Error(orgApiErrorMessage(data, "Erro ao fazer upload do logo"));
  }

  return transformBackendWorkspace(logoBody.workspace);
};

/**
 * Upload do Banner (UserId via FormData)
 */
export const uploadWorkspaceBanner = async (
  file: File,
  userId?: string
): Promise<Workspace> => {
  const formData = new FormData();
  formData.append("image", file);
  if (userId) {
    formData.append("userId", userId);
  }

  const response = await apiClient.put(API_ENDPOINTS.ORGANIZATIONS_BANNER, formData, {
    // "Content-Type": "multipart/form-data" handled automatically when passing FormData
  });

  const data = WorkspaceJsonSchema.parse(await handleResponse<unknown>(response));
  const bannerBody = asUnknown<{ workspace?: unknown } | null | undefined>(data.data);

  if (!data.success || !bannerBody?.workspace) {
    throw new Error(orgApiErrorMessage(data, "Erro ao fazer upload do banner"));
  }

  return transformBackendWorkspace(bannerBody.workspace);
};

// --- Domínios ---

export const fetchDomains = async (userId?: string): Promise<WorkspaceDomain[]> => {
  try {
    const url = userId
      ? `${API_ENDPOINTS.ORGANIZATIONS_DOMAINS}?userId=${userId}`
      : API_ENDPOINTS.ORGANIZATIONS_DOMAINS;

    const response = await apiClient.get(url);
    const data = WorkspaceJsonSchema.parse(await handleResponse<unknown>(response));

    if (data.status === "OK" && data.domains) {
      return asUnknown<WorkspaceDomain[]>(data.domains);
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
): Promise<WorkspaceDomain> => {
  const url = userId
    ? `${API_ENDPOINTS.ORGANIZATIONS_DOMAINS}?userId=${userId}`
    : API_ENDPOINTS.ORGANIZATIONS_DOMAINS;

  const payload = { domain_name };
  const response = await apiClient.post(url, payload);
  const data = WorkspaceJsonSchema.parse(await handleResponse<unknown>(response));

  if (data.status !== "OK" || !data.data) {
    throw new Error(
      data.data && typeof data.data === "string"
        ? data.data
        : orgApiErrorMessage(data, "Erro ao criar domínio")
    );
  }
  return asUnknown<WorkspaceDomain>(data.data);
};

export const verifyDomain = async (
  domainId: string,
  userId?: string
): Promise<{ domain: WorkspaceDomain; dns_checks: any }> => {
  const endpoint = API_ENDPOINTS.ORGANIZATIONS_DOMAIN_VERIFY(domainId);
  const url = userId ? `${endpoint}?userId=${userId}` : endpoint;

  const response = await apiClient.post(url, {});
  const data = WorkspaceJsonSchema.parse(await handleResponse<unknown>(response));

  if (data.status !== "OK" || !data.data) {
    throw new Error(orgApiErrorMessage(data, "Erro ao verificar domínio"));
  }

  return {
    domain: asUnknown<WorkspaceDomain>(data.data),
    dns_checks: data.dns_checks,
  };
};

export const deleteDomain = async (domainId: string, userId?: string): Promise<void> => {
  const endpoint = API_ENDPOINTS.ORGANIZATIONS_DOMAIN_DELETE(domainId);
  const url = userId ? `${endpoint}?userId=${userId}` : endpoint;

  const response = await apiClient.delete(url);
  const data = WorkspaceJsonSchema.parse(await handleResponse<unknown>(response));

  if (data.status !== "OK") {
    throw new Error(orgApiErrorMessage(data, "Erro ao deletar domínio"));
  }
};

export interface UserWorkspaceSummary {
  id: string;
  public_id: string;
  workspace_name: string;
  org_name?: string;
  unique_name: string;
  logo_url: string | null;
  member_role: string;
  joined_at?: string;
}

export const fetchMyWorkspaces = async (): Promise<UserWorkspaceSummary[]> => {
  try {
    const response = await apiClient.get(API_ENDPOINTS.ORGANIZATIONS_MY_ORGANIZATIONS);
    const data = await handleResponse<{ data?: UserWorkspaceSummary[]; success?: boolean }>(
      response
    );
    if (data.data && Array.isArray(data.data)) {
      return data.data.map((item: any) => ({
        ...item,
        org_name: item.workspace_name || item.org_name || "",
        workspace_name: item.workspace_name || item.org_name || "",
      }));
    }
    return [];
  } catch (error) {
    console.error("Erro ao buscar organizações do usuário:", error);
    return [];
  }
};

export const switchWorkspaceApi = async (workspaceId: string): Promise<boolean> => {
  const response = await apiClient.post(API_ENDPOINTS.ORGANIZATIONS_SWITCH, {
    organizationId: workspaceId,
    workspaceId,
  });
  const data = await handleResponse<{ success?: boolean }>(response);
  return data.success === true;
};
