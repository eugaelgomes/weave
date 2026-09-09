import { apiClient, API_ENDPOINTS, handleResponse } from "./api-methods";

export interface OnboardingProfileData {
  name?: string;
  username?: string;
  timezone?: string;
}

export interface OnboardingWorkspaceData {
  workspace_name: string;
  unique_name: string;
  invite_token?: string;
}

export interface OnboardingWorkspaceResponse {
  success: boolean;
  data: {
    workspaceId: string;
  };
}

export const submitOnboardingProfile = async (data: OnboardingProfileData): Promise<void> => {
  await apiClient.post(API_ENDPOINTS.ONBOARDING_STEP_ONE, data);
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

export const completeOnboarding = async (): Promise<void> => {
  await apiClient.post(API_ENDPOINTS.ONBOARDING_STEP_THREE, {});
};
