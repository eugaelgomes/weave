"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/app/contexts/AuthContext";
import { FaBars, FaTimes } from "react-icons/fa";
import { IoPersonCircleSharp } from "react-icons/io5";
import { RxMix } from "react-icons/rx";
import { ThemeToggle } from "@/app/components/ui/theme-toggle";

const getDisplayName = (user: any) => {
  const name = user?.name || "Usuário";
  const parts = name.trim().split(" ");
  // Retorna primeiro e último nome
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1]}` : parts[0];
};

const getUserUsername = (user: any) => {
  if (user?.username) return user.username;
  if (user?.email) return user.email.split("@")[0];
  return "usuario";
};

const UserAvatar = ({ user, size = "sm" }: { user: any; size?: "sm" | "md" | "lg" }) => {
  const sizeClasses = {
    sm: "h-8 w-8 sm:h-9 sm:w-9",
    md: "h-12 w-12",
    lg: "h-16 w-16",
  };

  // Ajuste: Borda do avatar mais sutil, usando a cor de fundo do navbar no dark
  const wrapperClass = `${sizeClasses[size]} overflow-hidden rounded-md border-2 border-neutral-200 dark:border-neutral-700 flex-shrink-0`;

  if (user?.avatar_url && typeof user.avatar_url === "string") {
    return (
      <div className={wrapperClass}>
        <Image
          src={user.avatar_url}
          alt="Avatar"
          width={64}
          height={64}
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  // Ajuste: Cor do ícone
  return (
    <IoPersonCircleSharp
      className={`${sizeClasses[size]} text-neutral-400 transition-colors group-hover:text-yellow-500 dark:text-neutral-500`}
    />
  );
};

const MenuContent = ({
  user,
  logout,
  onClose,
}: {
  user: any;
  logout: () => void;
  onClose: () => void;
}) => (
  <>
    {/* Header */}
    {/* Ajuste: Fundo e borda mais limpos no light, e bom contraste no dark */}
    <div className="flex items-center gap-4 border-b border-neutral-100/50 bg-neutral-50/50 px-6 py-4 dark:border-neutral-800/50 dark:bg-neutral-900/50">
      <UserAvatar user={user} size="md" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-neutral-900 dark:text-neutral-100">
          {user?.name || "Usuário"}
        </p>
        <p className="truncate text-sm text-neutral-600 dark:text-neutral-500">{user?.email}</p>
      </div>
    </div>

    {/* Ações/Botões */}
    <div className="p-2">
      <Link
        href="/app/settings"
        onClick={onClose}
        // Ajuste: Cor e hover padronizados
        className="block rounded-md px-4 py-2.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
      >
        Configurações
      </Link>
      <Link
        href="/about"
        onClick={onClose}
        className="block rounded-md px-4 py-2.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
      >
        Sobre o app
      </Link>
      <button
        onClick={() => {
          logout();
          onClose();
        }}
        // Ajuste: Sair com hover vermelho mais contido (500/10)
        className="block w-full rounded-md px-4 py-2.5 text-left text-sm font-medium text-red-600 transition-colors hover:bg-red-500/10 dark:text-red-400 dark:hover:text-red-300"
      >
        Sair
      </button>
    </div>
  </>
);
interface NavbarProps {
  onToggleSidebar?: () => void;
}

const Navbar = ({ onToggleSidebar }: NavbarProps) => {
  const { user, logout, authenticated } = useAuth();
  const [isMenuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    // Ajuste: Cores de fundo Light/Dark mais consistentes
    <nav className="sticky top-0 z-50 w-full border-b border-neutral-200 bg-white/90 backdrop-blur-md dark:border-neutral-800 dark:bg-neutral-950/90">
      <div className="mx-auto px-4 sm:px-6 lg:pr-8">
        <div className="flex h-14 items-center justify-between sm:h-16">
          {/* Logo ou Menu */}
          <div className="flex items-center gap-4">
            {authenticated && (
              <button
                title="toggle_icon"
                onClick={onToggleSidebar}
                // Ajuste: Cores para o botão de menu mobile
                className="rounded-md p-2 text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900 lg:hidden dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
              >
                <FaBars className="h-5 w-5" />
              </button>
            )}

            <Link
              href={authenticated ? "/app/home" : "/"}
              className="group flex items-center gap-3"
            >
              {/* Logo */}
              <div className="text-yellow-500 transition-transform duration-500 group-hover:rotate-180">
                <RxMix className="h-8 w-8" />
              </div>

              {/* Divisor vertical */}
              {/* Ajuste: Cor do divisor Light/Dark */}
              <div className="h-5 w-px bg-neutral-300 dark:bg-neutral-700"></div>

              {/* Ajuste: Cor do nome do app */}
              <span className="text-lg font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
                Weave Notes
              </span>
            </Link>
          </div>

          {/* Exibição dos dados e botões*/}
          <div className="flex items-center gap-3">
            {authenticated && user ? (
              <>
                <ThemeToggle />
                <div className="relative" ref={menuRef}>
                  {/* Trigger Button */}
                  <button
                    onClick={() => setMenuOpen(!isMenuOpen)}
                    // Ajuste: Remoção de hover/focus complexos no botão para focar no conteúdo e avatar
                    className="group flex items-center justify-end gap-3 rounded-md pl-2 transition-all"
                  >
                    <div className="hidden flex-col items-end md:flex">
                      {/* Ajuste: Cores do nome e username */}
                      <span className="text-sm font-medium text-neutral-900 transition-colors group-hover:text-yellow-600 dark:text-neutral-200 dark:group-hover:text-yellow-500">
                        {getDisplayName(user)}
                      </span>
                      <span className="text-xs text-neutral-500 dark:text-neutral-500">
                        @{getUserUsername(user)}
                      </span>
                    </div>

                    <UserAvatar user={user} size="sm" />
                  </button>

                  {/* Dropdowns / Modals */}
                  {isMenuOpen && (
                    <>
                      {/* Desktop Dropdown */}
                      <div className="ring-opacity-5 absolute right-0 mt-2 hidden w-72 origin-top-right overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-xl ring-1 ring-black/5 sm:block dark:border-neutral-800 dark:bg-neutral-900 dark:ring-white/5">
                        <MenuContent
                          user={user}
                          logout={logout}
                          onClose={() => setMenuOpen(false)}
                        />
                      </div>

                      {/* Fundo backdrop */}
                      <div
                        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm sm:hidden"
                        onClick={() => setMenuOpen(false)}
                      />

                      {/* Botão mobile */}
                      <div className="fixed right-0 bottom-0 left-0 z-50 rounded-t-xl border-t border-neutral-300 bg-white shadow-2xl sm:hidden dark:border-neutral-700 dark:bg-neutral-900">
                        {/* Indicador de arrasto */}
                        <div className="flex justify-center py-3">
                          <div className="h-1 w-12 rounded-md bg-neutral-300 dark:bg-neutral-700" />
                        </div>

                        <MenuContent
                          user={user}
                          logout={logout}
                          onClose={() => setMenuOpen(false)}
                        />

                        <div className="px-4 pt-2 pb-6">
                          <button
                            onClick={() => setMenuOpen(false)}
                            className="flex w-full items-center justify-center gap-2 rounded-lg bg-neutral-100 py-3 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700 dark:hover:text-white"
                          >
                            <FaTimes /> Fechar
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </>
            ) : (
              <Link
                href="/auth/signin"
                // Ajuste: Botão de entrada com tema sólido de destaque
                className="rounded-md bg-yellow-500 px-4 py-2 text-sm font-semibold text-neutral-950 transition-colors hover:bg-yellow-600 dark:bg-yellow-500 dark:text-neutral-950 dark:hover:bg-yellow-400"
              >
                Entrar
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
