import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Convites antigos usavam /organization/accept-invite/?token=...
 * Redireciona para /auth/?invite_token=... (sem pasta app/organization).
 */
export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname.replace(/\/$/, "") || "/";
  if (pathname !== "/organization/accept-invite") {
    return NextResponse.next();
  }

  const token = request.nextUrl.searchParams.get("token");
  const url = request.nextUrl.clone();
  url.pathname = "/auth/";
  url.searchParams.delete("token");
  if (token) {
    url.searchParams.set("invite_token", token);
  }
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/organization/accept-invite", "/organization/accept-invite/"],
};
