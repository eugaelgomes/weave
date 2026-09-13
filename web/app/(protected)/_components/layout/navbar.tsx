"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, Sun, Moon, Search, CircleUserRound, Bell, Globe } from "lucide-react";

import { useAuth } from "@/app/_contexts/auth-context";
import { useTheme } from "@/app/_contexts/theme-context";
import { useLanguage } from "@/app/_contexts/language-context";
import { WorkspaceSwitcher } from "./workspace-switcher";
import { OnboardingNavIndicator } from "./onboarding-nav-indicator";
import SearchModal from "@/app/(protected)/_components/ui/navbar/search-modal";

import { cn } from "@/lib/utils";

import { Fredoka } from "next/font/google";

const fredoka = Fredoka({
  subsets: ["latin"],
  weight: ["600", "700"],
});

/** Mobile navbar icons — same language as collapsed sidebar rows (rounded-md, soft hover). */
const navIconMobileShellClass =
  "flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-black transition-colors hover:bg-black/5 active:bg-black/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-yellow/50 dark:text-white dark:hover:bg-white/10 dark:active:bg-white/[0.14] [&>svg]:shrink-0";

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
  const { user } = useAuth();
  const workspacePrefix = user?.workspace_public_id
    ? `/${user.workspace_public_id}`
    : user?.public_id
      ? `/${user.public_id}`
      : "";

  return (
    <Link
      href={`${workspacePrefix}/notifications`}
      className={cn(
        surface === "desktop" ? navbarElevatedSurfaceClass : navIconMobileShellClass,
        "focus-visible:ring-brand-yellow/50 relative flex items-center justify-center transition-colors focus-visible:ring-2 focus-visible:outline-none",
        surface === "desktop"
          ? "h-4 w-4 rounded-full p-1 text-black md:h-6 md:w-6 dark:text-white"
          : "",
        className
      )}
      aria-label={ariaLabel}
      title={ariaLabel}
    >
      <Bell className="size-4" strokeWidth={2.1} />
    </Link>
  );
};

// --- Principal ---

interface NavbarProps {
  onToggleSidebar?: () => void;
  isCollapsed?: boolean;
}

const Navbar = ({ onToggleSidebar, isCollapsed: _isCollapsed = false }: NavbarProps) => {
  const { user, authenticated, updateUser } = useAuth();
  const { theme, setTheme } = useTheme();
  const { t, locale, setLocale } = useLanguage();

  const [isSearchOpen, setIsSearchOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setIsSearchOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
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
              "relative flex h-9 min-h-9 items-center justify-between gap-x-2 px-2",
              "lg:px-3"
            )}
          >
            {/* Bloco Esquerdo: Logo & Workspace Switcher */}
            <section className="flex min-w-0 items-center justify-start gap-1 sm:gap-1.5">
              {onToggleSidebar && (
                <button
                  type="button"
                  onClick={onToggleSidebar}
                  className="mr-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-black/5 text-black transition-colors hover:bg-black/10 lg:hidden dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
                  aria-label={t.nav.openSidebar}
                  title={t.nav.openSidebar}
                >
                  <Menu className="size-4" strokeWidth={2.1} />
                </button>
              )}

              <Link
                href="/"
                className="flex shrink-0 items-center gap-2 transition-opacity hover:opacity-80"
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

              <span className="shrink-0 text-xs font-light text-gray-300 dark:text-gray-600">
                |
              </span>

              <WorkspaceSwitcher />
            </section>

            {authenticated && (
              <section className="absolute top-1/2 left-1/2 hidden w-[min(22rem,30vw)] -translate-x-1/2 -translate-y-1/2 lg:block">
                <button
                  type="button"
                  onClick={() => setIsSearchOpen(true)}
                  className="flex h-6 w-full items-center gap-2 rounded-full bg-black/5 px-2 text-xs text-black transition-colors hover:bg-black/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
                  aria-label={t.navbar.openSearch}
                  title={t.navbar.openSearch}
                >
                  <Search
                    className="size-4 shrink-0 text-black dark:text-white"
                    strokeWidth={2.1}
                  />
                  <span className="min-w-0 flex-1 truncate text-left">
                    {t.navbar.searchPlaceholder}
                  </span>
                  <kbd className="text-sm font-semibold text-gray-400 dark:text-gray-500">⌘ K</kbd>
                </button>
              </section>
            )}

            {/* Right: Docs, Theme, Notifications, Avatar */}
            <section className="flex shrink-0 items-center justify-end gap-2 md:gap-3">
              {authenticated && user && (
                <>
                  <button
                    type="button"
                    onClick={() => setIsSearchOpen(true)}
                    className="flex h-6 w-6 items-center justify-center text-black transition-colors lg:hidden dark:text-white"
                    aria-label={t.navbar.openSearch}
                    title={t.navbar.openSearch}
                  >
                    <Search className="size-4" strokeWidth={2.1} />
                  </button>

                  <div className="hidden xl:flex">
                    <div className="group relative">
                      <button
                        type="button"
                        title={(t.common as any)?.changeLanguage || "Mudar idioma"}
                        aria-label={(t.common as any)?.changeLanguage || "Mudar idioma"}
                        className="flex items-center gap-1.5 pt-1 pb-1 text-xs font-medium text-black transition-colors dark:text-white"
                      >
                        <Globe className="size-4 text-black dark:text-white" strokeWidth={2.1} />
                        <span>
                          {locale === "pt-BR"
                            ? "Português"
                            : locale === "en-US"
                              ? "English"
                              : "Español"}
                        </span>
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

                  <OnboardingNavIndicator />

                  <NotificationsLink
                    ariaLabel={t.nav.notifications}
                    surface="desktop"
                    className="flex h-6 w-6 items-center justify-center !bg-transparent !p-0 text-black transition-colors hover:!bg-transparent dark:text-white"
                  />

                  <button
                    type="button"
                    onClick={handleThemeToggle}
                    className="flex h-6 w-6 items-center justify-center text-black transition-colors dark:text-white"
                    aria-label={t.navbar.theme}
                    title={t.navbar.theme}
                  >
                    {theme === "light" ? (
                      <Moon className="size-4" strokeWidth={2.1} />
                    ) : (
                      <Sun className="size-4" strokeWidth={2.1} />
                    )}
                  </button>

                  <button
                    onClick={() => {
                      window.location.hash = "#settings/me";
                    }}
                    className="flex items-center gap-2 transition-opacity hover:opacity-80"
                    aria-label={t.navbar.accountSettings}
                    title={t.navbar.accountSettings}
                  >
                    <span className="hidden max-w-[120px] truncate text-xs font-medium text-black sm:block dark:text-white">
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
                        <CircleUserRound
                          className="size-4 text-black dark:text-white"
                          strokeWidth={2.1}
                        />
                      )}
                    </div>
                  </button>
                </>
              )}
            </section>
          </div>
        </nav>
      </header>
      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
};

export default Navbar;
