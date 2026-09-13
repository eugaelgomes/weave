import { API_ENDPOINTS } from "../api-methods";
import { apiClient, handleResponse } from "../api-methods";
import type { User, UserUniqueField, UserAvailabilityMap } from "./auth.types";

export const checkUserAvailability = async (
  params: Partial<Record<UserUniqueField, string>>,
  signal?: AbortSignal
): Promise<UserAvailabilityMap> => {
  const searchParams = new URLSearchParams();

  if (typeof params.email === "string" && params.email.trim()) {
    searchParams.set("email", params.email.trim());
  }
  if (typeof params.username === "string" && params.username.trim()) {
    searchParams.set("username", params.username.trim());
  }
  if (typeof params.phone_number === "string" && params.phone_number.trim()) {
    searchParams.set("phone_number", params.phone_number.trim());
  }

  const query = searchParams.toString();
  const endpoint = query
    ? `${API_ENDPOINTS.CHECK_USER_AVAILABILITY}?${query}`
    : API_ENDPOINTS.CHECK_USER_AVAILABILITY;

  const response = await apiClient.get(endpoint, { signal });
  const data = await handleResponse<{ availability: Partial<UserAvailabilityMap> }>(response);

  return {
    email: data.availability.email ?? { available: true },
    username: data.availability.username ?? { available: true },
    phone_number: data.availability.phone_number ?? { available: true },
  };
};

export const getUsers = async (): Promise<User[]> => {
  const response = await apiClient.get(API_ENDPOINTS.USERS);
  return await handleResponse<User[]>(response);
};
