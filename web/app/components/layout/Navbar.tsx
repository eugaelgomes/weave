"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/app/contexts/AuthContext";
import { useTheme } from "@/app/contexts/ThemeContext"; // Importando o contexto de tema
import { FaBars, FaTimes } from "react-icons/fa";
import { IoPersonCircleSharp } from "react-icons/io5";
import { FiSun, FiMoon } from "react-icons/fi"; // Ícones do tema
import { type User } from "@/app/services/authentication/AuthService";

const formatters = {
  getDisplayName: (user: User) => {
    const name = user?.user_name?.trim() || "Usuário";
    const parts = name.split(" ");
    return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1]}` : parts[0];
  },
  getUsername: (user: User) => {
    return user?.username || user?.email?.split("@")[0] || "usuario";
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
      className={`${sizeClasses[size]} relative flex-shrink-0 overflow-hidden rounded-md border border-neutral-200 dark:border-neutral-700`}
    >
      {user?.avatar_url ? (
        <Image
          src={user.avatar_url}
          alt={`Avatar de ${user.user_name}`}
          fill
          className="object-cover"
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
}

const MenuContent = ({ user, logout, onClose, onToggleTheme, theme }: MenuContentProps) => (
  <div className="flex flex-col overflow-hidden">
    {/* Perfil Header */}
    <header className="flex items-center gap-4 border-b border-neutral-100 bg-neutral-50/50 px-6 py-4 dark:border-neutral-800 dark:bg-neutral-900/50">
      <UserAvatar user={user} size="md" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-bold text-neutral-900 dark:text-neutral-100">
          {user?.user_name || "Usuário"}
        </p>
        <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">{user?.email}</p>
      </div>
    </header>

    {/* Links de Navegação */}
    <nav className="p-2">
      <Link
        href="/app/settings"
        onClick={onClose}
        className="block rounded-md px-4 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
      >
        Configurações
      </Link>

      {/* Botão de Toggle Theme inserido no Menu */}
      <button
        onClick={onToggleTheme}
        className="flex w-full items-center gap-2 rounded-md px-4 py-2 text-left text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
        type="button"
      >
        {theme === "light" ? (
          <>
            <FiMoon className="h-4 w-4" /> <span>Modo Escuro</span>
          </>
        ) : (
          <>
            <FiSun className="h-4 w-4" /> <span>Modo Claro</span>
          </>
        )}
      </button>

      <Link
        href="/about"
        onClick={onClose}
        className="block rounded-md px-4 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
      >
        Sobre o sistema
      </Link>
      <div className="my-2 h-px bg-neutral-100 dark:bg-neutral-800" />
      <button
        onClick={() => {
          logout();
          onClose();
        }}
        className="flex w-full items-center px-4 py-2 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
      >
        Sair da conta
      </button>
    </nav>
  </div>
);

const Navbar = ({ onToggleSidebar }: { onToggleSidebar?: () => void }) => {
  const { user, logout, authenticated, updateUser } = useAuth();
  const { theme, setTheme } = useTheme();

  const [isMenuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleThemeToggle = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);

    if (user) {
      updateUser({ theme_mode: newTheme }).catch((err) => {
        console.error("Failed to save theme preference:", err);
      });
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMenuOpen]);

  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
  }, [isMenuOpen]);

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-neutral-200 bg-white/80 backdrop-blur-md dark:border-neutral-800 dark:bg-neutral-950/80">
      <div className="mx-auto max-w-[1440px] px-4">
        <div className="flex h-14 items-center justify-between">
          {/* Lado Esquerdo: Logo e Trigger Sidebar */}
          <div className="flex items-center gap-4">
            {authenticated && (
              <button
                onClick={onToggleSidebar}
                className="rounded-md p-2 text-neutral-500 hover:bg-neutral-100 lg:hidden dark:hover:bg-neutral-800"
                aria-label="Abrir menu lateral"
              >
                <FaBars className="h-5 w-5" />
              </button>
            )}

            <Link
              href={authenticated ? "/app/home" : "/"}
              className="group flex items-center gap-3 transition-transform active:scale-95"
            >
              <span className="rounded-md bg-yellow-500/50 px-2.5 py-2 text-xs font-black text-white">
                Weave
              </span>
              {user?.org_unique_name && (
                <>
                  <div className="h-4 w-px bg-neutral-300 dark:bg-neutral-700" />
                  <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                    {user.org_unique_name}
                  </span>
                </>
              )}
            </Link>
          </div>

          {/* Lado Direito: Actions e User Menu */}
          <div className="flex items-center gap-2 sm:gap-4">
            {authenticated && user && (
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setMenuOpen(!isMenuOpen)}
                  aria-expanded={isMenuOpen}
                  aria-haspopup="true"
                  className="flex items-center gap-3 rounded-md py-1 pr-1 pl-3 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  <div className="hidden flex-col items-end md:flex">
                    <span className="text-sm font-bold text-neutral-900 dark:text-neutral-200">
                      {formatters.getDisplayName(user)}
                    </span>
                    <span className="text-[10px] font-medium tracking-tight text-neutral-500 lowercase">
                      @{formatters.getUsername(user)}
                    </span>
                  </div>
                  <UserAvatar user={user} size="sm" />
                </button>

                {/* Dropdown Desktop */}
                {isMenuOpen && (
                  <div className="absolute right-0 mt-2 hidden w-72 origin-top-right rounded-md border border-neutral-200 bg-white shadow-2xl ring-1 ring-black/5 sm:block dark:border-neutral-800 dark:bg-neutral-900">
                    <MenuContent
                      user={user}
                      logout={logout}
                      onClose={() => setMenuOpen(false)}
                      onToggleTheme={handleThemeToggle}
                      theme={theme}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Menu Mobile (Bottom Sheet Style) */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-[60] sm:hidden">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-neutral-950/40 backdrop-blur-sm transition-opacity"
            onClick={() => setMenuOpen(false)}
          />

          {/* Sheet */}
          <div className="absolute inset-x-0 bottom-0 flex flex-col rounded-md bg-white pb-8 shadow-2xl transition-transform dark:bg-neutral-900">
            <div className="mx-auto my-3 h-1.5 w-12 rounded-md bg-neutral-200 dark:bg-neutral-800" />

            <MenuContent
              user={user!}
              logout={logout}
              onClose={() => setMenuOpen(false)}
              onToggleTheme={handleThemeToggle}
              theme={theme}
            />

            <div className="px-4">
              <button
                onClick={() => setMenuOpen(false)}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-md bg-neutral-100 py-4 text-sm font-bold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
              >
                <FaTimes /> Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
