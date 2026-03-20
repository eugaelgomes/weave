"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/app/_contexts/auth-context";
import { useTheme } from "@/app/_contexts/theme-context";
import { useLanguage } from "@/app/_contexts/language-context";
import { FaBars, FaTimes } from "react-icons/fa";
import { IoPersonCircleSharp } from "react-icons/io5";
import { FiSun, FiMoon, FiSearch } from "react-icons/fi";
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

const UserAvatar = ({ user, size = "sm" }: { user: User; size?: "sm" | "md" | "lg" }) => {
  const sizeClasses = {
    sm: "h-8 w-8 sm:h-9 sm:w-9",
    md: "h-12 w-12",
    lg: "h-16 w-16",
  };

  return (
    <div
      className={`${sizeClasses[size]} relative flex-shrink-0 overflow-hidden rounded-md border-1 border-neutral-100 bg-neutral-100 transition-all duration-300 dark:border-neutral-700 dark:bg-neutral-800`}
    >
      {user?.avatar_url ? (
        <Image
          src={user.avatar_url}
          alt={`Avatar de ${user.user_name}`}
          fill
          className="object-cover ring-2 ring-neutral-400 transition-transform duration-300 hover:scale-105 dark:border-neutral-700"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
      ) : (
        <IoPersonCircleSharp className="h-full w-full text-neutral-400 dark:text-neutral-500" />
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

const MenuContent = ({ user, logout, onClose, onToggleTheme, theme, t }: MenuContentProps) => (
  <div className="flex flex-col overflow-hidden">
    <div className="flex items-center gap-4 border-b border-neutral-200 bg-transparent px-4 py-4 dark:border-neutral-800">
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

    {/* Links de Navegação */}
    <nav className="flex flex-col gap-1">
      <Link
        href="/app/settings"
        onClick={onClose}
        className="flex items-center rounded-md px-4 py-2.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-black/5 dark:text-neutral-300 dark:hover:bg-white/5"
      >
        Configurações da Conta
      </Link>

      <button
        onClick={onToggleTheme}
        className="flex w-full items-center justify-between rounded-md px-4 py-2.5 text-left text-sm font-medium text-neutral-700 transition-colors hover:bg-black/5 dark:text-neutral-300 dark:hover:bg-white/5"
        type="button"
      >
        <div className="flex items-center gap-2">
          {theme === "light" ? <FiMoon className="h-4 w-4" /> : <FiSun className="h-4 w-4" />}
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
        className="flex items-center rounded-md px-4 py-2.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-black/5 dark:text-neutral-300 dark:hover:bg-white/5"
      >
        Sobre o Sistema
      </a>

      <div className="my-1 h-px bg-black/5 dark:bg-white/5" />

      <button
        onClick={() => {
          logout();
          onClose();
        }}
        className="flex w-full items-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20"
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
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleThemeToggle = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    if (user) {
      updateUser({ theme_mode: newTheme }).catch((err) =>
        console.error("Erro ao salvar tema:", err)
      );
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (isMenuOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMenuOpen]);

  useEffect(() => {
    if (window.innerWidth < 640 && isMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
  }, [isMenuOpen]);

  return (
    <>
      <nav className="sticky top-0 z-40 w-full bg-neutral-50/90 backdrop-blur-md dark:border-neutral-800 dark:bg-neutral-950/90 print:hidden">
        <div className="mx-auto w-full max-w-[1920px] px-2 sm:px-2 lg:px-2">
          <div className="relative flex h-12 items-center justify-between">
            {/* Esquerdo */}
            <div className="flex items-center gap-3 sm:gap-5">
              {authenticated && (
                <button
                  onClick={onToggleSidebar}
                  className="flex h-10 w-10 items-center justify-center rounded-md text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 lg:hidden dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white"
                  aria-label="Abrir menu lateral"
                >
                  <FaBars className="h-5 w-5" />
                </button>
              )}

              <div className="flex items-center gap-2 sm:gap-3">
                {/* Link do Logo / App */}
                <Link
                  href={authenticated ? "/app/home" : "/"}
                  className="group flex items-center gap-2 outline-none sm:gap-3"
                  aria-label={t.nav.backToHome}
                >
                  <div className="relative flex h-9 items-center justify-center overflow-hidden rounded-md transition-transform group-hover:scale-105 group-active:scale-95">
                    <strong className="text-md sm:text-md rounded-md px-1 font-bold text-yellow-500">
                      Weave
                    </strong>
                  </div>
                </Link>

                {/* Área da Organização - Separada do Link principal */}
                {user?.org_id && (
                  <div className="animate-in fade-in flex items-center gap-2 duration-300 sm:gap-3">
                    {/* Separador Visual */}
                    <div
                      className="h-4 w-px bg-neutral-200 sm:h-5 dark:bg-neutral-800"
                      aria-hidden="true"
                    />

                    <div className="flex items-center">
                      <Link
                        href={`/app/organization/about/${user.org_id}`}
                        title={`Saiba mais sobre ${user.org_name}`}
                        className="group flex items-center gap-2 rounded-md transition-all duration-200 hover:opacity-80"
                      >
                        <div className="flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded bg-neutral-100 dark:bg-neutral-800">
                          <Image
                            src={user.org_logo_url || "/default-org-icon.png"}
                            alt={`Logo da ${user.org_name}`}
                            width={16}
                            height={16}
                            className="rounded-xs object-contain"
                          />
                        </div>

                        <span className="max-w-[100px] truncate text-xs font-medium text-neutral-700 transition-colors group-hover:text-yellow-600 sm:max-w-[160px] sm:text-sm md:max-w-none dark:text-neutral-300 dark:group-hover:text-yellow-500">
                          {user.org_name}
                        </span>
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Centro - Barra de Pesquisa */}
            {authenticated && user && (
              <div className="absolute left-1/2 hidden -translate-x-1/2 items-center md:flex">
                <button
                  onClick={() => setSearchOpen(true)}
                  className="group flex w-[350px] items-center gap-3 rounded-md border border-neutral-200 bg-neutral-100/50 px-1 py-0.5 transition-all hover:bg-neutral-100 hover:ring-2 hover:ring-yellow-500/20 dark:border-neutral-800 dark:bg-neutral-800/50 dark:hover:bg-neutral-800"
                  aria-label="Abrir busca"
                >
                  <FiSearch className="h-3 w-4 text-neutral-400 group-hover:text-yellow-500" />
                  <span className="flex-1 text-left text-xs text-neutral-500 dark:text-neutral-500">
                    Buscar notas, projetos, etc...
                  </span>
                  <div className="flex items-center gap-1 rounded border border-neutral-300 bg-neutral-50 px-1.5 py-0.5 text-[10px] font-medium text-neutral-400 dark:border-neutral-700 dark:bg-neutral-900">
                    <span className="text-[10px]">⌘</span>K
                  </div>
                </button>
              </div>
            )}

            {/* Lado direito*/}
            <div className="flex items-center gap-3">
              {authenticated && user && (
                <>
                  <button
                    onClick={() => setSearchOpen(true)}
                    className="flex h-9 w-9 items-center justify-center rounded-md text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 md:hidden dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white"
                    aria-label="Abrir busca"
                    title="Busca (Ctrl+K)"
                  >
                    <FiSearch className="h-5 w-5" />
                  </button>

                  <div className="relative" ref={menuRef}>
                    <button
                      type="button"
                      onClick={() => setMenuOpen(!isMenuOpen)}
                      aria-expanded={isMenuOpen}
                      className={`group flex items-center gap-3 rounded-md border border-transparent pl-3 transition-all duration-200 ${isMenuOpen ? "bg-neutral-100 dark:bg-neutral-800" : "hover:bg-neutral-50 dark:hover:bg-neutral-900/50"} `}
                    >
                      <div className="hidden flex-col items-end text-right sm:flex">
                        <span className="text-sm leading-none font-bold text-neutral-800 dark:text-neutral-200">
                          {formatters.getDisplayName(user, t.common.user)}
                        </span>
                        <span className="text-[9px] font-medium text-neutral-400">
                          @{formatters.getUsername(user, t.common.username)}
                        </span>
                      </div>
                      <UserAvatar user={user} size="sm" />
                    </button>

                    {/* Dropdown */}
                    {isMenuOpen && (
                      <div className="animate-in fade-in slide-in-from-top-2 absolute top-full right-0 z-50 mt-2 hidden w-80 origin-top-right duration-200 sm:block">
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

      {/* mobile modal */}
      {isMenuOpen &&
        mounted &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:hidden">
            <div
              className="absolute inset-0 bg-neutral-950/40 backdrop-blur-sm"
              onClick={() => setMenuOpen(false)}
            />

            <div
              className="relative z-10 flex w-full max-w-[90%] flex-col overflow-hidden rounded-md border border-neutral-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-neutral-900"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="max-h-[75vh] overflow-y-auto outline-none">
                <MenuContent
                  user={user!}
                  logout={logout}
                  onClose={() => setMenuOpen(false)}
                  onToggleTheme={handleThemeToggle}
                  theme={theme}
                  t={t}
                />
              </div>

              <div className="mt-2 border-t border-neutral-100 bg-neutral-50/50 p-3 dark:border-neutral-800 dark:bg-neutral-900/50">
                <button
                  type="button"
                  onClick={() => setMenuOpen(false)}
                  className="flex w-full items-center justify-center gap-2 rounded-md bg-neutral-200/50 py-3 text-sm font-bold text-neutral-700 active:scale-95 dark:bg-neutral-800 dark:text-neutral-200"
                >
                  <FaTimes /> {t.navbar.closeMenu}
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
