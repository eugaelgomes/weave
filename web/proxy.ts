import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Proxy de Autenticação e Segurança - Weave Notes
 *
 * Este proxy executa no Edge Runtime do Next.js e protege rotas
 * antes que qualquer código JavaScript do cliente seja executado.
 *
 * Responsabilidades:
 * - Verificar autenticação para rotas protegidas
 * - Redirecionar usuários não autenticados para login
 * - Redirecionar usuários autenticados para fora de páginas de auth
 * - Adicionar headers de segurança às respostas
 *
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/proxy
 */

// ============================================================================
// CONFIGURAÇÃO DE ROTAS
// ============================================================================

/**
 * Rotas que requerem autenticação
 * Usuários não autenticados serão redirecionados para /auth/signin
 */
const PROTECTED_ROUTES = ["/app"];

/**
 * Rotas de autenticação
 * Usuários já autenticados serão redirecionados para /app/home
 */
const AUTH_ROUTES = ["/auth/signin", "/auth/signup"];

/**
 * Rotas públicas que não requerem nenhuma verificação
 * Inclui assets, APIs internas do Next.js, etc.
 * @note Mantido para documentação - o matcher já exclui estas rotas
 */
const _PUBLIC_ROUTES = ["/", "/home", "/about", "/auth/reset-password"];

/**
 * Nome do cookie de autenticação (deve corresponder ao backend)
 */
const AUTH_COOKIE_NAME = "token";

/**
 * URL padrão para redirecionamento após login
 */
const DEFAULT_AUTHENTICATED_REDIRECT = "/app/home";

/**
 * URL da página de login
 */
const SIGNIN_URL = "/auth/signin";

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Verifica se o pathname corresponde a alguma das rotas especificadas
 */
function matchesRoute(pathname: string, routes: string[]): boolean {
  return routes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

/**
 * Verifica se a requisição é para um asset estático ou rota interna
 */
function isStaticOrInternalRoute(pathname: string): boolean {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".") || // Arquivos estáticos (favicon.ico, images, etc.)
    pathname.startsWith("/static")
  );
}

/**
 * Cria URL de redirecionamento preservando a URL original como query param
 */
function createRedirectUrl(request: NextRequest, destination: string, preserveOrigin = true): URL {
  const url = new URL(destination, request.url);

  if (preserveOrigin && destination === SIGNIN_URL) {
    const originalPath = request.nextUrl.pathname + request.nextUrl.search;
    // Normaliza removendo barras finais
    const normalizedPath = originalPath.replace(/\/+$/, "") || "/";
    
    // Não preservar redirect se já estiver indo para home
    if (normalizedPath !== "/" && normalizedPath !== DEFAULT_AUTHENTICATED_REDIRECT) {
      url.searchParams.set("redirect", normalizedPath);
    }
  }

  return url;
}

/**
 * Adiciona headers de segurança à resposta
 */
function addSecurityHeaders(response: NextResponse): NextResponse {
  // Previne que o navegador faça MIME-sniffing
  response.headers.set("X-Content-Type-Options", "nosniff");

  // Controla como o Referrer é enviado
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // Previne clickjacking
  response.headers.set("X-Frame-Options", "SAMEORIGIN");

  // Habilita DNS prefetching para melhor performance
  response.headers.set("X-DNS-Prefetch-Control", "on");

  // Política de permissões (restringe APIs sensíveis)
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), interest-cohort=()"
  );

  return response;
}

// ============================================================================
// PROXY PRINCIPAL (Next.js 16+)
// ============================================================================

export default function proxy(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  // 1. Ignorar rotas estáticas e internas do Next.js
  if (isStaticOrInternalRoute(pathname)) {
    return NextResponse.next();
  }

  // 2. Verificar se existe token de autenticação
  const authToken = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const isAuthenticated = Boolean(authToken && authToken.length > 0);

  // 3. Rotas de autenticação (signin, signup)
  //    Se usuário já está autenticado, redirecionar para app
  if (matchesRoute(pathname, AUTH_ROUTES)) {
    if (isAuthenticated) {
      const redirectUrl = request.nextUrl.searchParams.get("redirect");
      // Normaliza o redirect removendo barras finais e validando
      const normalizedRedirect = redirectUrl?.replace(/\/+$/, "") || DEFAULT_AUTHENTICATED_REDIRECT;
      
      // Validar que o redirect é uma URL interna (previne open redirect)
      const isInternalRedirect = normalizedRedirect.startsWith("/");

      return NextResponse.redirect(
        new URL(isInternalRedirect ? normalizedRedirect : DEFAULT_AUTHENTICATED_REDIRECT, request.url)
      );
    }

    // Usuário não autenticado acessando auth routes - permitir
    return addSecurityHeaders(NextResponse.next());
  }

  // 4. Rotas protegidas (/app/*)
  //    Requer autenticação
  if (matchesRoute(pathname, PROTECTED_ROUTES)) {
    if (!isAuthenticated) {
      const redirectUrl = createRedirectUrl(request, SIGNIN_URL, true);
      return NextResponse.redirect(redirectUrl);
    }

    // Usuário autenticado acessando rota protegida - permitir
    return addSecurityHeaders(NextResponse.next());
  }

  // 5. Rotas públicas e outras - permitir acesso
  return addSecurityHeaders(NextResponse.next());
}

// ============================================================================
// CONFIGURAÇÃO DO MATCHER (PROXY)
// ============================================================================

/**
 * Configuração de quais rotas o proxy deve processar
 *
 * Exclui:
 * - _next/static (arquivos estáticos)
 * - _next/image (otimização de imagens)
 * - favicon.ico e outros assets na raiz
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     * - Public assets with extensions
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
