"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X, Sun, Moon, Search, CircleUserRound, Bell, Globe } from "lucide-react";

import { useAuth, type User } from "@/app/_contexts/auth-context";
import { useTheme } from "@/app/_contexts/theme-context";
import { useLanguage } from "@/app/_contexts/language-context";
import { useNotification } from "@/app/_contexts/notification-context";
import { WorkspaceSwitcher } from "./workspace-switcher";

import { cn } from "@/lib/utils";

import { Fredoka } from "next/font/google";

const fredoka = Fredoka({
  subsets: ["latin"],
  weight: ["600", "700"],
});

/** Mobile navbar icons — same language as collapsed sidebar rows (rounded-md, soft hover). */
const navIconMobileShellClass =
  "flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-gray-700 transition-colors hover:bg-black/5 active:bg-black/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-yellow/50 dark:text-white dark:hover:bg-white/10 dark:active:bg-white/[0.14] [&>svg]:shrink-0";

/** Desktop search + user chip: bordered surface (no shadow). */
const navbarElevatedSurfaceClass =
  "bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10";

const NotificationsLink = ({
  ariaLabel,
  className,
  surface = "mobile",
}: {
  ariaLabel: string;
  className?: string;
  surface?: "mobile" | "desktop";
}) => {
  const { unreadCount } = useNotification();
  const { user } = useAuth();
  const orgPrefix = user?.org_public_id
    ? `/${user.org_public_id}`
    : user?.public_id
      ? `/${user.public_id}`
      : "";

  return (
    <Link
      href={`${orgPrefix}/notifications`}
      className={cn(
        surface === "desktop" ? navbarElevatedSurfaceClass : navIconMobileShellClass,
        "focus-visible:ring-brand-yellow/50 relative flex items-center justify-center transition-colors focus-visible:ring-2 focus-visible:outline-none",
        surface === "desktop"
          ? "h-4 w-4 rounded-full p-1 text-gray-700 md:h-6 md:w-6 dark:text-white"
          : "",
        className
      )}
      aria-label={ariaLabel}
      title={ariaLabel}
    >
      <Bell className="h-4 w-4" strokeWidth={1.75} />
      {unreadCount > 0 && (
        <span className="bg-brand-primary-500 dark:border-surface-dark-border-strong absolute -top-0.5 -right-0.5 flex h-3.5 min-w-[14px] items-center justify-center rounded-full border-2 border-white px-0.5 text-[7px] font-bold text-white md:h-4 md:min-w-[16px] md:text-[8px]">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </Link>
  );
};

// --- Principal ---

interface NavbarProps {
  onToggleSidebar?: () => void;
  isCollapsed?: boolean;
}

const PROMPT_VARIANTS = [
  "Sabe das possibilidades?",
  "Com o Weave eu posso...",
  "Que feature legal!",
  "Descubra o Weave AI",
  "O que vamos construir?",
  "Potencialize seus projetos",
  "Crie algo incrível hoje",
  "Explore novas ideias",
  "Transforme seu fluxo",
  "Acelere seu trabalho",
  "Organize com inteligência",
  "Pergunte qualquer coisa",
  "Ideias sem limites",
];

const Navbar = ({ onToggleSidebar, isCollapsed = false }: NavbarProps) => {
  const { user, logout, authenticated, updateUser } = useAuth();
  const { theme, setTheme } = useTheme();
  const { t, locale, setLocale } = useLanguage();

  const [variantIndex, setVariantIndex] = useState(0);

  useEffect(() => {
    setVariantIndex(Math.floor(Math.random() * PROMPT_VARIANTS.length));
    const interval = setInterval(() => {
      setVariantIndex((prev) => (prev + 1) % PROMPT_VARIANTS.length);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleThemeToggle = useCallback(() => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);

    if (user) {
      updateUser({ theme_mode: newTheme }).catch((err) =>
        console.error("Failed to persist theme sync:", err)
      );
    }
  }, [theme, setTheme, user, updateUser]);

  return (
    <>
      <header className="relative z-40 w-full shrink-0 print:hidden">
        <nav
          className="mx-auto w-full bg-white dark:bg-[#1d1d1b]"
          aria-label={t.navbar.mainNavigation}
        >
          <div
            className={cn("flex h-9 min-h-9 items-center justify-between gap-x-2 px-2", "lg:px-3")}
          >
            {/* Bloco Esquerdo: Logo & Unique Name */}
            <section className="flex min-w-0 items-center justify-start">
              {onToggleSidebar && (
                <button
                  type="button"
                  onClick={onToggleSidebar}
                  className="mr-1.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-black/5 text-gray-600 transition-colors hover:bg-black/10 lg:hidden dark:bg-white/10 dark:text-gray-300 dark:hover:bg-white/15"
                  aria-label={t.nav.openSidebar}
                  title={t.nav.openSidebar}
                >
                  <Menu size={14} />
                </button>
              )}

              <div
                className={cn(
                  "flex shrink-0 items-center transition-[width] duration-300 ease-out",
                  "w-auto",
                  isCollapsed ? "lg:w-[52px]" : "lg:w-[158px]"
                )}
              >
                <Link
                  href="/"
                  className="flex items-center gap-2 transition-opacity hover:opacity-80"
                >
                  <span
                    className={cn(
                      "text-sm leading-none font-bold tracking-tight text-black dark:text-white",
                      fredoka.className
                    )}
                  >
                    Weave
                  </span>
                </Link>
              </div>

              <span className="shrink-0 text-xs font-light text-gray-300 dark:text-gray-600">
                |
              </span>

              <WorkspaceSwitcher />
            </section>

            {/* Right: Docs, Theme, Notifications, Avatar */}
            <section className="flex shrink-0 items-center justify-end gap-2 md:gap-3">
              {authenticated && user && (
                <>
                  <div className="mr-1 hidden items-center gap-3 md:flex">
                    <a
                      href="#"
                      className="text-xs font-medium text-gray-600 transition-all duration-500 ease-in-out hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                    >
                      {PROMPT_VARIANTS[variantIndex]}
                    </a>

                    <div className="hidden h-4 w-[1px] bg-gray-200 md:block dark:bg-white/10" />

                    <div className="group relative">
                      <button
                        type="button"
                        title={t.common?.changeLanguage || "Mudar idioma"}
                        aria-label={t.common?.changeLanguage || "Mudar idioma"}
                        className="flex items-center pt-1 pb-1 text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                      >
                        <Globe className="h-4 w-4" />
                      </button>

                      <div className="ring-opacity-5 invisible absolute top-full right-0 z-50 w-32 origin-top-right rounded-md bg-white p-1 opacity-0 shadow-lg ring-1 ring-black transition-all group-hover:visible group-hover:opacity-100 focus:outline-none dark:bg-neutral-800 dark:ring-white/10">
                        <button
                          onClick={() => setLocale("pt-BR")}
                          className={cn(
                            "w-full rounded-sm px-2 py-1.5 text-left text-xs text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-neutral-700",
                            locale === "pt-BR" && "bg-black/5 font-semibold dark:bg-white/10"
                          )}
                        >
                          Português
                        </button>
                        <button
                          onClick={() => setLocale("en-US")}
                          className={cn(
                            "w-full rounded-sm px-2 py-1.5 text-left text-xs text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-neutral-700",
                            locale === "en-US" && "bg-black/5 font-semibold dark:bg-white/10"
                          )}
                        >
                          English
                        </button>
                        <button
                          onClick={() => setLocale("es-ES")}
                          className={cn(
                            "w-full rounded-sm px-2 py-1.5 text-left text-xs text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-neutral-700",
                            locale === "es-ES" && "bg-black/5 font-semibold dark:bg-white/10"
                          )}
                        >
                          Español
                        </button>
                      </div>
                    </div>
                  </div>

                  <NotificationsLink
                    ariaLabel={t.nav.notifications}
                    surface="desktop"
                    className="flex h-6 w-6 items-center justify-center !bg-transparent !p-0 text-gray-600 transition-colors hover:!bg-transparent hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                  />

                  <button
                    type="button"
                    onClick={handleThemeToggle}
                    className="flex h-6 w-6 items-center justify-center text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                    aria-label={t.navbar.theme}
                    title={t.navbar.theme}
                  >
                    {theme === "light" ? <Moon size={14} /> : <Sun size={14} />}
                  </button>

                  <button
                    onClick={() => {
                      window.location.hash = "#settings/me";
                    }}
                    className="flex items-center gap-2 transition-opacity hover:opacity-80"
                    aria-label={t.navbar.accountSettings}
                    title={t.navbar.accountSettings}
                  >
                    <span className="hidden max-w-[120px] truncate text-xs font-medium text-gray-700 sm:block dark:text-gray-200">
                      {user.username || user.user_name || t.common.user}
                    </span>
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-md bg-black/5 transition-colors hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/15">
                      {user.avatar_url ? (
                        <Image
                          src={user.avatar_url}
                          alt={t.navbar.avatarOf.replace(
                            "{name}",
                            user.user_name || user.username || t.common.user
                          )}
                          width={24}
                          height={24}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <CircleUserRound className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                      )}
                    </div>
                  </button>
                </>
              )}
            </section>
          </div>
        </nav>
      </header>
    </>
  );
};

export default Navbar;
