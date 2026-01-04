"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/app/contexts/AuthContext";
import { useTheme } from "@/app/contexts/ThemeContext";
import { FaBars, FaTimes } from "react-icons/fa";
import { IoPersonCircleSharp } from "react-icons/io5";
import { FiSun, FiMoon } from "react-icons/fi";
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
      className={`${sizeClasses[size]} relative flex-shrink-0 overflow-hidden rounded-md border border-neutral-200 bg-neutral-100 transition-all duration-300 dark:border-neutral-700 dark:bg-neutral-800`}
    >
      {user?.avatar_url ? (
        <Image
          src={user.avatar_url}
          alt={`Avatar de ${user.user_name}`}
          fill
          className="object-cover"
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
}

const MenuContent = ({ user, logout, onClose, onToggleTheme, theme }: MenuContentProps) => (
  <div className="flex flex-col overflow-hidden">
    {/* Header do Perfil */}
    <header className="flex items-center gap-4 border-b border-neutral-100 bg-neutral-50/80 px-6 py-5 dark:border-neutral-800 dark:bg-neutral-900/80">
      <UserAvatar user={user} size="md" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-bold text-neutral-900 dark:text-neutral-100">
          {user?.user_name || "Usuário"}
        </p>
        <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">
          @{formatters.getUsername(user)}
        </p>
      </div>
    </header>

    {/* Links de Navegação */}
    <nav className="flex flex-col gap-1 p-2">
      <Link
        href="/app/settings"
        onClick={onClose}
        className="flex items-center rounded-md px-4 py-2.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
      >
        Configurações da Conta
      </Link>

      <button
        onClick={onToggleTheme}
        className="flex w-full items-center justify-between rounded-md px-4 py-2.5 text-left text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
        type="button"
      >
        <div className="flex items-center gap-2">
          {theme === "light" ? <FiMoon className="h-4 w-4" /> : <FiSun className="h-4 w-4" />}
          <span>Aparência</span>
        </div>
        <span className="rounded-md bg-neutral-200 px-2 py-0.5 text-xs font-bold tracking-wider text-neutral-500 uppercase dark:bg-neutral-700 dark:text-neutral-400">
          {theme === "light" ? "Claro" : "Escuro"}
        </span>
      </button>

      <Link
        href="/about"
        onClick={onClose}
        className="flex items-center rounded-md px-4 py-2.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
      >
        Sobre o Sistema
      </Link>

      <div className="my-1 h-px bg-neutral-100 dark:bg-neutral-800" />

      <button
        onClick={() => {
          logout();
          onClose();
        }}
        className="flex w-full items-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
      >
        Sair da Conta
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
    <nav className="sticky top-0 z-40 w-full border-b border-neutral-200 bg-white/90 backdrop-blur-md dark:border-neutral-800 dark:bg-neutral-950/90 print:hidden">
      <div className="mx-auto w-full max-w-[1920px] px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* LADO ESQUERDO: Toggle Mobile + Logo */}
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

            <Link
              href={authenticated ? "/app/home" : "/"}
              className="group flex items-center gap-3 outline-none"
            >
              {/* App Logo */}
              <div className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-md bg-neutral-200 shadow-md transition-transform group-hover:scale-105 group-active:scale-95 dark:bg-neutral-800">
                <Image
                  src="/weave.png"
                  alt="Weave Logo"
                  fill
                  priority
                  className="object-cover p-0.5"
                />
              </div>

              {/* Organização (Aparece em MD+) */}
              {user?.org_unique_name && (
                <div className="animate-in fade-in hidden items-center gap-3 duration-300 md:flex">
                  <div className="h-5 w-px bg-neutral-200 dark:bg-neutral-800" />

                  <div className="flex items-center gap-2">
                    {user.org_logo_url && (
                      <div className="relative h-9 w-9 overflow-hidden rounded-md border border-neutral-100 dark:border-neutral-800">
                        <Image src={user.org_logo_url} alt="Org" fill className="object-cover" />
                      </div>
                    )}
                    <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                      {user.org_unique_name}
                    </span>
                  </div>
                </div>
              )}
            </Link>
          </div>

          {/* LADO DIREITO: User Actions */}
          <div className="flex items-center gap-3">
            {authenticated && user && (
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setMenuOpen(!isMenuOpen)}
                  aria-expanded={isMenuOpen}
                  className={`group flex items-center gap-3 rounded-md border border-transparent p-1 pl-3 transition-all duration-200 ${isMenuOpen ? "bg-neutral-100 dark:bg-neutral-800" : "hover:bg-neutral-50 dark:hover:bg-neutral-900/50"} `}
                >
                  <div className="hidden flex-col items-end text-right sm:flex">
                    <span className="text-sm leading-none font-bold text-neutral-800 dark:text-neutral-200">
                      {formatters.getDisplayName(user)}
                    </span>
                    <span className="text-[11px] font-medium text-neutral-400">
                      @{formatters.getUsername(user)}
                    </span>
                  </div>
                  <UserAvatar user={user} size="sm" />
                </button>

                {/* DROPDOWN (Desktop) */}
                {isMenuOpen && (
                  <div className="animate-in fade-in slide-in-from-top-2 absolute top-full right-0 z-50 mt-2 hidden w-80 origin-top-right duration-200 sm:block">
                    <div className="overflow-hidden rounded-md border border-neutral-200 bg-white shadow-2xl ring-1 ring-black/5 dark:border-neutral-800 dark:bg-neutral-900 dark:shadow-neutral-950/50">
                      <MenuContent
                        user={user}
                        logout={logout}
                        onClose={() => setMenuOpen(false)}
                        onToggleTheme={handleThemeToggle}
                        theme={theme}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MOBILE BOTTOM SHEET (Sobrepõe tudo) */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-[60] sm:hidden">
          {/* Overlay Escuro com Blur */}
          <div
            className="animate-in fade-in absolute inset-0 bg-neutral-950/60 backdrop-blur-sm transition-opacity duration-300"
            onClick={() => setMenuOpen(false)}
          />

          {/* Painel Deslizante */}
          <div className="animate-in slide-in-from-bottom absolute inset-x-0 bottom-0 flex flex-col rounded-md bg-white pb-6 shadow-[0_-8px_30px_rgba(0,0,0,0.12)] duration-300 dark:border-t dark:border-neutral-800 dark:bg-neutral-900">
            {/* Pega-mão visual */}
            <div className="mx-auto mt-3 h-1.5 w-12 rounded-md bg-neutral-200/80 dark:bg-neutral-700/50" />

            <div className="mt-2">
              <MenuContent
                user={user!}
                logout={logout}
                onClose={() => setMenuOpen(false)}
                onToggleTheme={handleThemeToggle}
                theme={theme}
              />
            </div>

            <div className="mt-4 px-6">
              <button
                onClick={() => setMenuOpen(false)}
                className="transition-active flex w-full items-center justify-center gap-2 rounded-md bg-neutral-100 py-3.5 text-sm font-bold text-neutral-600 active:scale-95 dark:bg-neutral-800 dark:text-neutral-300"
              >
                <FaTimes /> Fechar Menu
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
