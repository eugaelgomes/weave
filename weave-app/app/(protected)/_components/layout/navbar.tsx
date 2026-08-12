"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X, Sun, Moon, Search, CircleUserRound, Bell, Globe } from "lucide-react";

import { useAuth, type User } from "@/app/_contexts/auth-context";
import { useTheme } from "@/app/_contexts/theme-context";
import { useLanguage } from "@/app/_contexts/language-context";
import { useNotification } from "@/app/_contexts/notification-context";

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
            className={cn(
              "flex min-h-9 h-9 items-center justify-between gap-x-2 px-2",
              "lg:px-3"
            )}
          >
            {/* Bloco Esquerdo: Logo & Unique Name */}
            <section className="flex min-w-0 items-center justify-start">
              {onToggleSidebar && (
                <button
                  type="button"
                  onClick={onToggleSidebar}
                  className="flex h-6 w-6 items-center justify-center rounded-md bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/15 text-gray-600 dark:text-gray-300 lg:hidden mr-1.5 shrink-0 transition-colors"
                  aria-label={t.nav.openSidebar}
                  title={t.nav.openSidebar}
                >
                  <Menu size={14} />
                </button>
              )}

              <div
                className={cn(
                  "flex items-center shrink-0 transition-[width] duration-300 ease-out",
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
                      "text-black dark:text-white text-sm font-bold tracking-tight leading-none",
                      fredoka.className
                    )}
                  >
                    Weave
                  </span>
                </Link>
              </div>

              <span className="text-gray-300 dark:text-gray-600 shrink-0 font-light text-xs">|</span>

              {(user?.user_organization?.unique_name || user?.org_name) && (
                <div className="flex items-center gap-1.5 min-w-0 text-xs text-gray-400 font-medium ml-1.5 sm:ml-2">
                  {(user?.user_organization?.logo_url || user?.org_logo_url) && (
                    <Image
                      src={user?.user_organization?.logo_url || user?.org_logo_url!}
                      alt={t.navbar.logoOf.replace("{name}", user?.user_organization?.unique_name || user?.org_name || "")}
                      width={16}
                      height={16}
                      className="h-4 w-4 rounded-sm object-contain shrink-0"
                    />
                  )}
                  <span className="text-gray-600 dark:text-gray-300 truncate max-w-[80px] sm:max-w-[140px]">
                    {user?.user_organization?.unique_name || user?.org_name}
                  </span>
                </div>
              )}
            </section>

            {/* Right: Docs, Theme, Notifications, Avatar */}
            <section className="flex shrink-0 items-center justify-end gap-2 md:gap-3">
              {authenticated && user && (
                <>
                  <div className="hidden md:flex items-center gap-3 mr-1">
                    <a
                      href="#"
                      className="text-xs font-medium text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-all duration-500 ease-in-out"
                    >
                      {PROMPT_VARIANTS[variantIndex]}
                    </a>
                    
                    <div className="h-4 w-[1px] bg-gray-200 dark:bg-white/10 hidden md:block" />

                    <div className="relative group">
                      <button
                        type="button"
                        title={t.common?.changeLanguage || "Mudar idioma"}
                        aria-label={t.common?.changeLanguage || "Mudar idioma"}
                        className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors flex items-center pt-1 pb-1"
                      >
                        <Globe className="h-4 w-4" />
                      </button>
                      
                      <div className="absolute right-0 top-full w-32 origin-top-right rounded-md bg-white p-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none dark:bg-neutral-800 dark:ring-white/10 invisible opacity-0 transition-all group-hover:visible group-hover:opacity-100 z-50">
                        <button
                          onClick={() => setLocale("pt-BR")}
                          className={cn("w-full text-left rounded-sm px-2 py-1.5 text-xs text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-neutral-700 transition-colors", locale === "pt-BR" && "bg-black/5 dark:bg-white/10 font-semibold")}
                        >
                          Português
                        </button>
                        <button
                          onClick={() => setLocale("en-US")}
                          className={cn("w-full text-left rounded-sm px-2 py-1.5 text-xs text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-neutral-700 transition-colors", locale === "en-US" && "bg-black/5 dark:bg-white/10 font-semibold")}
                        >
                          English
                        </button>
                        <button
                          onClick={() => setLocale("es-ES")}
                          className={cn("w-full text-left rounded-sm px-2 py-1.5 text-xs text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-neutral-700 transition-colors", locale === "es-ES" && "bg-black/5 dark:bg-white/10 font-semibold")}
                        >
                          Español
                        </button>
                      </div>
                    </div>
                  </div>

                  <NotificationsLink
                    ariaLabel={t.nav.notifications}
                    surface="desktop"
                    className="h-6 w-6 !p-0 flex items-center justify-center !bg-transparent hover:!bg-transparent text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors"
                  />

                  <button
                    type="button"
                    onClick={handleThemeToggle}
                    className="flex h-6 w-6 items-center justify-center text-gray-600 hover:text-gray-900 transition-colors dark:text-gray-300 dark:hover:text-white"
                    aria-label={t.navbar.theme}
                    title={t.navbar.theme}
                  >
                    {theme === "light" ? <Moon size={14} /> : <Sun size={14} />}
                  </button>

                  <button
                    onClick={() => { window.location.hash = '#settings/me'; }}
                    className="flex items-center gap-2 transition-opacity hover:opacity-80"
                    aria-label={t.navbar.accountSettings}
                    title={t.navbar.accountSettings}
                  >
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-200 hidden sm:block truncate max-w-[120px]">
                      {user.username || user.user_name || t.common.user}
                    </span>
                    <div className="h-6 w-6 rounded-md bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/15 flex items-center justify-center overflow-hidden transition-colors shrink-0">
                      {user.avatar_url ? (
                        <Image src={user.avatar_url} alt={t.navbar.avatarOf.replace("{name}", user.user_name || user.username || t.common.user)} width={24} height={24} className="h-full w-full object-cover" />
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
