import { type NextRequest, NextResponse } from "next/server";

export default function middleware(request: NextRequest) {
  // Pass through if request is aiming for public files or api
  if (
    request.nextUrl.pathname.startsWith("/_next") ||
    request.nextUrl.pathname.startsWith("/api") ||
    request.nextUrl.pathname.startsWith("/static")
  ) {
    return NextResponse.next();
  }

  // Se for rota de login, permitir
  if (request.nextUrl.pathname === "/signin") {
    const token = request.cookies.get("system_admin_token");
    // Se já tem token, redireciona para dashboard
    if (token) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  // Para outras rotas protegidas, verificar token
  const token = request.cookies.get("system_admin_token");

  if (!token) {
    return NextResponse.redirect(new URL("/signin", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
