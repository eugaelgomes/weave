"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X, Sun, Moon, Search, CircleUserRound, Bell } from "lucide-react";

import { useAuth, type User } from "@/app/_contexts/auth-context";
import { useTheme } from "@/app/_contexts/theme-context";
import { useLanguage } from "@/app/_contexts/language-context";
import { useNotification } from "@/app/_contexts/notification-context";

import { cn } from "@/lib/utils";

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

const Navbar = ({ onToggleSidebar, isCollapsed = false }: NavbarProps) => {
  const { user, logout, authenticated, updateUser } = useAuth();
  const { theme, setTheme } = useTheme();
  const { t } = useLanguage();

      
    
  
    
  
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
          className="mx-auto w-full max-w-[1920px] px-1.5 pt-1 pb-0.5 sm:px-2 lg:px-2 lg:py-0 lg:pb-0 dark:bg-[#1d1d1b]"
          aria-label={t.navbar.mainNavigation}
        >
          <div
            className={cn(
              "grid min-h-8 grid-cols-[auto_1fr_auto] items-center gap-x-2 px-2 py-1",
              "md:min-h-8 md:grid-cols-[auto_minmax(0,1fr)_auto] md:gap-x-4",
              "lg:min-h-8 lg:px-0 lg:py-0"
            )}
          >
            {/* Bloco Esquerdo: Logo e Organização */}
            <section className="flex min-w-0 items-center gap-1.5 justify-self-start md:gap-2">
              {authenticated && (
                <button
                  type="button"
                  onClick={onToggleSidebar}
                  className={cn(navIconMobileShellClass, "self-center lg:hidden")}
                  aria-label={t.nav.openSidebar}
                  title={t.nav.openSidebar}
                >
                  <Menu className="h-4 w-4" strokeWidth={1.75} />
                </button>
              )}

              {/* Weave title moved to Sidebar */}

              {/*{user?.org_id && isCollapsed && (
                <div className="hidden items-center gap-2 self-center sm:flex">
                  <Link
                    href={
                      user?.org_public_id
                        ? `/${user.org_public_id}/organization/editor`
                        : user?.public_id
                          ? `/${user.public_id}/organization/editor`
                          : "/organization/editor"
                    }
                    className="flex min-w-0 items-center gap-1.5 self-center rounded-md transition-opacity hover:opacity-80"
                  >
                    <span className="max-w-[180px] self-center truncate text-xs leading-none font-medium text-gray-900 dark:text-gray-100">
                      {user.org_name}
                    </span>
                  </Link>
                </div>
              )}*/}
            </section>

            {/* Centro: respiro no mobile (1fr); busca + notificações no desktop */}
            {authenticated && user ? (
              <section className="flex min-h-0 w-full min-w-0 items-center justify-center px-1 md:px-2">
                <div className="hidden w-full max-w-md items-center justify-end gap-2 md:flex">
                  <NotificationsLink ariaLabel={t.nav.notifications} surface="desktop" />
                </div>
              </section>
            ) : (
              <div className="min-w-0" aria-hidden />
            )}

            {/* Right */}
            <section className="flex shrink-0 items-center justify-end gap-0.5 justify-self-end md:gap-2">
              {authenticated && user && (
                <>
                  
                  <NotificationsLink
                    ariaLabel={t.nav.notifications}
                    className="md:hidden"
                    surface="mobile"
                  />

                  <button
                    type="button"
                    onClick={handleThemeToggle}
                    className={cn(
                      navbarElevatedSurfaceClass,
                      "focus-visible:ring-brand-yellow/50 flex h-6 w-6 items-center justify-center rounded-full text-gray-700 transition-colors focus-visible:ring-2 focus-visible:outline-none md:h-6 md:w-6 dark:text-white"
                    )}
                    aria-label={t.navbar.theme}
                    title={t.navbar.theme}
                  >
                    {theme === "light" ? <Moon size={14} /> : <Sun size={14} />}
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
