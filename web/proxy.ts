import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  resolveLegacyAuthInviteRedirect,
  resolveOrganizationAcceptInviteRedirect,
} from "./lib/invite-auth-redirects";

function applyInviteRedirect(
  request: NextRequest,
  redirect: { pathname: string; inviteToken: string | null; deleteToken: boolean }
): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = redirect.pathname;
  if (redirect.deleteToken) {
    url.searchParams.delete("token");
  }
  if (redirect.inviteToken) {
    url.searchParams.set("invite_token", redirect.inviteToken);
  } else {
    url.searchParams.delete("invite_token");
  }
  return NextResponse.redirect(url);
}

/**
 * Legacy org invites used /workspace/accept-invite/?token=...
 * Redirects to /auth/?invite_token=... (canonical accept-invite landing).
 */
export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname.replace(/\/$/, "") || "/";

  const orgInviteRedirect = resolveOrganizationAcceptInviteRedirect(
    pathname,
    request.nextUrl.searchParams.get("token")
  );
  if (orgInviteRedirect) {
    return applyInviteRedirect(request, orgInviteRedirect);
  }

  const legacyAuthRedirect = resolveLegacyAuthInviteRedirect({
    pathname,
    token: request.nextUrl.searchParams.get("token"),
    inviteToken: request.nextUrl.searchParams.get("invite_token"),
    view: request.nextUrl.searchParams.get("view"),
  });
  if (legacyAuthRedirect) {
    return applyInviteRedirect(request, legacyAuthRedirect);
  }

  if (pathname === "/auth/reset-password") {
    const resetToken = request.nextUrl.searchParams.get("reset_token");
    const url = request.nextUrl.clone();
    url.pathname = "/auth/";
    url.searchParams.set("view", "reset-password");
    if (resetToken) {
      url.searchParams.set("token", resetToken);
      url.searchParams.delete("reset_token");
    }
    return NextResponse.redirect(url);
  }

  if (
    pathname === "/notes" ||
    pathname.startsWith("/notes/") ||
    pathname === "/projects" ||
    pathname.startsWith("/projects/") ||
    pathname === "/calendar" ||
    pathname.startsWith("/calendar/") ||
    pathname === "/workspace/projects" ||
    pathname.startsWith("/workspace/projects/") ||
    pathname === "/workspace/dashboard"
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/chat";
    return NextResponse.redirect(url);
  }

  if (pathname !== "/home" && pathname.endsWith("/home")) {
    const url = request.nextUrl.clone();
    url.pathname = "/home";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/workspace/accept-invite",
    "/workspace/accept-invite/",
    "/auth",
    "/auth/",
    "/auth/reset-password",
    "/auth/reset-password/",
    "/notes/:path*",
    "/projects/:path*",
    "/calendar/:path*",
    "/workspace/projects/:path*",
    "/workspace/dashboard",
    "/:path*/home",
  ],
};
