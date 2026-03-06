"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { APP_URL } from "@/app/auth/components/urls";

interface NavbarProps {
  /** Texto do botão de ação primária */
  ctaLabel?: string;
  /** Link do botão de ação primária (relativo ao app principal) */
  ctaHref?: string;
  /** Mostrar link "Sobre" */
  showAbout?: boolean;
}

export default function Navbar({
  ctaLabel,
  ctaHref,
  showAbout = true,
}: NavbarProps) {
  const pathname = usePathname();
  const isSignupRoute = pathname?.startsWith("/auth/signup");
  const defaultCta = isSignupRoute
    ? { label: "Entrar", href: "/auth/signin" }
    : { label: "Criar conta", href: "/auth/signup" };

  const resolvedLabel = ctaLabel ?? defaultCta.label;
  const resolvedHref = ctaHref ?? defaultCta.href;

  const isExternal = resolvedHref.startsWith("http");
  const fullCtaHref = isExternal ? resolvedHref : `${APP_URL}${resolvedHref}`;

  return (
    <nav className="relative top-0 flex w-full justify-center py-4 px-4 sm:px-8">
      <div className="flex w-full items-center justify-between rounded-md border-1 border-neutral-100 bg-white px-2 py-1.5 shadow shadow-md shadow-neutral-300/50 backdrop-blur-md transition-all sm:px-6 sm:py-2">
        {/* Logo Section */}
        <Link
          href={process.env.NEXT_PUBLIC_BLOG_URL || "https://blog.weavenotes.app"}
          className="group flex items-center gap-2 rounded-md px-2 py-1 transition-opacity hover:opacity-70 focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:outline-none"
        >
          <Image
            src="/weave.png"
            alt="Weave Logo"
            width={24}
            height={24}
            // Logo levemente menor para acompanhar a nova altura
            className="h-6 w-6 rounded-md object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <span className="text-sm font-semibold tracking-tight text-neutral-900 transition-colors sm:text-base">
            Weave Notes
          </span>
        </Link>

        {/* Links & CTA Section */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* {showAbout && ( ... )} */}

          <a
            href={`${APP_URL}/auth/signin`}
            // Adicionado um fundo muito suave no hover para reforçar o estilo 'soft'
            className="rounded-md px-3 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-100/50 hover:text-neutral-900 focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:outline-none sm:text-sm dark:text-neutral-400 dark:hover:bg-neutral-800/50 dark:hover:text-white"
          >
            Entrar
          </a>

          {/* Separador Visual (Agora um pouco mais sutil) */}
          <div
            className="hidden h-4 w-px bg-neutral-300/80 sm:block dark:bg-neutral-700/80"
            aria-hidden="true"
          />

          <a
            href={fullCtaHref}
            // Botão também adaptado para formato pílula e padding menor
            className="inline-flex items-center justify-center rounded-md bg-yellow-500 px-4 py-1.5 text-xs font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-yellow-600 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-yellow-500 focus-visible:ring-offset-2 focus-visible:outline-none active:scale-95 sm:text-sm dark:bg-yellow-400 dark:text-neutral-900 dark:hover:bg-yellow-500 dark:focus-visible:ring-offset-neutral-900"
          >
            {resolvedLabel}
          </a>
        </div>
      </div>
    </nav>
  );
}
