"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/app/_contexts/auth-context";
import { useTheme } from "@/app/_contexts/theme-context";
import { useLanguage } from "@/app/_contexts/language-context";
import {
  Menu,
  X,
  Sun,
  Moon,
  Search,
  CircleUserRound,
} from "lucide-react";
import { type User } from "@/app/_services/authentication/auth-service";
import SearchModal from "@/app/app/_components/ui/navbar/search-modal";

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

const UserAvatar = ({
  user,
  size = "sm",
}: {
  user: User;
  size?: "sm" | "md" | "lg";
}) => {
  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-12 w-12",
    lg: "h-16 w-16",
  };

  return (
    <div
      className={`${sizeClasses[size]} relative flex-shrink-0 overflow-hidden rounded-md border border-neutral-100 bg-neutral-100 transition-all duration-300 dark:border-neutral-700 dark:bg-neutral-800`}
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
          className="h-full w-full text-neutral-400 dark:text-neutral-500"
          strokeWidth={1.5}
        />
      )}
    </div>
  );
};

interface MenuContentProps {
  user: User;
  logout: () => void;
  onClose: () => void;
  onToggleTheme: () => void;
  theme: string;
  t: ReturnType<typeof useLanguage>["t"];
}

const MenuContent = ({
  user,
  logout,
  onClose,
  onToggleTheme,
  theme,
  t,
}: MenuContentProps) => (
  <div className="flex flex-col overflow-hidden">
    <div className="flex items-center gap-4 border-b border-neutral-200 px-4 py-4 dark:border-neutral-800">
      <UserAvatar user={user} size="md" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-bold text-neutral-900 dark:text-neutral-100">
          {user?.user_name || t.common.user}
        </p>
        <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">
          @{formatters.getUsername(user, t.common.username)}
        </p>
      </div>
    </div>

    <nav className="flex flex-col gap-1 p-2">
      <Link
        href="/app/settings"
        onClick={onClose}
        className="rounded-md px-4 py-3 text-sm font-medium text-neutral-700 hover:bg-black/5 dark:text-neutral-300 dark:hover:bg-white/5"
      >
        Configurações da Conta
      </Link>

      <button
        onClick={onToggleTheme}
        className="flex w-full items-center justify-between rounded-md px-4 py-3 text-left text-sm font-medium text-neutral-700 hover:bg-black/5 dark:text-neutral-300 dark:hover:bg-white/5"
        type="button"
      >
        <div className="flex items-center gap-2">
          {theme === "light" ? (
            <Moon className="h-4 w-4" strokeWidth={1.8} />
          ) : (
            <Sun className="h-4 w-4" strokeWidth={1.8} />
          )}
          <span>{t.navbar.theme}</span>
        </div>
        <span className="rounded-md bg-black/5 px-2 py-0.5 text-xs font-bold tracking-wider text-neutral-500 uppercase dark:bg-white/10 dark:text-neutral-300">
          {theme === "light" ? t.navbar.light : t.navbar.dark}
        </span>
      </button>

      <a
        href={process.env.NEXT_PUBLIC_BLOG_URL || "https://blog.weavenotes.app/about"}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onClose}
        className="rounded-md px-4 py-3 text-sm font-medium text-neutral-700 hover:bg-black/5 dark:text-neutral-300 dark:hover:bg-white/5"
      >
        Sobre o Sistema
      </a>

      <div className="my-1 h-px bg-black/5 dark:bg-white/5" />

      <button
        onClick={() => {
          logout();
          onClose();
        }}
        className="w-full rounded-md px-4 py-3 text-left text-sm font-semibold text-red-600 hover:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20"
        type="button"
      >
        {t.navbar.logout}
      </button>
    </nav>
  </div>
);

const Navbar = ({ onToggleSidebar }: { onToggleSidebar?: () => void }) => {
  const { user, logout, authenticated, updateUser } = useAuth();
  const { theme, setTheme } = useTheme();
  const { t } = useLanguage();

  const [isMenuOpen, setMenuOpen] = useState(false);
  const [isSearchOpen, setSearchOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const desktopMenuRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);


    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        (desktopMenuRef.current && desktopMenuRef.current.contains(target)) ||
        (mobileMenuRef.current && mobileMenuRef.current.contains(target))
      ) {
        return;
      }
      setMenuOpen(false);
    };

    if (isMenuOpen) {
      document.addEventListener("pointerdown", handlePointerDown);
    }

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isMenuOpen]);

  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isMenuOpen]);

  const handleThemeToggle = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);

    if (user) {
      updateUser({ theme_mode: newTheme }).catch((err) =>
        console.error("Erro ao salvar tema:", err)
      );
    }
  };

  return (
    <>
      <nav className="sticky top-0 z-40 w-full bg-neutral-50/90 backdrop-blur-md dark:bg-neutral-950/90 print:hidden">
        <div className="mx-auto w-full max-w-[1920px] px-2">
          <div className="flex h-12 items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              {authenticated && (
                <button
                  onClick={onToggleSidebar}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 lg:hidden dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white"
                  aria-label="Abrir menu lateral"
                  type="button"
                >
                  <Menu className="h-5 w-5" strokeWidth={2} />
                </button>
              )}

              <Link
                href={authenticated ? "/app/home" : "/"}
                className="flex min-w-0 items-center"
                aria-label={t.nav.backToHome}
              >
                <span className="truncate text-base font-bold text-yellow-500 sm:text-lg">
                  Weave
                </span>
              </Link>

              {user?.org_id && (
                <div className="hidden items-center gap-2 sm:flex">
                  <div
                    className="h-4 w-px bg-neutral-200 dark:bg-neutral-800"
                    aria-hidden="true"
                  />
                  <Link
                    href={`/app/organization/about/${user.org_id}`}
                    title={`Saiba mais sobre ${user.org_name}`}
                    className="flex items-center gap-2 rounded-md transition-opacity hover:opacity-80"
                  >
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded bg-neutral-100 dark:bg-neutral-800">
                      <Image
                        src={user.org_logo_url || "/default-org-icon.png"}
                        alt={`Logo da ${user.org_name}`}
                        width={16}
                        height={16}
                        className="object-contain"
                      />
                    </div>
                    <span className="max-w-[120px] truncate text-sm font-medium text-neutral-700 dark:text-neutral-300">
                      {user.org_name}
                    </span>
                  </Link>
                </div>
              )}
            </div>

            {authenticated && user && (
              <div className="hidden flex-1 justify-center md:flex">
                <button
                  onClick={() => setSearchOpen(true)}
                  className="group flex w-full max-w-[360px] items-center gap-3 rounded-md border border-neutral-200 bg-neutral-100/50 px-2 py-1 transition-all hover:bg-neutral-100 hover:ring-2 hover:ring-yellow-500/20 dark:border-neutral-800 dark:bg-neutral-800/50 dark:hover:bg-neutral-800"
                  aria-label="Abrir busca"
                  type="button"
                >
                  <Search
                    className="h-4 w-4 text-neutral-400 group-hover:text-yellow-500"
                    strokeWidth={2}
                  />
                  <span className="flex-1 text-left text-sm text-neutral-500 dark:text-neutral-500">
                    Buscar notas, projetos...
                  </span>
                  <div className="flex items-center gap-1 rounded border border-neutral-300 bg-neutral-50 px-1.5 py-0.5 text-[10px] font-medium text-neutral-400 dark:border-neutral-700 dark:bg-neutral-900">
                    <span>⌘</span>K
                  </div>
                </button>
              </div>
            )}

            <div className="flex shrink-0 items-center gap-1">
              {authenticated && user && (
                <>
                  <button
                    onClick={() => setSearchOpen(true)}
                    className="flex h-10 w-10 items-center justify-center rounded-md text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 md:hidden dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white"
                    aria-label="Abrir busca"
                    type="button"
                  >
                    <Search className="h-5 w-5" strokeWidth={2} />
                  </button>

                  <div className="relative" ref={desktopMenuRef}>
                    <button
                      type="button"
                      onClick={() => setMenuOpen((prev) => !prev)}
                      aria-expanded={isMenuOpen}
                      aria-label="Abrir menu do usuário"
                      className={`flex items-center rounded-md p-1 transition-all duration-200 ${
                        isMenuOpen
                          ? "bg-neutral-100 dark:bg-neutral-800"
                          : "hover:bg-neutral-50 dark:hover:bg-neutral-900/50"
                      }`}
                    >
                      <div className="hidden lg:flex lg:flex-col lg:items-end lg:pr-3">
                        <span className="text-sm leading-none font-bold text-neutral-800 dark:text-neutral-200">
                          {formatters.getDisplayName(user, t.common.user)}
                        </span>
                        <span className="text-[10px] font-medium text-neutral-400">
                          @{formatters.getUsername(user, t.common.username)}
                        </span>
                      </div>
                      <UserAvatar user={user} size="sm" />
                    </button>

                    {isMenuOpen && (
                      <div className="absolute top-full right-0 z-50 mt-2 hidden w-80 origin-top-right sm:block">
                        <div className="overflow-hidden rounded-md border border-neutral-200 bg-neutral-50 shadow-2xl ring-1 ring-black/5 dark:border-neutral-800 dark:bg-neutral-900 dark:shadow-neutral-950/50">
                          <MenuContent
                            user={user}
                            logout={logout}
                            onClose={() => setMenuOpen(false)}
                            onToggleTheme={handleThemeToggle}
                            theme={theme}
                            t={t}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      <SearchModal isOpen={isSearchOpen} onClose={() => setSearchOpen(false)} />

      {isMenuOpen &&
        mounted &&
        createPortal(
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:hidden">
            <button
              type="button"
              aria-label="Fechar menu"
              className="absolute inset-0 bg-neutral-950/40 backdrop-blur-sm"
              onClick={() => setMenuOpen(false)}
            />

            <div
              ref={mobileMenuRef}
              className="relative z-[111] flex w-full max-w-[92%] flex-col overflow-hidden rounded-md border border-neutral-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-neutral-900"
            >
              <div className="max-h-[75vh] overflow-y-auto">
                <MenuContent
                  user={user!}
                  logout={logout}
                  onClose={() => setMenuOpen(false)}
                  onToggleTheme={handleThemeToggle}
                  theme={theme}
                  t={t}
                />
              </div>

              <div className="border-t border-neutral-100 bg-neutral-50/50 p-3 dark:border-neutral-800 dark:bg-neutral-900/50">
                <button
                  type="button"
                  onClick={() => setMenuOpen(false)}
                  className="flex w-full items-center justify-center gap-2 rounded-md bg-neutral-200/50 py-3 text-sm font-bold text-neutral-700 active:scale-95 dark:bg-neutral-800 dark:text-neutral-200"
                >
                  <X className="h-4 w-4" strokeWidth={2} />
                  {t.navbar.closeMenu}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};

export default Navbar;