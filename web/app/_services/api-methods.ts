import { ApiError } from "./api-error";

export { ApiError };

// Configurações da API
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080/api/v1";

export const API_CONFIG = {
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
};

// Endpoints da API
export const API_ENDPOINTS = {
  // Auth
  SIGNIN: "/auth/signin",
  SIGNUP: "/users/signup",
  LOGOUT: "/auth/logout",
  ME: "/users/me",
  REFRESH: "/auth/refresh",
  GOOGLE_AUTH: "/auth/signin/sso/google",
  ACTIVATE_ACCOUNT: "/users/activate-account",

  // User Management
  UPDATE_PROFILE: "/users/me/update-profile",
  UPDATE_PASSWORD: "/users/me/update-password",
  DELETE_ACCOUNT: "/users/delete-my-account",
  CREATE_ACCOUNT: "/users/create-account",
  USERS: "/auth/users",

  // Password Recovery
  FORGOT_PASSWORD: "/password/forgot-password",
  RESET_PASSWORD: "/password/reset-password",

  // Notes
  NOTES: "/notes",
  NOTES_STATS: "/notes/stats",
  NOTES_BY_ID: (id: string) => `/notes/${id}`,
  NOTES_SEARCH: "/notes/search",
  NOTES_EXPORT: "/notes/export",

  // Projects
  PROJECTS: "/projects",
  PROJECTS_BY_ID: (id: string) => `/projects/${id}`,
  PROJECTS_STAGES: (projectId: string) => `/projects/${projectId}/stages`,
  PROJECTS_COLLABORATORS: (projectId: string) => `/projects/${projectId}/collaborators`,
  PROJECTS_NOTES: (projectId: string) => `/projects/${projectId}/notes`,

  // Backup
  BACKUP_REQUEST: "/backup/request",
  BACKUP_STATUS: (jobId: string) => `/backup/status/${jobId}`,
  BACKUP_JOBS: "/backup/jobs",
  BACKUP_SUMMARY: "/backup/summary",

  // Organizations
  ORGANIZATIONS: "/organizations",
  ORGANIZATIONS_PROPERTIES: "/organizations/properties",
  ORGANIZATIONS_RESTORE: "/organizations/restore",
  ORGANIZATIONS_MEMBERS: "/organizations/members",
  ORGANIZATIONS_MEMBER: (memberId: string) => `/organizations/members/${memberId}`,
  ORGANIZATIONS_INVITES: "/organizations/invites",
  ORGANIZATIONS_LOGO: "/organizations/logo",
  ORGANIZATIONS_BANNER: "/organizations/banner",

  // AI
  AI_MODELS: "/weave-ai/models",
  AI_CHAT: "/weave-ai/chat",
  AI_CHAT_HISTORY: "/weave-ai/chat/history",
  AI_GENERATE: "/weave-ai/generate",
  AI_ANALYZE_NOTE: "/weave-ai/analyze-note",
  AI_ANALYZE_PROJECT: "/weave-ai/analyze-project",
  AI_RESEARCH: "/weave-ai/research",
  AI_USE_CASES: "/weave-ai/use-cases",

  // Google Calendar
  GOOGLE_CALENDAR_AUTH: "/webhooks/google/auth",
  GOOGLE_CALENDAR_STATUS: "/webhooks/google/calendar/status",
  GOOGLE_CALENDAR_EVENTS: "/webhooks/google/calendar/events",
  GOOGLE_CALENDAR_DISCONNECT: "/webhooks/google/calendar/disconnect",
};

export interface ApiRequestOptions extends RequestInit {
  overrideBaseURL?: string;
}

// Client API
class ApiClient {
  private baseURL: string;
  private defaultHeaders: Record<string, string>;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    this.defaultHeaders = API_CONFIG.headers;
  }

  private async request(endpoint: string, options: ApiRequestOptions = {}): Promise<Response> {
    let url = endpoint;
    if (!endpoint.startsWith("http")) {
      const base = options.overrideBaseURL ?? this.baseURL;
      url = `${base}${endpoint}`;
    }

    const config: RequestInit = {
      ...options,
      credentials: "include", // HttpOnly
    };

    if (!(options.body instanceof FormData)) {
      config.headers = {
        ...this.defaultHeaders,
        ...options.headers,
      };
    } else {
      config.headers = options.headers;
    }

    try {
      const response = await fetch(url, config);
      return response;
    } catch (error) {
      throw new ApiError(
        `Network error: ${error instanceof Error ? error.message : "Unknown error"}`,
        0
      );
    }
  }

  async get(endpoint: string, options: ApiRequestOptions = {}): Promise<Response> {
    return this.request(endpoint, {
      ...options,
      method: "GET",
    });
  }

  async post(endpoint: string, data?: unknown, options: ApiRequestOptions = {}): Promise<Response> {
    return this.request(endpoint, {
      ...options,
      method: "POST",
      body: data instanceof FormData ? data : data ? JSON.stringify(data) : undefined,
    });
  }

  async put(endpoint: string, data?: unknown, options: ApiRequestOptions = {}): Promise<Response> {
    return this.request(endpoint, {
      ...options,
      method: "PUT",
      body: data instanceof FormData ? data : data ? JSON.stringify(data) : undefined,
    });
  }

  async patch(
    endpoint: string,
    data?: unknown,
    options: ApiRequestOptions = {}
  ): Promise<Response> {
    return this.request(endpoint, {
      ...options,
      method: "PATCH",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete(endpoint: string, options: ApiRequestOptions = {}): Promise<Response> {
    return this.request(endpoint, {
      ...options,
      method: "DELETE",
    });
  }
}

export async function handleResponse<T = unknown>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type");

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    let errorData: unknown;

    try {
      if (contentType?.includes("application/json")) {
        errorData = await response.json();
        if (typeof errorData === "object" && errorData !== null && "message" in errorData) {
          errorMessage = (errorData as { message: string }).message;
        }
      } else {
        errorMessage = (await response.text()) || errorMessage;
      }
    } catch {}
    throw new ApiError(errorMessage, response.status, errorData);
  }

  if (response.status === 204 || response.headers.get("content-length") === "0") {
    return {} as T;
  }

  try {
    if (contentType?.includes("application/json")) {
      return await response.json();
    } else {
      return (await response.text()) as T;
    }
  } catch (error) {
    throw new ApiError(
      `Failed to parse response: ${error instanceof Error ? error.message : "Unknown error"}`,
      response.status
    );
  }
}

export const apiClient = new ApiClient(API_BASE_URL);

export default apiClient;
