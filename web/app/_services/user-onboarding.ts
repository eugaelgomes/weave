import { apiClient, API_ENDPOINTS, handleResponse } from "./api-methods";

export interface OnboardingProfileData {
  name?: string;
  username?: string;
  timezone?: string;
  theme_mode?: "LIGHT" | "DARK";
  usage_preference?: {
    language?: {
      interface?: "pt-BR" | "en-US" | "es-ES";
      dateFormat?: "DD/MM/YYYY" | "YYYY-MM-DD";
      timeFormat?: "12h" | "24h";
    };
  };
}

export interface OnboardingWorkspaceData {
  workspace_name: string;
  unique_name: string;
  invite_token?: string;
  workspace_role?: string;
}

export interface OnboardingWorkspaceResponse {
  success: boolean;
  data: {
    workspaceId: string;
  };
}

export interface WorkspaceUniqueNameAvailability {
  available: boolean;
  unique_name: string | null;
}

export const submitOnboardingProfile = async (data: OnboardingProfileData): Promise<void> => {
  const response = await apiClient.post(API_ENDPOINTS.ONBOARDING_STEP_ONE, data);
  await handleResponse(response);
};

export const submitOnboardingWorkspace = async (
  data: OnboardingWorkspaceData
): Promise<OnboardingWorkspaceResponse> => {
  const response = await apiClient.post(API_ENDPOINTS.ONBOARDING_STEP_TWO, data);
  const result = await handleResponse<{ workspaceId: string }>(response);

  return {
    success: true,
    data: result,
  };
};

export const checkWorkspaceUniqueNameAvailability = async (
  uniqueName: string,
  signal?: AbortSignal
): Promise<WorkspaceUniqueNameAvailability> => {
  const searchParams = new URLSearchParams({ unique_name: uniqueName });
  const response = await apiClient.get(
    `${API_ENDPOINTS.ONBOARDING_WORKSPACE_NAME_AVAILABILITY}?${searchParams.toString()}`,
    { signal }
  );
  return handleResponse<WorkspaceUniqueNameAvailability>(response);
};

export const completeOnboarding = async (): Promise<void> => {
  await apiClient.post(API_ENDPOINTS.ONBOARDING_STEP_THREE, {});
};
