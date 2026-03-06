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
  if (request.nextUrl.pathname === "/login") {
    return NextResponse.next();
  }

  // Para outras rotas, o AuthContext no client vai lidar com o redirecionamento
  // se o usuario nao estiver logado.
  // Poderiamos verificar cookies aqui, mas como o token httponly nao eh acessivel via JS
  // mas eh enviado nas requisicoes... nextjs middleware pode ver cookies.
  
  const token = request.cookies.get("system_admin_token");
  
  if (!token && request.nextUrl.pathname !== "/login") {
     return NextResponse.redirect(new URL("/login", request.url));
  }
  
  if (token && request.nextUrl.pathname === "/login") {
     return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
