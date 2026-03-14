"use client";

import Image from "next/image";
import React from "react";
import Link from "next/link";
import { APP_URL } from "../config/urls";
import { useLanguage } from "../contexts/LanguageContext";
import { SupportedLocale } from "../_i18n";
import { useTheme } from "next-themes";
import { LuSun, LuMoon } from "react-icons/lu";

interface NavbarProps {
  ctaLabel?: string;
  ctaHref?: string;
  showAbout?: boolean;
}

export default function Navbar({
  ctaLabel,
  ctaHref = "/auth/signup",
}: NavbarProps) {
  const { t, locale, setLocale } = useLanguage();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const isExternal = ctaHref.startsWith("http");
  const fullCtaHref = isExternal ? ctaHref : `${APP_URL}${ctaHref}`;

  if (!mounted) return null;

  return (
    <nav className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex w-[95%] max-w-7xl justify-center">
      <div className="flex w-full items-center justify-between rounded-full border border-neutral-200/50 bg-white/70 px-6 py-2 shadow-sm backdrop-blur-md transition-all dark:border-neutral-800/50 dark:bg-neutral-900/70">
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="group flex items-center gap-2.5 transition-opacity hover:opacity-80"
          >
            <Image
              src="/weave.png"
              alt="Weave Logo"
              width={24}
              height={24}
              className="h-6 w-6 transition-transform duration-500 group-hover:rotate-12"
            />
            <span className="text-base font-bold tracking-tight text-neutral-900 dark:text-white">
              Weave
            </span>
          </Link>

          <div className="hidden items-center gap-1 md:flex">
            {(["pt-BR", "en-US", "es-ES"] as SupportedLocale[]).map((loc) => (
              <button
                key={loc}
                onClick={() => setLocale(loc)}
                className={`rounded-md px-2 py-1 text-[10px] font-bold uppercase transition-colors ${
                  locale === loc
                    ? "bg-yellow-400 text-neutral-900 shadow-sm"
                    : "text-neutral-500 hover:bg-neutral-100/80 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800/80 dark:hover:text-white"
                }`}
              >
                {loc.split("-")[0]}
              </button>
            ))}
          </div>

          <div className="h-4 w-px bg-neutral-200/50 dark:bg-neutral-800/50" />

          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-500 transition-colors hover:bg-neutral-100/80 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800/80 dark:hover:text-white"
            aria-label="Alternar tema"
          >
            {theme === "dark" ? (
              <LuSun className="h-4 w-4" />
            ) : (
              <LuMoon className="h-4 w-4" />
            )}
          </button>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          <Link
            href="/"
            className="hidden rounded-md px-4 py-1.5 text-xs font-semibold text-neutral-600 transition-colors hover:bg-neutral-100/80 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800/80 dark:hover:text-white md:block"
          >
            {t.navbar.home}
          </Link>
          
          <a
            href={`${APP_URL}/auth/signin`}
            className="rounded-md px-4 py-1.5 text-xs font-semibold text-neutral-600 transition-colors hover:bg-neutral-100/80 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800/80 dark:hover:text-white"
          >
            {t.navbar.login}
          </a>

          <a
            href={fullCtaHref}
            className="inline-flex h-8 items-center justify-center rounded-full bg-yellow-400 px-5 text-xs font-bold text-neutral-900 shadow-sm transition-all hover:bg-yellow-500 hover:shadow-md active:scale-95 dark:bg-yellow-500 dark:hover:bg-yellow-400"
          >
            {ctaLabel || t.navbar.cta}
          </a>
        </div>
      </div>
    </nav>
  );
}
