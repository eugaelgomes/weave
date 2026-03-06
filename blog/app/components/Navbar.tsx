import Image from "next/image";
import Link from "next/link";
import { APP_URL } from "@/app/config/urls";

interface NavbarProps {
  /** Texto do botão de ação primária */
  ctaLabel?: string;
  /** Link do botão de ação primária (relativo ao app principal) */
  ctaHref?: string;
  /** Mostrar link "Sobre" */
  showAbout?: boolean;
}

export default function Navbar({
  ctaLabel = "Criar conta",
  ctaHref = "/auth/signup",
  showAbout = true,
}: NavbarProps) {
  const isExternal = ctaHref.startsWith("http");
  const fullCtaHref = isExternal ? ctaHref : `${APP_URL}${ctaHref}`;

  return (
    // Padding lateral externo reduzido
    <nav className="sticky top-4 z-50 flex w-full justify-center px-3 sm:px-10">
      {/* Container Principal: Formato 'Pílula', mais fino (py-1.5) e com bordas/fundo mais suaves */}
      <div className="flex w-full items-center justify-between rounded-md shadow shadow-sm shadow-neutral-300/50 border border-neutral-200/50 bg-white/60 px-3 py-1.5 backdrop-blur-md transition-all dark:border-neutral-800/50 dark:bg-neutral-900/60 sm:px-4 sm:py-2">
        {/* Logo Section */}
        <Link
          href="/"
          className="group flex items-center gap-2 rounded-md px-2 py-1 transition-opacity hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400"
        >
          <Image
            src="/weave.png"
            alt="Weave Logo"
            width={24}
            height={24}
            // Logo levemente menor para acompanhar a nova altura
            className="h-6 w-6 rounded-md object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <span className="text-sm font-semibold tracking-tight text-neutral-900 transition-colors dark:text-white sm:text-base">
            Weave Notes
          </span>
        </Link>

        {/* Links & CTA Section */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* {showAbout && ( ... )} */}

          <a
            href={`${APP_URL}/auth/signin`}
            // Adicionado um fundo muito suave no hover para reforçar o estilo 'soft'
            className="rounded-md px-3 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-100/50 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 dark:text-neutral-400 dark:hover:bg-neutral-800/50 dark:hover:text-white sm:text-sm"
          >
            Entrar
          </a>

          {/* Separador Visual (Agora um pouco mais sutil) */}
          <div
            className="hidden h-4 w-px bg-neutral-300/80 dark:bg-neutral-700/80 sm:block"
            aria-hidden="true"
          />

          <a
            href={fullCtaHref}
            // Botão também adaptado para formato pílula e padding menor
            className="inline-flex items-center justify-center rounded-md bg-yellow-500 px-4 py-1.5 text-xs font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-yellow-600 hover:shadow-sm active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500 focus-visible:ring-offset-2 dark:bg-yellow-400 dark:text-neutral-900 dark:hover:bg-yellow-500 dark:focus-visible:ring-offset-neutral-900 sm:text-sm"
          >
            {ctaLabel}
          </a>
        </div>
      </div>
    </nav>
  );
}
