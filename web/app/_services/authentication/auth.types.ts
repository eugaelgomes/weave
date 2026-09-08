import {
  type UserPreferences,
  type PlanDetails,
  type UsageDetails,
  type User,
  type BackendProfile,
  type BackendSettings,
  type BackendOrganization,
  type BackendAuthResponse,
  type BackendMeResponse,
  type LoginCredentials,
  type LoginCodeRequest,
  type LoginCodeVerification,
  type SamlSsoDiscoverRequest,
  type SamlSsoDiscoverResponse,
  type CreateUserData,
  type ActivateAccountPayload,
  type OrgDefaultArea,
} from "./auth.schema";

export type {
  UserPreferences,
  PlanDetails,
  UsageDetails,
  User,
  BackendProfile,
  BackendSettings,
  BackendOrganization,
  BackendAuthResponse,
  BackendMeResponse,
  LoginCredentials,
  LoginCodeRequest,
  LoginCodeVerification,
  SamlSsoDiscoverRequest,
  SamlSsoDiscoverResponse,
  CreateUserData,
  ActivateAccountPayload,
  OrgDefaultArea,
};

// Unified interface for data coming from 'user_data' (deprecated func support)
export interface BackendUserData {
  profile: BackendProfile;
  settings?: BackendSettings;
  organization?: BackendOrganization;
  current_plan?: any;
  current_plan_usage?: any;
  usage_preference?: Record<string, unknown>;
}

export interface LoginResponse {
  user: User;
  /** Optional: present in JWT-based auth; absent in session-based (cookie) auth. */
  token?: string;
}

export type UserUniqueField = "email" | "username" | "phone_number";

export type UserFieldAvailability = {
  available: boolean;
  reason?: string;
};

export type UserAvailabilityMap = Record<UserUniqueField, UserFieldAvailability>;
