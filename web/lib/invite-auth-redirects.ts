const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type InviteAuthRedirectInput = {
  pathname: string;
  token: string | null;
  inviteToken: string | null;
  view: string | null;
};

export type InviteAuthRedirectResult = {
  pathname: string;
  inviteToken: string | null;
  deleteToken: boolean;
};

/**
 * Legacy org invite links used `token` on /auth without `view=confirm`.
 * Account activation requires `view=confirm`; password reset uses `view=reset-password`.
 */
export function resolveLegacyAuthInviteRedirect(
  input: InviteAuthRedirectInput
): InviteAuthRedirectResult | null {
  const normalizedPath = input.pathname.replace(/\/$/, "") || "/";
  if (normalizedPath !== "/auth") {
    return null;
  }

  if (input.inviteToken) {
    return null;
  }

  const view = input.view?.trim() || null;
  if (view === "confirm" || view === "reset-password") {
    return null;
  }

  const token = input.token?.trim() || null;
  if (!token || !UUID_REGEX.test(token)) {
    return null;
  }

  return {
    pathname: "/auth/",
    inviteToken: token,
    deleteToken: true,
  };
}

/**
 * Maps /workspace/accept-invite?token= to canonical /auth/?invite_token=.
 */
export function resolveOrganizationAcceptInviteRedirect(
  pathname: string,
  token: string | null
): InviteAuthRedirectResult | null {
  const normalizedPath = pathname.replace(/\/$/, "") || "/";
  if (normalizedPath !== "/workspace/accept-invite") {
    return null;
  }

  return {
    pathname: "/auth/",
    inviteToken: token,
    deleteToken: true,
  };
}
