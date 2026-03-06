import { API_URL } from "@/app/config/urls";

type RequestOptions = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
};

export async function request<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = "GET", body, headers = {} } = options;

  const config: RequestInit = {
    method,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_URL}${endpoint}`, config);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error || errorData.message || `Erro ${response.status}`
    );
  }

  return response.json();
}

// ==================== Auth ====================

export async function login(email: string, password: string): Promise<any> {
    return request("/system-auth/signin", {
        method: "POST",
        body: { email, password },
    });
}

export async function logout(): Promise<void> {
    return request("/system-auth/logout", {
        method: "POST",
    });
}

export async function getProfile(): Promise<any> { 
    return request("/system-auth/profile", {
        method: "GET",
    });
}

// ==================== Dashboard ====================

export interface DashboardStats {
  total_users: string;
  verified_users: string;
  deleted_users: string;
  total_organizations: string;
  total_projects: string;
  total_notes: string;
  new_users_30d: string;
  new_orgs_30d: string;
}

export async function getDashboard(): Promise<{ stats: DashboardStats }> {
  return request("/admin/stats");
}

// ==================== Users ====================

export interface User {
  user_id: string;
  name: string;
  email: string;
  username: string;
  email_verified: boolean;
  deleted: boolean;
  created_at: string;
  updated_at: string | null;
  last_login: string | null;
  auth_with_google: boolean;
  auth_with_github: boolean;
  private_profile: boolean;
  timezone: string | null;
  org_id: string | null;
  plan_id: string | null;
  has_avatar: boolean;
  org_name: string | null;
  plan_name: string | null;
}

export interface UserDetail extends User {
  avatar_url: string | null;
  theme_mode: string;
  phone_number: string | null;
  birth_date: string | null;
  email_verified_at: string | null;
  org_unique_name: string | null;
}

export interface UserStats {
  total_notes: string;
  total_projects: string;
  shared_notes: string;
  org_memberships: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ListUsersParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  orderBy?: string;
  order?: string;
}

export async function listUsers(
  params: ListUsersParams = {}
): Promise<{ users: User[]; pagination: Pagination }> {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set("page", String(params.page));
  if (params.limit) searchParams.set("limit", String(params.limit));
  if (params.search) searchParams.set("search", params.search);
  if (params.status) searchParams.set("status", params.status);
  if (params.orderBy) searchParams.set("orderBy", params.orderBy);
  if (params.order) searchParams.set("order", params.order);

  const query = searchParams.toString();
  return request(`/users${query ? `?${query}` : ""}`);
}

export async function getUser(
  id: string
): Promise<{ user: UserDetail; stats: UserStats }> {
  return request(`/users/${id}`);
}

export async function updateUser(
  id: string,
  data: Record<string, unknown>
): Promise<{ message: string; user: User }> {
  return request(`/users/${id}`, { method: "PUT", body: data });
}

export async function deleteUser(
  id: string
): Promise<{ message: string; user: User }> {
  return request(`/users/${id}`, { method: "DELETE" });
}

export async function restoreUser(
  id: string
): Promise<{ message: string; user: User }> {
  return request(`/users/${id}/restore`, { method: "POST" });
}

// ==================== Organizations ====================

export interface Organization {
  id: string;
  org_name: string;
  unique_name: string;
  description: string | null;
  deleted: boolean;
  created_at: string;
  updated_at: string;
  owner_id: string;
  plan_id: string | null;
  has_logo: boolean;
  owner_name: string;
  owner_email: string;
  plan_name: string | null;
  member_count: string;
}

export interface OrganizationDetail extends Organization {
  logo_url: string | null;
  banner_url: string | null;
  basic_properties: Record<string, unknown>;
  settings: Record<string, unknown>;
  plan: Record<string, unknown>;
  address: Record<string, unknown>;
  branding_properties: Record<string, unknown> | null;
  integrations: Record<string, unknown> | null;
  owner_username: string;
}

export interface OrgMember {
  membership_id: string;
  role: string;
  status: string;
  joined_at: string;
  suspended: boolean;
  user_id: string;
  name: string;
  email: string;
  username: string;
  has_avatar: boolean;
  invited_by_name: string | null;
}

export interface ListOrgsParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  orderBy?: string;
  order?: string;
}

export async function listOrganizations(
  params: ListOrgsParams = {}
): Promise<{ organizations: Organization[]; pagination: Pagination }> {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set("page", String(params.page));
  if (params.limit) searchParams.set("limit", String(params.limit));
  if (params.search) searchParams.set("search", params.search);
  if (params.status) searchParams.set("status", params.status);
  if (params.orderBy) searchParams.set("orderBy", params.orderBy);
  if (params.order) searchParams.set("order", params.order);

  const query = searchParams.toString();
  return request(`/organizations${query ? `?${query}` : ""}`);
}

export async function getOrganization(
  id: string
): Promise<{ organization: OrganizationDetail; members: OrgMember[] }> {
  return request(`/organizations/${id}`);
}

export async function updateOrganization(
  id: string,
  data: Record<string, unknown>
): Promise<{ message: string; organization: Organization }> {
  return request(`/organizations/${id}`, { method: "PUT", body: data });
}

export async function deleteOrganization(
  id: string
): Promise<{ message: string; organization: Organization }> {
  return request(`/organizations/${id}`, { method: "DELETE" });
}

export async function restoreOrganization(
  id: string
): Promise<{ message: string; organization: Organization }> {
  return request(`/organizations/${id}/restore`, { method: "POST" });
}

// ==================== Plans ====================

export interface Plan {
  plan_id: string;
  name: string;
  plan_value: number;
  currency: string;
  billing_cycle: string;
  is_active: boolean;
  user_count: string;
  org_count: string;
  details: {
    limits: {
      max_notes: number;
      max_projects: number;
      max_team_members: number;
      storage: {
        max_file_size_mb: number;
        total_monthly_upload_mb: number;
      };
      exports: {
        notes_monthly: number;
        backups_monthly: number;
      };
    };
    features: {
      dark_mode: boolean;
      collaboration_tools: boolean;
      custom_branding: boolean;
      priority_support: boolean;
    };
    weave_ai: {
      enabled: boolean;
      config: {
        monthly_messages: number;
        available_models: string[];
      };
      features: string[];
    };
  };
}

export async function listPlans(): Promise<{ plans: Plan[] }> {
  return request("/plans");
}

// ==================== Auth check ====================

export async function checkAuth(): Promise<boolean> {
  try {
    await request("/dashboard");
    return true;
  } catch {
    return false;
  }
}
