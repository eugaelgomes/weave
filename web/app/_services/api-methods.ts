import { ApiError, buildApiError, getSafeApiErrorMessage } from "./api-error";
import { clearInternalChallengeCache, getInternalChallengeHeaders } from "./internal-challenge";
import { notifyUnauthorized } from "./session-invalidation";
import { notifyPlanLimitExceededSync } from "./plan-limit-sync";

export { ApiError };

const ensureApiV1Path = (baseUrl: string): string => {
  const normalized = baseUrl.replace(/\/+$/, "");
  if (normalized.endsWith("/api/v1")) {
    return normalized;
  }
  return `${normalized}/api/v1`;
};

const isLocalHostname = (hostname: string): boolean =>
  hostname === "localhost" || hostname === "127.0.0.1";

const shouldForceLocalApi = (configuredBaseUrl: string): boolean => {
  if (typeof window === "undefined") return false;
  if (!isLocalHostname(window.location.hostname)) return false;

  try {
    const configuredHost = new URL(configuredBaseUrl).hostname;
    return !isLocalHostname(configuredHost);
  } catch {
    return true;
  }
};

const resolveApiBaseUrl = (): string => {
  const configuredBaseUrl =
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    "http://localhost:8080/api/v1";

  if (shouldForceLocalApi(configuredBaseUrl)) {
    return "http://localhost:8080/api/v1";
  }

  return ensureApiV1Path(configuredBaseUrl);
};

// Configurações da API
export const API_BASE_URL = resolveApiBaseUrl();

export const API_CONFIG = {
  timeout: 120000, // 120 seconds to allow for long LLM responses
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
  GITHUB_AUTH: "/auth/signin/sso/github",
  MICROSOFT_AUTH: "/auth/signin/sso/microsoft",
  ACTIVATE_ACCOUNT: "/users/activate-account",

  // User Management
  UPDATE_PROFILE: "/users/me/update-profile",
  CHECK_USER_AVAILABILITY: "/users/check-availability",
  CHECK_USERNAME_PUBLIC: "/users/check-username",

  UPDATE_PASSWORD: "/users/me/update-password",
  DELETE_ACCOUNT: "/users/delete-my-account",
  CREATE_ACCOUNT: "/users/create-account",
  USERS: "/auth/users",

  /** Lean plan + usage + gates for the authenticated web session */
  PLANS_ME: "/plans/me",
  PLANS_USAGE_HISTORY: "/plans/usage-history",

  // Password Recovery
  FORGOT_PASSWORD: "/auth/forgot-password",
  RESET_PASSWORD: "/auth/reset-password",

  // Notifications
  NOTIFICATIONS: "/notifications",
  NOTIFICATION_BY_ID: (id: string) => `/notifications/${id}`,
  NOTIFICATION_MARK_READ: (id: string) => `/notifications/${id}/read`,
  NOTIFICATION_TOGGLE_TRASH: (id: string) => `/notifications/${id}/trash`,
  NOTIFICATIONS_MARK_ALL_READ: "/notifications/mark-all-read",

  // Notes
  NOTES: "/notes",
  NOTES_STATS: "/notes/stats",
  /** GET note: accepts public_id (12-char) or internal UUID. Mutations (PUT/blocks/etc.) should use internal UUID via getNoteApiId(). */
  NOTES_BY_ID: (id: string) => `/notes/${id}`,
  NOTES_COMMENTS: (noteId: string) => `/notes/${noteId}/comments`,
  NOTES_COMMENT_ATTACHMENTS: (noteId: string) => `/notes/${noteId}/comments/attachments`,
  NOTES_COMMENT_BY_ID: (noteId: string, commentId: string) =>
    `/notes/${noteId}/comments/${commentId}`,
  NOTES_SEARCH: "/notes/search",
  NOTES_EXPORT: "/notes/export",
  NOTES_BLOCKS: (noteId: string) => `/notes/${noteId}/blocks`,
  NOTES_BLOCK_BY_ID: (noteId: string, blockId: string) => `/notes/${noteId}/blocks/${blockId}`,
  NOTES_BLOCKS_REORDER: (noteId: string) => `/notes/${noteId}/blocks/reorder`,
  NOTES_DOCUMENT_IMAGES: (noteId: string) => `/notes/${noteId}/document-images`,

  // Projects
  PROJECTS: "/projects",
  PROJECTS_STATS: "/projects/stats",
  PROJECTS_BY_ID: (projectId: string) => `/projects/${projectId}`,
  PROJECTS_MY_VIEW_PREF: (projectId: string) => `/projects/${projectId}/my-view-preference`,
  PROJECTS_STAGES: (projectId: string) => `/projects/${projectId}/stages`,
  PROJECTS_STAGE_BY_ID: (projectId: string, stageId: string) =>
    `/projects/${projectId}/stages/${stageId}`,
  PROJECTS_COLLABORATORS: (projectId: string) => `/projects/${projectId}/collaborators`,
  PROJECTS_NOTES: (projectId: string) => `/projects/${projectId}/notes`,
  PROJECTS_NOTE_STAGE: (projectId: string, noteId: string) =>
    `/projects/${projectId}/notes/${noteId}/stage`,
  PROJECTS_STAGE_TASKS: (projectId: string, stageId: string) =>
    `/projects/${projectId}/stages/${stageId}/tasks`,
  PROJECTS_TASK_BY_ID: (projectId: string, noteId: string) =>
    `/projects/${projectId}/tasks/${noteId}`,
  PROJECTS_TAGS: (projectId: string) => `/projects/${projectId}/tags`,
  PROJECTS_TAG_BY_ID: (projectId: string, tagId: string) => `/projects/${projectId}/tags/${tagId}`,
  PROJECTS_TASK_PRIORITIES: (projectId: string) => `/projects/${projectId}/task-priorities`,
  PROJECTS_TASK_PRIORITY_BY_ID: (projectId: string, priorityId: string) =>
    `/projects/${projectId}/task-priorities/${priorityId}`,

  // Sprints
  ENGINE_SPRINTS: (projectId: string) => `/engine/${projectId}/sprints`,
  ENGINE_SPRINT_ACTIVE: (projectId: string) => `/engine/${projectId}/sprints/active`,
  ENGINE_SPRINT_COMPLETE: (projectId: string, sprintId: string) =>
    `/engine/${projectId}/sprints/${sprintId}/complete`,

  // Reasonings
  ENGINE_REASONINGS: (projectId: string) => `/engine/${projectId}/reasonings`,
  ENGINE_REASONINGS_TRIGGER: (projectId: string) => `/engine/${projectId}/reasonings/trigger`,
  ENGINE_REASONING_BY_ID: (projectId: string, reasoningId: string) =>
    `/engine/${projectId}/reasonings/${reasoningId}`,
  ENGINE_REASONING_ACTION_ITEMS: (projectId: string, reasoningId: string) =>
    `/engine/${projectId}/reasonings/${reasoningId}/action-items`,
  ENGINE_REASONING_INTERACTION: (projectId: string, reasoningId: string) =>
    `/engine/${projectId}/reasonings/${reasoningId}/interaction`,
  ENGINE_REASONING_ACTION_ITEM: (projectId: string, reasoningId: string, itemId: string) =>
    `/engine/${projectId}/reasonings/${reasoningId}/action-items/${itemId}`,

  // AI Report Config
  ENGINE_AI_REPORT_CONFIG: (projectId: string) => `/engine/${projectId}/ai-report-config`,

  // Backup
  BACKUP_REQUEST: "/backup/request",
  BACKUP_STATUS: (jobId: string) => `/backup/status/${jobId}`,
  BACKUP_JOBS: "/backup/jobs",
  BACKUP_SUMMARY: "/backup/summary",

  // Organizations
  ORGANIZATIONS: "/organizations",
  ORGANIZATIONS_MY_ORGANIZATIONS: "/organizations/my-organizations",
  ORGANIZATIONS_SWITCH: "/organizations/switch",
  ORGANIZATIONS_CREATION_STEP_ONE: "/organizations/creation-steps/step-1",
  ORGANIZATIONS_CREATION_STEP_ONE_COMPLETE: "/organizations/creation-steps/step-1/complete",
  ORGANIZATIONS_PROPERTIES: "/organizations/properties",
  ORGANIZATIONS_RESTORE: "/organizations/restore",
  ORGANIZATIONS_MEMBERS: "/organizations/members",
  ORGANIZATIONS_MEMBER: (memberId: string) => `/organizations/members/${memberId}`,
  ORGANIZATIONS_INVITES: "/organizations/invites",
  ORGANIZATIONS_DOMAINS: "/organizations/domains",
  ORGANIZATIONS_DOMAIN_VERIFY: (id: string) => `/organizations/domains/${id}/verify`,
  ORGANIZATIONS_DOMAIN_DELETE: (id: string) => `/organizations/domains/${id}`,
  ORGANIZATIONS_LOGO: "/organizations/logo",
  ORGANIZATIONS_BANNER: "/organizations/banner",
  ORGANIZATIONS_AREAS: "/organizations/areas",
  ORGANIZATIONS_AREA_BY_ID: (id: string) => `/organizations/areas/${id}`,
  ORGANIZATIONS_AREA_MEMBERS: (id: string) => `/organizations/areas/${id}/members`,
  ORGANIZATIONS_AREA_MEMBER: (areaId: string, memberId: string) =>
    `/organizations/areas/${areaId}/members/${memberId}`,

  // AI
  AI_MODELS: "/weave-ai/models",
  AI_CHAT: "/weave-ai/chat",
  AI_CHAT_BY_ID: (sessionId: string) => `/weave-ai/chat/${sessionId}`,
  AI_CHAT_SHARE: (sessionId: string) => `/weave-ai/chat/${sessionId}/share`,
  AI_CHAT_SHARE_PREVIEW: (token: string) => `/weave-ai/chat/share/${token}`,
  AI_CHAT_SHARE_FORK: (token: string) => `/weave-ai/chat/share/${token}/fork`,
  AI_CHAT_HISTORY: "/weave-ai/chat/history",
  AI_CHAT_MESSAGE_FEEDBACK: (messageId: string) => `/weave-ai/chat/messages/${messageId}/feedback`,
  AI_GENERATE: "/weave-ai/generate",
  AI_ANALYZE_NOTE: "/weave-ai/analyze-note",
  AI_ANALYZE_PROJECT: "/weave-ai/analyze-project",
  AI_RESEARCH: "/weave-ai/research",
  AI_USE_CASES: "/weave-ai/use-cases",

  // Agents
  AGENTS: "/weave-ai/agents",
  AGENTS_PROVIDERS: "/weave-ai/agents/providers",
  AGENT_BY_ID: (id: string) => `/weave-ai/agents/${id}`,
  AGENT_SHARE: (id: string) => `/weave-ai/agents/${id}/share`,

  // Google Calendar
  GOOGLE_CALENDAR_AUTH: "/webhooks/google/auth",
  GOOGLE_CALENDAR_STATUS: "/webhooks/google/calendar/status",
  GOOGLE_CALENDAR_EVENTS: "/webhooks/google/calendar/events",
  GOOGLE_CALENDAR_STREAM: "/webhooks/google/calendar/stream",
  GOOGLE_CALENDAR_DISCONNECT: "/webhooks/google/calendar/disconnect",

  // Slack
  SLACK_STATUS: "/integrations/slack/integrations",
  SLACK_INSTALL: "/integrations/slack/install",
  SLACK_DISCONNECT: "/integrations/slack/integrations",

  // Internal Calendar Events
  CALENDAR_EVENTS: "/calendar",
  CALENDAR_EVENT_BY_ID: (id: string) => `/calendar/${id}`,
  CALENDAR_EVENT_INVITES: (eventId: string) => `/calendar/${eventId}/invites`,
  CALENDAR_EVENT_INVITE_BY_ID: (eventId: string, inviteId: string) =>
    `/calendar/${eventId}/invites/${inviteId}`,
  GOOGLE_CALENDAR_SETTINGS: "/calendar/google/settings",
  GOOGLE_CALENDAR_LIST: "/calendar/google/calendars",
  GOOGLE_CALENDAR_FREEBUSY: "/calendar/google/freebusy",

  // Internal API Tokens
  API_TOKENS_SCOPES: "/api-tokens/scopes",
  API_TOKENS_LIST: "/api-tokens/get-tokens",
  API_TOKENS_CREATE: "/api-tokens/create-token",
  API_TOKENS_REVOKE: (id: string) => `/api-tokens/${id}/revoke`,
};

export interface ApiRequestOptions extends RequestInit {
  overrideBaseURL?: string;
  timeout?: number;
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

    const requestId =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const internal = await getInternalChallengeHeaders();

    if (!(options.body instanceof FormData)) {
      config.headers = {
        ...this.defaultHeaders,
        ...internal,
        "x-request-id": requestId,
        ...((options.headers as Record<string, string>) || {}),
      };
    } else {
      config.headers = {
        ...internal,
        "x-request-id": requestId,
        ...(options.headers || {}),
      } as HeadersInit;
    }

    let timeoutId: number | undefined;
    if (!config.signal) {
      const controller = new AbortController();
      const timeoutValue = options.timeout ?? API_CONFIG.timeout;
      timeoutId = window.setTimeout(() => controller.abort("timeout"), timeoutValue);
      config.signal = controller.signal;
    }

    try {
      let response = await fetch(url, config);
      if (timeoutId !== undefined) clearTimeout(timeoutId);

      if (response.status === 403) {
        let code: string | undefined;
        try {
          const ct = response.headers.get("content-type");
          if (ct?.includes("application/json")) {
            const j = (await response.clone().json()) as { code?: unknown };
            if (j?.code != null) code = String(j.code);
          }
        } catch {
          // ignore
        }
        if (
          code === "INTERNAL_CHALLENGE_REQUIRED" ||
          code === "INTERNAL_CHALLENGE_INVALID" ||
          code === "INTERNAL_CHALLENGE_ORIGIN_MISMATCH"
        ) {
          clearInternalChallengeCache();
          const internalRetry = await getInternalChallengeHeaders();
          if (!(options.body instanceof FormData)) {
            config.headers = {
              ...this.defaultHeaders,
              ...internalRetry,
              ...((options.headers as Record<string, string>) || {}),
            };
          } else {
            config.headers = {
              ...internalRetry,
              ...(options.headers || {}),
            } as HeadersInit;
          }
          response = await fetch(url, config);
        }
      }

      return response;
    } catch (error) {
      if (timeoutId !== undefined) clearTimeout(timeoutId);

      const isAbortError = error instanceof Error && error.name === "AbortError";
      const isTimeout = isAbortError || error === "timeout";

      if (isTimeout) {
        throw new ApiError(getSafeApiErrorMessage(504, "Request timeout", true), 504);
      }

      throw new ApiError(
        getSafeApiErrorMessage(
          0,
          `Network error: ${error instanceof Error ? error.message : "Unknown error"}`,
          true
        ),
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
      body: data instanceof FormData ? data : data ? JSON.stringify(data) : undefined,
    });
  }

  async delete(endpoint: string, options: ApiRequestOptions = {}): Promise<Response> {
    return this.request(endpoint, {
      ...options,
      method: "DELETE",
    });
  }
}

export type HandleResponseOptions = {
  /**
   * @deprecated Use `invalidateSessionOn401`.
   * When true, 401 does not run the global session invalidation handler.
   */
  skipSessionInvalidationOn401?: boolean;
  /** When true, 401 runs the global session invalidation handler. Defaults to false. */
  invalidateSessionOn401?: boolean;
};

export async function handleResponse<T = unknown>(
  response: Response,
  options?: HandleResponseOptions
): Promise<T> {
  const contentType = response.headers.get("content-type");

  if (!response.ok) {
    const shouldInvalidateSession = options?.invalidateSessionOn401 ?? false;

    if (response.status === 401 && shouldInvalidateSession) {
      notifyUnauthorized();
    }
    let errorData: unknown;
    let textPayload: string | undefined;

    try {
      if (contentType?.includes("application/json")) {
        errorData = await response.json();
        if (typeof errorData === "object" && errorData !== null) {
          const obj = errorData as {
            code?: unknown;
            message?: unknown;
            error?: unknown;
          };
          if (response.status === 403 && obj.code === "PLAN_LIMIT_EXCEEDED") {
            notifyPlanLimitExceededSync();
          }
        }
      } else {
        textPayload = await response.text();
      }
    } catch {}
    throw buildApiError({
      status: response.status,
      statusText: response.statusText,
      data: errorData,
      textPayload,
    });
  }

  if (response.status === 204 || response.headers.get("content-length") === "0") {
    return {} as T;
  }

  try {
    if (contentType?.includes("application/json")) {
      const json = await response.json();
      // Gracefully handle standard API envelopes while maintaining backwards compatibility
      if (json && typeof json === "object" && json.success === true && "data" in json) {
        return json.data as T;
      }
      return json as T;
    } else {
      return (await response.text()) as T;
    }
  } catch (error) {
    throw new ApiError(
      getSafeApiErrorMessage(
        response.status,
        `Failed to parse response: ${error instanceof Error ? error.message : "Unknown error"}`,
        true
      ),
      response.status
    );
  }
}

export const apiClient = new ApiClient(API_BASE_URL);

export default apiClient;
