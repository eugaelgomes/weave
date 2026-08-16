import type { NextConfig } from "next";
import { execSync } from "child_process";
import path from "path";
const isProd = process.env.NODE_ENV === "production";
/**
 * Headers
 */
const securityHeaders = [
  // MIME-sniffing
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  // Clickjacking
  {
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  // Informações do Referrer
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  // DNS Prefetch Control
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  // HTTPS Strict Transport Security (HSTS)
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains; preload",
  },
  // Restringe APIs sensíveis do navegador
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  // Previne XSS em browsers antigos
  {
    key: "X-XSS-Protection",
    value: "1; mode=block",
  },
  // Content Security Policy
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' http://localhost:* https: wss: ws:",
      "frame-ancestors 'self'",
      "form-action 'self'",
      "base-uri 'self'",
      "object-src 'none'",
    ].join("; "),
  },
];

const staticCacheHeader = {
  key: "Cache-Control",
  value: "public, max-age=31536000, immutable",
};

const nextConfig: NextConfig = {
  // Build ID determinístico para rastreamento de versão e skew protection
  generateBuildId: async () => {
    // Na Vercel, usa o commit SHA; localmente, tenta git
    const sha =
      process.env.VERCEL_GIT_COMMIT_SHA ||
      (() => {
        try {
          return execSync("git rev-parse --short HEAD").toString().trim();
        } catch {
          return "local";
        }
      })();
    return `${Date.now()}-${sha.slice(0, 8)}`;
  },

  // Habilita Deployment ID para Skew Protection na Vercel
  deploymentId: process.env.VERCEL_DEPLOYMENT_ID || undefined,

  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "avatars.dicebear.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
      { protocol: "https", hostname: "sfo3.digitaloceanspaces.com" },
      { protocol: "https", hostname: "wn-storage.sfo3.digitaloceanspaces.com" },
      { protocol: "https", hostname: "cwn.sfo3.cdn.digitaloceanspaces.com" },
      { protocol: "https", hostname: "cw-notes.sfo3.cdn.digitaloceanspaces.com" },
      { protocol: "https", hostname: "weave-notes.sfo3.digitaloceanspaces.com" },
    ],
  },
  reactStrictMode: true,
  trailingSlash: true,

  // turbopack root foi removido pois no novo formato de monorepo 
  // os pacotes (incluindo next) são "hoisted" para a raiz.

  // Redirects de rotas públicas removidas (agora no blog subdomain)
  async redirects() {
    return [
      { source: "/app", destination: "/home", permanent: true },
      { source: "/app/:path*", destination: "/:path*", permanent: true },
      {
        source: "/about",
        destination: process.env.NEXT_PUBLIC_BLOG_URL
          ? `${process.env.NEXT_PUBLIC_BLOG_URL}/about`
          : "https://blog.weavenotes.app/about",
        permanent: true,
      },
      {
        source: "/privacy",
        destination: process.env.NEXT_PUBLIC_BLOG_URL
          ? `${process.env.NEXT_PUBLIC_BLOG_URL}/privacy`
          : "https://blog.weavenotes.app/privacy",
        permanent: true,
      },
      {
        source: "/terms",
        destination: process.env.NEXT_PUBLIC_BLOG_URL
          ? `${process.env.NEXT_PUBLIC_BLOG_URL}/terms`
          : "https://blog.weavenotes.app/terms",
        permanent: true,
      },
    ];
  },

  // Headers de segurança globais
  async headers() {
    const baseHeaders = [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];

    if (isProd) {
      baseHeaders.push(
        {
          source: "/static/:path*",
          headers: [...securityHeaders, staticCacheHeader],
        },
        {
          source: "/_next/static/:path*",
          headers: [staticCacheHeader],
        }
      );
    }

    return baseHeaders;
  },
  poweredByHeader: false,
};

export default nextConfig;
