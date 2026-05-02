import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Convites antigos usavam /organization/accept-invite/?token=...
 * Redireciona para /auth/?invite_token=... (sem pasta app/organization).
 */
export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname.replace(/\/$/, "") || "/";

  // Redireciona convites de organização
  if (pathname === "/organization/accept-invite") {
    const token = request.nextUrl.searchParams.get("token");
    const url = request.nextUrl.clone();
    url.pathname = "/auth/";
    url.searchParams.delete("token");
    if (token) {
      url.searchParams.set("invite_token", token);
    }
    return NextResponse.redirect(url);
  }

  // Redireciona links de redefinição de senha
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

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/organization/accept-invite",
    "/organization/accept-invite/",
    "/auth/reset-password",
    "/auth/reset-password/",
  ],
};
