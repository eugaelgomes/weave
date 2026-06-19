"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import Image from "next/image";
import { Menu, X, Sun, Moon, Search, CircleUserRound, Bell } from "lucide-react";

import { useAuth, type User } from "@/app/_contexts/auth-context";
import { useTheme } from "@/app/_contexts/theme-context";
import { useLanguage } from "@/app/_contexts/language-context";
import { useNotification } from "@/app/_contexts/notification-context";

import SearchModal from "@/app/(protected)/_components/ui/navbar/search-modal";
import { cn } from "@/lib/utils";

/** Mobile navbar icons — same language as collapsed sidebar rows (rounded-md, soft hover). */
const navIconMobileShellClass =
  "flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-gray-700 transition-colors hover:bg-black/5 active:bg-black/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-yellow/50 dark:text-white dark:hover:bg-white/10 dark:active:bg-white/[0.14] [&>svg]:shrink-0";

/** Desktop search + user chip: bordered surface (no shadow). */
const navbarElevatedSurfaceClass =
  "bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10";

// --- Custom Hooks

const useKeyboardShortcut = (key: string, callback: () => void) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === key.toLowerCase()) {
        e.preventDefault();
        callback();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [key, callback]);
};

const useClickOutside = (refs: React.RefObject<HTMLElement | null>[], callback: () => void) => {
  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      const isOutside = refs.every((ref) => ref.current && !ref.current.contains(target));

      if (isOutside) {
        callback();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [refs, callback]);
};

// --- Formatters ---

const formatters = {
  getDisplayName: (user: User, fallback: string) => {
    const name = user?.user_name?.trim() || fallback;
    const parts = name.split(" ");
    return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1]}` : parts[0];
  },
  getUsername: (user: User, fallback: string) => {
    return user?.username || user?.email?.split("@")[0] || fallback;
  },
};

// --- Sub-componentes ---

const UserAvatar = ({ user, size = "sm" }: { user: User; size?: "xs" | "sm" | "md" | "lg" }) => {
  const { t } = useLanguage();
  const sizeClasses = {
    xs: "h-[26px] w-[26px]",
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12",
  };

  return (
    <figure
      className={cn(
        sizeClasses[size],
        "relative flex-shrink-0 overflow-hidden rounded-full border border-gray-200/70 bg-gray-100 transition-all duration-300 dark:border-gray-700 dark:bg-gray-800"
      )}
      aria-label={t.navbar.avatarOf.replace("{name}", user?.user_name || t.common.user)}
    >
      {user?.avatar_url ? (
        <Image
          src={user.avatar_url}
          alt={t.navbar.avatarOf.replace("{name}", user.user_name || t.common.user)}
          fill
          className="rounded-full object-cover"
          sizes={size === "xs" ? "28px" : size === "sm" ? "32px" : size === "md" ? "40px" : "48px"}
        />
      ) : (
        <CircleUserRound
          className="h-full w-full text-gray-600 dark:text-gray-400"
          strokeWidth={1.5}
        />
      )}
    </figure>
  );
};

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

interface UserMenuProps {
  user: User;
  t: ReturnType<typeof useLanguage>["t"];
  onClose: () => void;
  onLogout: () => void;
}

const UserMenuContent = ({ user, t, onClose, onLogout }: UserMenuProps) => (
  <nav aria-label={t.navbar.userMenuNav} className="flex flex-col overflow-hidden">
    <header className="bg-brand-yellow/5 dark:border-surface-dark-border-strong flex items-center gap-3 border-b border-gray-200 px-4 py-3 dark:bg-[#1d1d1b]">
      <UserAvatar user={user} size="md" />
      <div className="min-w-0 flex-1">
        <p className="dark:text-brand-yellow truncate text-sm font-bold text-gray-900">
          {user?.user_name || t.common.user}
        </p>
        <p className="truncate text-[9px] font-medium text-gray-500 dark:text-gray-400">
          @{formatters.getUsername(user, t.common.username)}
        </p>
      </div>
    </header>

    <menu className="m-0 flex list-none flex-col gap-1 p-2">
      <li>
        <Link
          href={
            user?.org_public_id
              ? `/${user.org_public_id}/settings`
              : user?.public_id
                ? `/${user.public_id}/settings`
                : "/settings"
          }
          onClick={onClose}
          className="block rounded-md px-4 py-2.5 text-xs font-medium text-gray-900 hover:bg-black/5 dark:text-gray-100 dark:hover:bg-white/5"
        >
          {t.navbar.accountSettings}
        </Link>
      </li>

      <li>
        <a
          href={process.env.NEXT_PUBLIC_BLOG_URL || "https://blog.weavenotes.app/about"}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onClose}
          className="block rounded-md px-4 py-2.5 text-xs font-medium text-gray-900 hover:bg-black/5 dark:text-gray-100 dark:hover:bg-white/5"
        >
          {t.navbar.aboutSystem}
        </a>
      </li>

      <hr className="dark:border-surface-dark-border my-1 border-t border-gray-200" />

      <li>
        <button
          onClick={() => {
            onLogout();
            onClose();
          }}
          className="w-full rounded-md px-4 py-2.5 text-left text-xs font-semibold text-red-600 hover:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20"
        >
          {t.navbar.logout}
        </button>
      </li>
    </menu>
  </nav>
);

// --- Principal ---

interface NavbarProps {
  onToggleSidebar?: () => void;
  isCollapsed?: boolean;
}

const Navbar = ({ onToggleSidebar, isCollapsed = false }: NavbarProps) => {
  const { user, logout, authenticated, updateUser } = useAuth();
  const { theme, setTheme } = useTheme();
  const { t } = useLanguage();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const desktopMenuRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDialogElement>(null);

  useEffect(() => setMounted(true), []);

  useKeyboardShortcut("k", () => setIsSearchOpen(true));
  useClickOutside([desktopMenuRef, mobileMenuRef], () => setIsMenuOpen(false));

  useEffect(() => {
    document.body.style.overflow = isMenuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMenuOpen]);

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
          className="mx-auto w-full max-w-[1920px] px-1.5 pt-1 pb-0.5 sm:px-2 lg:px-2 lg:py-0 lg:pb-0"
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
                <div className="hidden w-full max-w-md items-center gap-2 md:flex">
                  <button
                    type="button"
                    onClick={() => setIsSearchOpen(true)}
                    className={cn(
                      "group flex w-full min-w-0 items-center gap-2.5 rounded-full bg-sky-800/5 px-3 py-1 transition-all hover:bg-sky-800/10 dark:bg-sky-800/10 dark:hover:bg-sky-800/15"
                    )}
                    aria-label={t.navbar.searchSystem}
                    title={t.navbar.searchSystem}
                  >
                    <Search
                      className="h-3.5 w-3.5 text-sky-800/70 transition-colors group-hover:text-sky-800 dark:text-sky-400/70 dark:group-hover:text-sky-400"
                      strokeWidth={1.75}
                    />
                    <span className="flex-1 text-left text-[11px] text-sky-800/80 dark:text-sky-300/80">
                      {t.navbar.searchPlaceholder}
                    </span>
                    <kbd className="items-bottom flex gap-1 rounded px-1.5 font-sans text-[10px] font-medium text-sky-800/60 dark:text-sky-400/60">
                      <span>⌘</span>K
                    </kbd>
                  </button>
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
                  <button
                    type="button"
                    onClick={() => setIsSearchOpen(true)}
                    className={cn(navIconMobileShellClass, "md:hidden")}
                    aria-label={t.navbar.openSearch}
                    title={t.navbar.openSearch}
                  >
                    <Search className="h-4 w-4" strokeWidth={1.75} />
                  </button>

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

                  <div className="relative self-center" ref={desktopMenuRef}>
                    <button
                      type="button"
                      onClick={() => setIsMenuOpen((prev) => !prev)}
                      aria-expanded={isMenuOpen}
                      aria-haspopup="menu"
                      aria-label={t.navbar.openUserMenu}
                      title={t.navbar.openUserMenu}
                      className="focus-visible:ring-brand-yellow/50 flex shrink-0 items-center justify-center rounded-full transition-opacity hover:opacity-85 focus-visible:ring-2 focus-visible:outline-none active:opacity-75"
                    >
                      <UserAvatar user={user} size="xs" />
                    </button>

                    {isMenuOpen && (
                      <div className="absolute top-full right-0 z-50 mt-2 hidden w-72 origin-top-right sm:block">
                        <div className="dark:border-surface-dark-border-strong overflow-hidden rounded-md border border-gray-200/60 bg-white dark:bg-[#1d1d1b]">
                          <UserMenuContent
                            user={user}
                            t={t}
                            onClose={() => setIsMenuOpen(false)}
                            onLogout={logout}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </section>
          </div>
        </nav>
      </header>

      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />

      {/* Modal Mobile */}
      {isMenuOpen &&
        mounted &&
        createPortal(
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:hidden">
            <div
              className="absolute inset-0 bg-neutral-950/40 backdrop-blur-sm"
              onClick={() => setIsMenuOpen(false)}
              aria-hidden="true"
            />

            <dialog
              ref={mobileMenuRef}
              open
              className="dark:border-surface-dark-border-strong relative z-[111] m-0 flex w-full max-w-[92%] flex-col overflow-hidden rounded-md border border-neutral-200 bg-white dark:bg-[#1d1d1b]"
            >
              <div className="max-h-[75vh] overflow-y-auto">
                <UserMenuContent
                  user={user!}
                  t={t}
                  onClose={() => setIsMenuOpen(false)}
                  onLogout={logout}
                />
              </div>

              <footer className="dark:border-surface-dark-border-strong border-t border-neutral-200 bg-white p-3 dark:bg-[#1d1d1b]">
                <button
                  onClick={() => setIsMenuOpen(false)}
                  className="flex w-full items-center justify-center gap-2 rounded-md bg-neutral-200/50 py-2.5 text-xs font-bold text-neutral-900 active:scale-95 dark:bg-neutral-800 dark:text-neutral-100"
                >
                  <X className="h-3.5 w-3.5" strokeWidth={2} />
                  {t.navbar.closeMenu}
                </button>
              </footer>
            </dialog>
          </div>,
          document.body
        )}
    </>
  );
};

export default Navbar;
