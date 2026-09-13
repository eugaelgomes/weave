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
  country?: string;
  workspace_name: string;
  unique_name: string;
  invite_token?: string;
  language?: "pt-BR" | "en-US" | "es-ES";
  workspace_description?: string;
  workspace_role?: string;
  workspace_timezone?: string;
}

export interface OnboardingWorkspaceResponse {
  success: boolean;
  data: {
    workspaceId: string;
    workspacePublicId: string | null;
  };
}

export interface OnboardingTeamData {
  name: string;
  description?: string;
}

export interface OnboardingMemberData {
  email: string;
  name: string;
  team_index?: number;
}

export interface OnboardingTeamsData {
  teams?: OnboardingTeamData[];
  members?: OnboardingMemberData[];
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
  const result = await handleResponse<{ workspaceId: string; workspacePublicId: string | null }>(
    response
  );

  return {
    success: true,
    data: result,
  };
};

export const uploadOnboardingWorkspaceLogo = async (file: File): Promise<void> => {
  const formData = new FormData();
  formData.append("image", file);
  const response = await apiClient.post(API_ENDPOINTS.ONBOARDING_WORKSPACE_LOGO, formData);
  await handleResponse(response);
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

export const submitOnboardingTeams = async (data: OnboardingTeamsData): Promise<void> => {
  const response = await apiClient.post(API_ENDPOINTS.ONBOARDING_STEP_THREE_TEAMS, data);
  await handleResponse(response);
};
