import getStorageUrl from "@/app/_utils/get-storage-url";
import { normalizeStorageUrl, normalizeThemeMode } from "./auth.utils";
import type {
  User,
  WorkspaceDefaultArea,
  BackendProfile,
  BackendUserData,
  BackendAuthResponse,
  BackendMeResponse,
} from "./auth.types";

/** Maps API profile email (nullable / empty) to {@link User} optional email. */
export const backendProfileEmailToUser = (email: BackendProfile["email"]): User["email"] =>
  email ? email : undefined;

export const mapWorkspaceDefaultAreaToUser = (
  area: WorkspaceDefaultArea | null | undefined
): User["workspace_default_area"] => {
  if (area == null) return undefined;
  return {
    id: area.id ?? undefined,
    name: area.name ?? undefined,
    slug: area.slug ?? undefined,
    role: area.role ?? undefined,
    member_since: area.member_since ?? undefined,
    description: area.description ?? undefined,
    properties: area.properties ?? {},
  };
};

/**
 * Single Source of Truth for converting Backend data to Frontend User Model.
 * Accepts partial structures (e.g. updateProfile might not return workspace).
 * @deprecated - Kept for reference, but currently unused
 */
export const _mapBackendDataToUser = (data: BackendUserData): User => {
  const { profile, settings, workspace, current_plan, current_plan_usage } = data;

  return {
    // Profile
    id: profile.id,
    user_name: profile.user_name,
    username: profile.username,
    email: backendProfileEmailToUser(profile.email),
    avatar_url: getStorageUrl(profile.avatar_url ?? ""),
    created_at: profile.created_at,
    updated_at: profile.updated_at ?? undefined, // Fix 'null' to 'undefined'
    birth_date: profile.birth_date ?? undefined,
    phone_number: profile.phone_number ?? undefined,
    public_id: profile.public_id,

    // Settings
    theme_mode: normalizeThemeMode(settings?.theme_mode ?? undefined),
    private_profile: settings?.private_profile ?? undefined,
    auth_with_google: settings?.auth_with_google ?? undefined,

    // Workspace (Optional)
    workspace_id: workspace?.id,
    workspace_public_id: workspace?.public_id,
    workspace_name: workspace?.workspace_name,

    workspace_unique_name: workspace?.unique_name,
    workspace_logo_url: normalizeStorageUrl(workspace?.workspace_logo_url),
    workspace_member_role: workspace?.workspace_member_role,
    workspace_member_since: workspace?.workspace_member_since,

    // Plan (Optional)
    plan_id: current_plan?.id,
    plan_name: current_plan?.plan_name,
    plan_client_type: current_plan?.client_type,
    plan_details: current_plan?.details,

    // Usage (Optional)
    usage_plan_id: current_plan_usage?.plan_id,
    usage_plan_name: current_plan_usage?.plan_name,
    usage_client_type: current_plan_usage?.client_type,
    usage_period_start: current_plan_usage?.period_start,
    usage_period_end: current_plan_usage?.period_end,
    usage_details: current_plan_usage?.details,

    // App Preferences
    usage_preference: data.usage_preference || settings?.usage_preference || {},
  };
};

/**
 * Converts backend login response to frontend user model.
 */
export const mapLoginResponseToUser = (data: BackendAuthResponse): User => {
  const { user } = data;
  const workspace = user.user_workspace ?? user.user_organization;

  return {
    // Profile
    id: user.user_profile.id,
    user_name: user.user_profile.name,
    username: user.user_profile.username,
    email: backendProfileEmailToUser(user.user_profile.email ?? null),
    avatar_url: getStorageUrl(user.user_profile.avatar_url ?? ""),
    public_id: user.user_profile.public_id,

    // Settings
    theme_mode: normalizeThemeMode(user.user_settings.theme_mode),
    private_profile: user.user_settings.private_profile,

    // Workspace
    workspace_id: workspace?.id,
    workspace_public_id: workspace?.public_id,
    workspace_name: workspace?.name,
    workspace_unique_name: workspace?.unique_name,
    workspace_logo_url: normalizeStorageUrl(workspace?.logo_url),
    workspace_member_role: workspace?.role,
    workspace_member_since: workspace?.member_since ?? undefined,

    // Compatibility aliases while legacy screens are migrated.
    org_id: workspace?.id,
    org_public_id: workspace?.public_id,
    org_name: workspace?.name,
    org_unique_name: workspace?.unique_name,
    org_logo_url: normalizeStorageUrl(workspace?.logo_url),
    org_member_role: workspace?.role,
    org_member_since: workspace?.member_since ?? undefined,
    org_default_area: mapWorkspaceDefaultAreaToUser(workspace?.default_area ?? undefined),

    user_organization: workspace
      ? {
          id: workspace.id,
          unique_name: workspace.unique_name,
          name: workspace.name,
          logo_url: normalizeStorageUrl(workspace.logo_url),
          member_role: workspace.role,
          member_since: workspace.member_since ?? undefined,
          public_id: workspace.public_id,
          default_area: mapWorkspaceDefaultAreaToUser(workspace.default_area ?? undefined),
        }
      : undefined,
    user_workspace: workspace
      ? {
          id: workspace.id,
          unique_name: workspace.unique_name,
          name: workspace.name,
          logo_url: normalizeStorageUrl(workspace.logo_url),
          member_role: workspace.role,
          member_since: workspace.member_since ?? undefined,
          public_id: workspace.public_id,
          default_area: mapWorkspaceDefaultAreaToUser(workspace.default_area ?? undefined),
        }
      : undefined,

    // Plan
    plan_id: user.user_subscription.plan_id,
    plan_name: user.user_subscription.plan_name,
    onboarding_state: user.onboarding_state,
  };
};

/**
 * Converts backend /me response to frontend user model.
 */
export const mapMeResponseToUser = (data: BackendMeResponse): User => {
  const { user } = data;
  const workspace = user.user_workspace ?? user.user_organization;
  const currentPlan = user.current_plan;
  const currentPlanUsage = user.current_plan_usage;

  return {
    // Profile
    id: user.user_profile.id,
    user_name: user.user_profile.user_name,
    username: user.user_profile.username,
    email: backendProfileEmailToUser(user.user_profile.email),
    avatar_url: getStorageUrl(user.user_profile.avatar_url ?? ""),
    birth_date: user.user_profile.birth_date ?? undefined,
    phone_number: user.user_profile.phone_number ?? undefined,
    created_at: user.user_profile.created_at,
    updated_at: user.user_profile.updated_at ?? undefined, // Fix 'null' to 'undefined'
    public_id: user.user_profile.public_id,

    // Settings
    theme_mode: normalizeThemeMode(user.user_settings.theme_mode ?? undefined),
    private_profile: user.user_settings.private_profile ?? undefined,
    auth_with_google: user.user_settings.auth_with_google ?? undefined,

    // Workspace
    workspace_id: workspace?.id,
    workspace_public_id: workspace?.public_id,
    workspace_name: workspace?.name,
    workspace_unique_name: workspace?.unique_name,
    workspace_logo_url: normalizeStorageUrl(workspace?.logo_url),
    workspace_member_role: workspace?.member_role,
    workspace_member_since: workspace?.member_since ?? undefined,

    // Compatibility aliases while legacy screens are migrated.
    org_id: workspace?.id,
    org_public_id: workspace?.public_id,
    org_name: workspace?.name,
    org_unique_name: workspace?.unique_name,
    org_logo_url: normalizeStorageUrl(workspace?.logo_url),
    org_member_role: workspace?.member_role,
    org_member_since: workspace?.member_since ?? undefined,
    org_default_area: mapWorkspaceDefaultAreaToUser(workspace?.default_area ?? undefined),

    user_organization: workspace
      ? {
          id: workspace.id,
          unique_name: workspace.unique_name,
          name: workspace.name,
          logo_url: normalizeStorageUrl(workspace.logo_url),
          member_role: workspace.member_role,
          member_since: workspace.member_since ?? undefined,
          public_id: workspace.public_id,
          active_modules: (workspace as any).active_modules ?? undefined,
          default_area: mapWorkspaceDefaultAreaToUser(workspace.default_area ?? undefined),
        }
      : undefined,
    user_workspace: workspace
      ? {
          id: workspace.id,
          unique_name: workspace.unique_name,
          name: workspace.name,
          logo_url: normalizeStorageUrl(workspace.logo_url),
          member_role: workspace.member_role,
          member_since: workspace.member_since ?? undefined,
          public_id: workspace.public_id,
          active_modules: (workspace as any).active_modules ?? undefined,
          default_area: mapWorkspaceDefaultAreaToUser(workspace.default_area ?? undefined),
        }
      : undefined,

    // Plan
    plan_id: currentPlan?.id ?? undefined,
    plan_name: currentPlan?.plan_name ?? undefined,
    plan_client_type: currentPlan?.client_type ?? undefined,
    plan_details: currentPlan?.details as User["plan_details"],

    // Usage
    usage_plan_id: currentPlanUsage?.plan_id ?? undefined,
    usage_plan_name: currentPlanUsage?.plan_name ?? undefined,
    usage_client_type: currentPlanUsage?.client_type ?? undefined,
    usage_period_start: currentPlanUsage?.period_start ?? undefined,
    usage_period_end: currentPlanUsage?.period_end ?? undefined,
    usage_details: currentPlanUsage?.details as User["usage_details"],
    onboarding_state: user.onboarding_state,

    // App Preferences
    usage_preference: user.usage_preference || {},
  };
};
