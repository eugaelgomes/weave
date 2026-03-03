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
    <nav className="z-50 w-full px-6 py-4 lg:py-5">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2.5 transition-opacity hover:opacity-80"
        >
          <Image
            src="/weave.png"
            alt="Weave Logo"
            width={28}
            height={28}
            className="h-7 w-7 rounded-sm object-cover lg:h-8 lg:w-8"
          />
          <span className="text-base font-semibold tracking-tight lg:text-lg">
            Weave Notes
          </span>
        </Link>

        <div className="flex items-center gap-4 lg:gap-6">
          {showAbout && (
            <Link
              href="/about"
              className="text-xs font-medium text-neutral-600 transition-colors hover:text-neutral-900 sm:text-sm lg:text-base dark:text-neutral-400 dark:hover:text-white"
            >
              Sobre
            </Link>
          )}
          <a
            href={`${APP_URL}/auth/signin`}
            className="text-xs font-medium text-neutral-600 transition-colors hover:text-neutral-900 sm:text-sm lg:text-base dark:text-neutral-400 dark:hover:text-white"
          >
            Entrar
          </a>
          <a
            href={fullCtaHref}
            className="rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-white transition-transform hover:-translate-y-0.5 hover:bg-neutral-800 sm:text-sm lg:px-5 lg:py-2 lg:text-base dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
          >
            {ctaLabel}
          </a>
        </div>
      </div>
    </nav>
  );
}
