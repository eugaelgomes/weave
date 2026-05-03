"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import Image from "next/image";
import { Fredoka } from "next/font/google";
import { Menu, X, Sun, Moon, Search, CircleUserRound, MessageSquare } from "lucide-react";

import { useAuth, type User } from "@/app/_contexts/auth-context";
import { useTheme } from "@/app/_contexts/theme-context";
import { useLanguage } from "@/app/_contexts/language-context";
import { useNotification } from "@/app/_contexts/notification-context";

import SearchModal from "@/app/(protected)/_components/ui/navbar/search-modal";
import { cn } from "@/lib/utils";

const fredoka = Fredoka({
  subsets: ["latin"],
  weight: ["700"],
});

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

const UserAvatar = ({ user, size = "sm" }: { user: User; size?: "sm" | "md" | "lg" }) => {
  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12",
  };

  return (
    <figure
      className={cn(
        sizeClasses[size],
        "relative flex-shrink-0 overflow-hidden rounded-md border border-neutral-100 bg-neutral-100 transition-all duration-300 dark:border-neutral-700 dark:bg-neutral-800"
      )}
      aria-label={`Avatar de ${user?.user_name || "Usuário"}`}
    >
      {user?.avatar_url ? (
        <Image
          src={user.avatar_url}
          alt={`Avatar de ${user.user_name}`}
          fill
          className="object-cover"
          sizes="64px"
        />
      ) : (
        <CircleUserRound
          className="h-full w-full text-neutral-600 dark:text-neutral-400"
          strokeWidth={1.5}
        />
      )}
    </figure>
  );
};

const NotificationsLink = ({ ariaLabel, className }: { ariaLabel: string; className?: string }) => {
  const { unreadCount } = useNotification();

  return (
    <Link
      href="/notifications"
      className={cn(
        "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-neutral-900 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800 dark:hover:text-neutral-100",
        className
      )}
      aria-label={ariaLabel}
    >
      <MessageSquare className="h-4 w-4" />
      {unreadCount > 0 && (
        <span className="bg-brand-primary-500 absolute top-1 right-1 flex h-3.5 min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-bold text-white">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </Link>
  );
};

interface UserMenuProps {
  user: User;
  theme: string;
  t: ReturnType<typeof useLanguage>["t"];
  onClose: () => void;
  onToggleTheme: () => void;
  onLogout: () => void;
}

const UserMenuContent = ({ user, theme, t, onClose, onToggleTheme, onLogout }: UserMenuProps) => (
  <nav aria-label="Menu do usuário" className="flex flex-col overflow-hidden">
    <header className="flex items-center gap-3 border-b border-neutral-200 px-4 py-3 dark:border-neutral-900">
      <UserAvatar user={user} size="md" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-neutral-900 dark:text-neutral-100">
          {user?.user_name || t.common.user}
        </p>
        <p className="truncate text-[8px] text-neutral-500 dark:text-neutral-400">
          @{formatters.getUsername(user, t.common.username)}
        </p>
      </div>
    </header>

    <menu className="m-0 flex list-none flex-col gap-1 p-2">
      <li>
        <Link
          href="/settings"
          onClick={onClose}
          className="block rounded-md px-4 py-2.5 text-xs font-medium text-neutral-900 hover:bg-black/5 dark:text-neutral-100 dark:hover:bg-white/5"
        >
          {t.navbar.accountSettings}
        </Link>
      </li>

      <li>
        <button
          onClick={onToggleTheme}
          className="flex w-full items-center justify-between rounded-md px-4 py-2.5 text-left text-xs font-medium text-neutral-900 hover:bg-black/5 dark:text-neutral-100 dark:hover:bg-white/5"
        >
          <div className="flex items-center gap-2">
            {theme === "light" ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
            <span>{t.navbar.theme}</span>
          </div>
          <span className="rounded-md bg-black/5 px-2 py-0.5 text-[10px] font-bold tracking-wider text-neutral-600 uppercase dark:bg-white/10 dark:text-neutral-400">
            {theme === "light" ? t.navbar.light : t.navbar.dark}
          </span>
        </button>
      </li>

      <li>
        <a
          href={process.env.NEXT_PUBLIC_BLOG_URL || "https://blog.weavenotes.app/about"}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onClose}
          className="block rounded-md px-4 py-2.5 text-xs font-medium text-neutral-900 hover:bg-black/5 dark:text-neutral-100 dark:hover:bg-white/5"
        >
          {t.navbar.aboutSystem}
        </a>
      </li>

      <hr className="my-1 border-t border-neutral-200 dark:border-neutral-800" />

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
}

const Navbar = ({ onToggleSidebar }: NavbarProps) => {
  const { user, logout, authenticated, updateUser } = useAuth();
  const { theme, setTheme } = useTheme();
  const { t } = useLanguage();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const desktopMenuRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

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
      <header className="sticky top-0 z-40 w-full backdrop-blur-md print:hidden">
        <nav className="mx-auto w-full max-w-[1920px] px-2" aria-label="Navegação principal">
          <div className="flex h-10 items-center justify-between gap-2 md:grid md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:items-center md:justify-normal md:gap-4">
            {/* Bloco Esquerdo: Logo e Organização */}
            <section className="flex min-w-0 items-center gap-2 justify-self-start">
              {authenticated && (
                <button
                  onClick={onToggleSidebar}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-neutral-900 transition-colors hover:bg-neutral-100 hover:text-neutral-900 lg:hidden dark:text-neutral-100 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
                  aria-label="Abrir menu lateral"
                >
                  <Menu className="h-4 w-4" strokeWidth={2} />
                </button>
              )}

              <Link
                href={authenticated ? "/home" : "/"}
                className="flex min-w-0 items-center"
                aria-label={t.nav.backToHome}
              >
                <span
                  className={cn(
                    "text-brand-primary-500 truncate text-sm font-bold sm:text-base",
                    fredoka.className
                  )}
                >
                  Weave Notes
                </span>
              </Link>

              {user?.org_id && (
                <div className="hidden items-center gap-2 sm:flex">
                  <div className="h-4 w-px bg-neutral-200 dark:bg-neutral-800" aria-hidden="true" />
                  <Link
                    href={`/organization/about/${user.org_id}`}
                    className="flex min-w-0 items-center gap-1.5 rounded-md transition-opacity hover:opacity-80"
                  >
                    <figure className="flex h-4 w-4 shrink-0 items-center justify-center overflow-hidden rounded">
                      <Image
                        src={user.org_logo_url || "/default-org-icon.png"}
                        alt={`Logo da ${user.org_name}`}
                        width={16}
                        height={16}
                        className="object-contain"
                      />
                    </figure>
                    <span className="max-w-[180px] truncate text-xs font-medium text-neutral-900 dark:text-neutral-100">
                      {user.org_name}
                    </span>
                  </Link>
                </div>
              )}
            </section>

            {/* Bloco Central: Busca (Desktop) */}
            {authenticated && user && (
              <section className="hidden min-w-0 items-center justify-center gap-2 justify-self-center md:flex">
                <button
                  onClick={() => setIsSearchOpen(true)}
                  className="group flex w-full max-w-[360px] items-center gap-2.5 rounded-md border border-neutral-200 bg-neutral-100/50 px-2 py-0.5 transition-all hover:bg-neutral-100 hover:ring-2 hover:ring-yellow-500/20 dark:border-neutral-900 dark:bg-neutral-800/50 dark:hover:bg-neutral-800"
                  aria-label="Pesquisar no sistema"
                >
                  <Search
                    className="h-3.5 w-3.5 text-neutral-900 group-hover:text-brand-primary-500 dark:text-neutral-100"
                    strokeWidth={2}
                  />
                  <span className="flex-1 text-left text-xs text-neutral-900/50 dark:text-neutral-100/50">
                    {t.navbar.searchPlaceholder}
                  </span>
                  <kbd className="flex items-center gap-1 px-1.5 font-sans text-[10px] font-medium text-neutral-600 dark:text-neutral-400">
                    <span>⌘</span>K
                  </kbd>
                </button>
                <NotificationsLink ariaLabel={t.nav.notifications} />
              </section>
            )}

            {/* Right */}
            <section className="flex shrink-0 items-center justify-end gap-1 justify-self-end md:gap-2">
              {authenticated && user && (
                <>
                  <button
                    onClick={() => setIsSearchOpen(true)}
                    className="flex h-10 w-10 items-center justify-center rounded-md text-neutral-900 transition-colors hover:bg-neutral-100 hover:text-neutral-900 md:hidden dark:text-neutral-100 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
                    aria-label="Abrir busca"
                  >
                    <Search className="h-4 w-4" strokeWidth={2} />
                  </button>

                  <NotificationsLink ariaLabel={t.nav.notifications} className="md:hidden" />

                  <div className="relative" ref={desktopMenuRef}>
                    <button
                      onClick={() => setIsMenuOpen((prev) => !prev)}
                      aria-expanded={isMenuOpen}
                      aria-haspopup="menu"
                      aria-label="Abrir menu do usuário"
                      className={cn(
                        "flex items-center rounded-md transition-all duration-200",
                        isMenuOpen
                          ? "bg-neutral-100 dark:bg-neutral-800"
                          : "hover:bg-neutral-50 dark:hover:bg-neutral-900/50"
                      )}
                    >
                      <div className="hidden lg:flex lg:flex-col lg:items-end lg:pr-3">
                        <span className="text-xs leading-none font-bold text-neutral-900 dark:text-neutral-100">
                          {formatters.getDisplayName(user, t.common.user)}
                        </span>
                        <span className="text-[10px] font-medium text-neutral-600 dark:text-neutral-400">
                          @{formatters.getUsername(user, t.common.username)}
                        </span>
                      </div>
                      <UserAvatar user={user} size="sm" />
                    </button>

                    {isMenuOpen && (
                      <div className="absolute top-full right-0 z-50 mt-2 hidden w-72 origin-top-right sm:block">
                        <div className="overflow-hidden rounded-md border border-neutral-200 bg-neutral-50 shadow-2xl ring-1 ring-black/5 dark:border-neutral-900 dark:bg-neutral-900 dark:shadow-neutral-950/50">
                          <UserMenuContent
                            user={user}
                            theme={theme}
                            t={t}
                            onClose={() => setIsMenuOpen(false)}
                            onToggleTheme={handleThemeToggle}
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
              className="relative z-[111] m-0 flex w-full max-w-[92%] flex-col overflow-hidden rounded-md border border-neutral-200 bg-white shadow-2xl dark:border-neutral-900 dark:bg-neutral-900"
            >
              <div className="max-h-[75vh] overflow-y-auto">
                <UserMenuContent
                  user={user!}
                  theme={theme}
                  t={t}
                  onClose={() => setIsMenuOpen(false)}
                  onToggleTheme={handleThemeToggle}
                  onLogout={logout}
                />
              </div>

              <footer className="border-t border-neutral-200 bg-neutral-50/50 p-3 dark:border-neutral-900 dark:bg-neutral-900/50">
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
