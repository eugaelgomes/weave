import { API_CONFIG } from "./api-routes";
import { ApiError } from "./api-error";

export { ApiError };

class ApiClient {
  private baseURL: string;
  private defaultHeaders: Record<string, string>;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    this.defaultHeaders = API_CONFIG.headers;
  }

  private async request(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const url = `${this.baseURL}${endpoint}`;

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

  async get(endpoint: string, options: RequestInit = {}): Promise<Response> {
    return this.request(endpoint, {
      ...options,
      method: "GET",
    });
  }

  async post(endpoint: string, data?: unknown, options: RequestInit = {}): Promise<Response> {
    return this.request(endpoint, {
      ...options,
      method: "POST",
      body: data instanceof FormData ? data : data ? JSON.stringify(data) : undefined,
    });
  }

  async put(endpoint: string, data?: unknown, options: RequestInit = {}): Promise<Response> {
    return this.request(endpoint, {
      ...options,
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch(endpoint: string, data?: unknown, options: RequestInit = {}): Promise<Response> {
    return this.request(endpoint, {
      ...options,
      method: "PATCH",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete(endpoint: string, options: RequestInit = {}): Promise<Response> {
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

// Instância singleton do cliente API
export const apiClient = new ApiClient(
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080/api"
);

export default apiClient;
