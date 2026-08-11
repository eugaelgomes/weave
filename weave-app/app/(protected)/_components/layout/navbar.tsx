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
            <section className="flex min-w-0 items-center gap-2 justify-self-start">
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
                
                {(user?.user_organization?.unique_name || user?.org_name) && (
                  <div className="flex items-center gap-2 text-xs text-gray-400 font-medium">
                    <span className="text-gray-300 dark:text-gray-600">|</span>
                    <div className="flex items-center gap-1.5 min-w-0">
                      {(user?.user_organization?.logo_url || user?.org_logo_url) && (
                        <Image
                          src={user?.user_organization?.logo_url || user?.org_logo_url!}
                          alt={user?.user_organization?.unique_name || user?.org_name || "Org"}
                          width={16}
                          height={16}
                          className="h-4 w-4 rounded-sm object-contain shrink-0"
                        />
                      )}
                      <span className="text-gray-600 dark:text-gray-300 truncate max-w-[140px]">
                        {user?.user_organization?.unique_name || user?.org_name}
                      </span>
                    </div>
                  </div>
                )}
              </Link>
            </section>

            {/* Right: Docs, Theme, Notifications, Avatar */}
            <section className="flex shrink-0 items-center justify-end gap-2 md:gap-3">
              {authenticated && user && (
                <>
                  <div className="hidden md:flex items-center gap-3 mr-1">
                    <a href="#" className="text-xs font-medium text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors">
                      Docs
                    </a>
                    <a href="#" className="text-xs font-medium text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors">
                      Blog
                    </a>
                  </div>
                  
                  <div className="h-4 w-[1px] bg-gray-200 dark:bg-white/10 hidden md:block" />

                  <NotificationsLink
                    ariaLabel={t.nav.notifications}
                    surface="desktop"
                    className="h-6 w-6 !p-0 flex items-center justify-center rounded-md hover:bg-black/5 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300"
                  />

                  <button
                    type="button"
                    onClick={handleThemeToggle}
                    className="flex h-6 w-6 items-center justify-center rounded-md text-gray-600 hover:bg-black/5 hover:text-gray-900 transition-colors dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-white"
                    aria-label={t.navbar.theme}
                    title={t.navbar.theme}
                  >
                    {theme === "light" ? <Moon size={14} /> : <Sun size={14} />}
                  </button>

                  <button
                    onClick={() => { window.location.hash = '#settings/me'; }}
                    className="flex items-center gap-1.5 rounded-full pl-0.5 pr-2 py-0.5 hover:bg-black/5 transition-colors dark:hover:bg-white/10 border border-transparent hover:border-gray-200 dark:hover:border-white/10"
                  >
                    <div className="h-5 w-5 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center overflow-hidden">
                      {user.avatar_url ? (
                        <Image src={user.avatar_url} alt={user.user_name || "User"} width={20} height={20} className="object-cover" />
                      ) : (
                        <CircleUserRound className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                      )}
                    </div>
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-200 hidden sm:block truncate max-w-[120px]">
                      {user.username || user.user_name || "Account"}
                    </span>
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
