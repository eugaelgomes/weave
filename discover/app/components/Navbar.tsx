"use client";

import Image from "next/image";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { FaGithub, FaLinkedin } from "react-icons/fa";
import { HiBars3, HiXMark } from "react-icons/hi2";
import { LuSun, LuMoon } from "react-icons/lu";
import { APP_URL, SOCIAL_GITHUB_URL, SOCIAL_LINKEDIN_URL } from "../config/urls";
import { useLanguage } from "../contexts/LanguageContext";
import { SupportedLocale } from "../_i18n";
import { useTheme } from "next-themes";

interface NavbarProps {
  loginLabel?: string;
  loginHref?: string;
  ctaLabel?: string;
  ctaHref?: string;
}

function NavDivider({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`hidden h-4 w-px shrink-0 bg-neutral-200 sm:block dark:bg-neutral-700 ${className ?? ""}`}
    />
  );
}

export default function Navbar({
  loginLabel,
  loginHref = "/auth/",
  ctaLabel,
  ctaHref = "/auth/",
}: NavbarProps) {
  const { t, locale, setLocale } = useLanguage();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const isLoginExternal = loginHref.startsWith("http");
  const fullLoginHref = isLoginExternal ? loginHref : `${APP_URL}${loginHref}`;

  const isCtaExternal = ctaHref.startsWith("http");
  const fullCtaHref = isCtaExternal ? ctaHref : `${APP_URL}${ctaHref}`;

  // Botão fantasma para ações secundárias (reduz atrito visual e foca no CTA principal)
  const ghostBtnClass =
    "inline-flex h-8 shrink-0 items-center justify-center bg-transparent px-3 text-[10px] font-semibold  tracking-wide text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900 sm:px-3 sm:text-[11px] dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100 rounded-md";

  const primaryBtnClass =
    "inline-flex h-6 shrink-0 items-center justify-center bg-yellow-500 px-3 text-[10px] font-bold   tracking-wide text-white transition-colors hover:bg-neutral-800 sm:px-3 sm:text-[11px] dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-white rounded-md";

  const iconLinkClass =
    "flex h-8 w-8 shrink-0 items-center justify-center text-neutral-900 transition-opacity hover:opacity-70 dark:text-neutral-100";

  return (
    <nav
      className={`fixed top-0 inset-x-0 z-50 w-full transition-all duration-300 ${
        isScrolled ? "p-0" : "py-2 px-4"
      }`}
    >
      <div
        className={`relative mx-auto w-full bg-white dark:bg-neutral-950 transition-all duration-300 ${
          isScrolled
            ? "max-w-full border-b border-neutral-200 dark:border-neutral-800 shadow-sm"
            : "max-w-[1920px] border border-neutral-200 dark:border-neutral-800 rounded-md shadow-sm"
        }`}
      >
        <div className="mx-auto flex h-8 max-w-7xl items-center gap-3 px-4 sm:h-10 sm:gap-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="flex min-w-0 shrink items-center gap-2 rounded-md transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400"
          >
            <Image
              src="/weave.png"
              alt="Weave Logo"
              width={20}
              height={20}
              className="h-5 w-5"
            />
            <span className="truncate text-sm font-semibold tracking-tight text-neutral-900 dark:text-white">
              Weave Notes
            </span>
          </Link>

          <div className="min-w-2 flex-1" />

          <div className="flex items-center gap-2 sm:gap-0">
            <NavDivider className="mr-2 sm:mr-3" />

            <a
              href={SOCIAL_GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={iconLinkClass}
              aria-label="GitHub"
            >
              <FaGithub className="h-4 w-4" />
            </a>
            <a
              href={SOCIAL_LINKEDIN_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={`${iconLinkClass} sm:ml-1`}
              aria-label="LinkedIn"
            >
              <FaLinkedin className="h-4 w-4" />
            </a>

            <NavDivider className="ml-2 sm:ml-3" />

            <div className="hidden items-center gap-2 sm:flex sm:gap-2.5">
              <a href={fullLoginHref} className={ghostBtnClass}>
                {loginLabel || t.navbar.login || "Entre"}
              </a>
              <a href={fullCtaHref} className={primaryBtnClass}>
                {ctaLabel || t.navbar.cta || "Cadastre-se"}
              </a>
            </div>

            <NavDivider className="ml-2 sm:ml-3" />

            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-neutral-900 transition-colors hover:bg-neutral-100 dark:text-neutral-100 dark:hover:bg-neutral-800"
              aria-expanded={menuOpen ? "true" : "false"}
              aria-label={menuOpen ? t.navbar.closeMenu : t.navbar.menu}
            >
              {menuOpen ? (
                <HiXMark className="h-5 w-5" />
              ) : (
                <HiBars3 className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {menuOpen && (
          <>
            <button
              type="button"
              className="fixed inset-0 top-[var(--nav-height)] -z-10 h-screen w-screen bg-black/20 dark:bg-black/40 backdrop-blur-sm transition-opacity"
              aria-label={t.navbar.closeMenu}
              onClick={() => setMenuOpen(false)}
            />
            
            <div
              className={`absolute left-0 right-0 top-full flex flex-col border-neutral-200 bg-white shadow-xl dark:border-neutral-800 dark:bg-neutral-950 transition-all ${
                isScrolled ? "border-b" : "border-x border-b rounded-b-xl"
              }`}
            >
              <div className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto p-4 sm:p-6">
                
                {/* Botões empilhados no mobile */}
                <div className="flex flex-col gap-2 sm:hidden">
                  <a
                    href={fullLoginHref}
                    onClick={() => setMenuOpen(false)}
                    className={`${ghostBtnClass} w-full border border-neutral-200 dark:border-neutral-700`}
                  >
                    {loginLabel || t.navbar.login || "Entre"}
                  </a>
                  <a
                    href={fullCtaHref}
                    onClick={() => setMenuOpen(false)}
                    className={`${primaryBtnClass} w-full`}
                  >
                    {ctaLabel || t.navbar.cta || "Cadastre-se"}
                  </a>
                </div>

                <nav className="flex flex-col gap-1 border-t border-neutral-100 pt-4 dark:border-neutral-800 sm:border-t-0 sm:pt-0">
                  <Link
                    href="/"
                    onClick={() => setMenuOpen(false)}
                    className="rounded-md px-3 py-2 text-[13px] font-medium text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-900"
                  >
                    {t.navbar.home}
                  </Link>
                  <Link
                    href="/privacy"
                    onClick={() => setMenuOpen(false)}
                    className="rounded-md px-3 py-2 text-[13px] font-medium text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-900"
                  >
                    {t.navbar.privacy}
                  </Link>
                  <Link
                    href="/terms"
                    onClick={() => setMenuOpen(false)}
                    className="rounded-md px-3 py-2 text-[13px] font-medium text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-900"
                  >
                    {t.navbar.terms}
                  </Link>
                </nav>

                <div className="mt-4 flex flex-col gap-4 border-t border-neutral-100 pt-4 dark:border-neutral-800">
                  <div className="flex flex-wrap gap-1 rounded-md border border-neutral-200 bg-neutral-50 p-0.5 dark:border-neutral-700 dark:bg-neutral-900">
                    {(["pt-BR", "en-US", "es-ES"] as SupportedLocale[]).map((loc) => (
                      <button
                        key={loc}
                        type="button"
                        onClick={() => setLocale(loc)}
                        className={`rounded-[4px] px-2.5 py-1.5 text-[11px] font-medium transition-all ${
                          locale === loc
                            ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-800 dark:text-white"
                            : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
                        }`}
                      >
                        {loc.split("-")[0]}
                      </button>
                    ))}
                  </div>

                  {mounted && (
                    <button
                      type="button"
                      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                      className="flex items-center gap-2 rounded-md border border-neutral-200 px-3 py-2 text-[13px] font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-900 w-max"
                    >
                      {theme === "dark" ? (
                        <LuSun className="h-3.5 w-3.5" />
                      ) : (
                        <LuMoon className="h-3.5 w-3.5" />
                      )}
                      <span>{t.navbar.theme}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </nav>
  );
}