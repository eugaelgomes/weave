import axios, { AxiosInstance } from "axios";
import { env } from "../config/env";

/**
 * Creates a pre-configured Axios instance for communicating with the Weave API.
 * Each instance is bound to a specific authentication token, enabling per-session
 * data isolation in multi-tenant SSE deployments.
 *
 * @param {string} authToken - The Bearer token to authenticate requests against the Weave API.
 * @returns {AxiosInstance} A configured Axios client instance scoped to the given token.
 */
export function createWeaveApiClient(authToken: string): AxiosInstance {
  const client = axios.create({
    baseURL: env.WEAVE_API_URL,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    },
  });

  // Attach a response interceptor to log API errors to stderr without leaking internals
  client.interceptors.response.use(
    (response) => response,
    (error) => {
      const errorDetails = {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url,
        method: error.config?.method,
      };

      // Log to stderr to avoid disrupting standard stdio JSON-RPC protocol
      console.error("API Request Failed:", JSON.stringify(errorDetails, null, 2));

      return Promise.reject(error);
    }
  );

  return client;
}

/**
 * Default singleton API client using the global INTERNAL_API_TOKEN.
 * Used exclusively for stdio transport where multi-tenancy is not applicable.
 */
export const defaultWeaveApiClient = createWeaveApiClient(env.INTERNAL_API_TOKEN);
