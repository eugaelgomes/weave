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
    <header className="fixed top-0 left-0 right-0 z-50 w-full border-b border-neutral-200 bg-white/80 backdrop-blur-md dark:border-neutral-800 dark:bg-neutral-950/80 transition-colors">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        
        {/* Left Section: Logo & Brand */}
        <div className="flex items-center gap-8">
          <Link
            href="/"
            className="flex items-center gap-2.5 transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 rounded-md"
          >
            <Image
              src="/weave.png"
              alt="Weave Logo"
              width={24}
              height={24}
              className="h-6 w-6"
            />
            <span className="text-base font-semibold tracking-tight text-neutral-900 dark:text-white">
              Weave
            </span>
          </Link>
        </div>

        {/* Right Section: Navigation & Actions */}
        <div className="flex items-center gap-4">
          
          {/* Segmented Control para Idiomas */}
          <div className="hidden items-center gap-0.5 rounded-md border border-neutral-200 bg-neutral-50 p-0.5 dark:border-neutral-800 dark:bg-neutral-900 md:flex">
            {(["pt-BR", "en-US", "es-ES"] as SupportedLocale[]).map((loc) => (
              <button
                key={loc}
                onClick={() => setLocale(loc)}
                className={`rounded-[4px] px-2.5 py-1 text-xs font-medium transition-all ${
                  locale === loc
                    ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-800 dark:text-white"
                    : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
                }`}
              >
                {loc.split("-")[0]}
              </button>
            ))}
          </div>

          <div className="hidden h-5 w-px bg-neutral-200 dark:bg-neutral-800 md:block" />

          {/* Theme Toggle */}
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="flex h-8 w-8 items-center justify-center rounded-md text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400"
            aria-label="Alternar tema"
          >
            {theme === "dark" ? (
              <LuSun className="h-4 w-4" />
            ) : (
              <LuMoon className="h-4 w-4" />
            )}
          </button>

          {/* Primary Navigation & CTAs */}
          <nav className="flex items-center gap-4 ml-2">
            <Link
              href="/"
              className="hidden text-sm font-medium text-neutral-600 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white md:block"
            >
              {t.navbar.home}
            </Link>
            
            <a
              href={`${APP_URL}/auth`}
              className="text-sm font-medium text-neutral-600 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
            >
              {t.navbar.login}
            </a>

            <a
              href={fullCtaHref}
              className="inline-flex h-9 items-center justify-center rounded-md bg-yellow-500 px-4 text-sm font-medium text-neutral-950 shadow-sm transition-colors hover:bg-yellow-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-500"
            >
              {ctaLabel || t.navbar.cta}
            </a>
          </nav>
        </div>
      </div>
    </header>
  );
}