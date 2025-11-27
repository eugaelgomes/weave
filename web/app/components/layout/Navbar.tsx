"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/app/contexts/AuthContext";
import { FaBars, FaTimes } from "react-icons/fa";
import { IoPersonCircleSharp } from "react-icons/io5";

interface NavbarProps {
  onToggleSidebar?: () => void;
}

// Função para extrair o primeiro e último nome do usuário
const nameExtractor = (user: { [key: string]: unknown } | null | undefined) => {
  const name = user?.name;
  if (!name || typeof name !== "string" || !name.trim()) {
    return "Usuário";
  }
  const nomes = name.trim().split(" ");
  if (nomes.length === 1) {
    return nomes[0];
  }
  return `${nomes[0]} ${nomes[nomes.length - 1]}`;
};

// Menu de itens/rotas do usuário
const UserMenuItems = ({
  logout,
  onLinkClick,
}: {
  logout: () => void;
  onLinkClick?: () => void;
}) => (
  <>
    <Link
      href="/app/settings"
      onClick={onLinkClick}
      className="block px-4 py-2.5 text-sm font-medium text-neutral-300 transition-all hover:bg-neutral-800/50 hover:text-neutral-100"
    >
      Configurações
    </Link>
    <button
      onClick={() => {
        logout();
        onLinkClick?.();
      }}
      className="block w-full px-4 py-2.5 text-left text-sm font-medium text-red-400 transition-all hover:bg-red-500/10 hover:text-red-300"
    >
      Sair
    </button>
  </>
);

const Navbar = ({ onToggleSidebar }: NavbarProps) => {
  const { user, logout, authenticated } = useAuth();
  const [isUserMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const userName = nameExtractor(user);

  // Fechar menu ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const toggleUserMenu = () => {
    setUserMenuOpen(!isUserMenuOpen);
  };

  const closeUserMenu = () => {
    setUserMenuOpen(false);
  };

  return (
    <nav className="sticky top-0 z-30 border-b border-neutral-800/60 bg-neutral-950/95 shadow-lg backdrop-blur-md">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Mobile Menu Button + Logo */}
          <div className="flex items-center gap-3">
            {/* Hamburger Menu (Mobile) */}
            {authenticated && (
              <button
                onClick={onToggleSidebar}
                className="rounded-lg p-2 text-neutral-400 transition-all hover:bg-neutral-800/50 hover:text-neutral-100 lg:hidden"
                aria-label="Abrir menu"
              >
                <FaBars size={20} />
              </button>
            )}

            {/* Logo */}
            <Link
              href={authenticated ? "/app/home" : "/"}
              className="text-lg font-bold text-yellow-500 transition-colors hover:text-yellow-400 sm:text-xl"
            >
              <span className="hidden sm:inline">Weave Notes</span>
              <span className="sm:hidden">CW Notes</span>
            </Link>
          </div>

          {/* Right side - User menu or Login */}
          <div className="flex items-center">
            {authenticated && user ? (
              /* User Menu */
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={toggleUserMenu}
                  className="group flex items-center gap-3 rounded-lg p-2 transition-all hover:bg-neutral-800/50"
                  aria-label="Menu do usuário"
                >
                  {/* User Name (Hidden on small screens) */}
                  <span className="hidden text-sm font-semibold text-neutral-300 transition-colors group-hover:text-neutral-100 md:block">
                    {userName}
                  </span>

                  {/* Avatar */}
                  {user?.avatar_url && typeof user.avatar_url === "string" ? (
                    <div className="h-9 w-9 overflow-hidden rounded-full border-2 border-neutral-800 transition-all group-hover:border-yellow-500/50">
                      <Image
                        src={user.avatar_url}
                        alt={`Avatar de ${userName}`}
                        width={36}
                        height={36}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : (
                    <IoPersonCircleSharp className="h-9 w-9 text-neutral-500 transition-colors group-hover:text-yellow-500" />
                  )}
                </button>

                {/* User Dropdown Menu */}
                {isUserMenuOpen && (
                  <>
                    {/* Mobile Overlay */}
                    <div
                      className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm sm:hidden"
                      onClick={closeUserMenu}
                    />

                    {/* Desktop Dropdown */}
                    <div className="absolute right-0 z-50 mt-2 hidden w-72 overflow-hidden rounded-xl border border-neutral-800/60 bg-neutral-900/95 shadow-2xl backdrop-blur-md sm:block">
                      {/* User Info Header */}
                      <div className="border-b border-neutral-800/50 bg-neutral-950/50 px-4 py-4">
                        <div className="flex items-center gap-3">
                          {user?.avatar_url && typeof user.avatar_url === "string" ? (
                            <div className="h-12 w-12 overflow-hidden rounded-full border-2 border-neutral-800">
                              <Image
                                src={user.avatar_url}
                                alt={`Avatar de ${userName}`}
                                width={48}
                                height={48}
                                className="h-full w-full object-cover"
                              />
                            </div>
                          ) : (
                            <IoPersonCircleSharp className="h-12 w-12 text-neutral-500" />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-semibold text-neutral-100">
                              {String(user?.name || "Usuário")}
                            </p>
                            <p className="truncate text-sm text-neutral-500">
                              {String(user?.email || "")}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Menu Items */}
                      <div className="py-2">
                        <UserMenuItems logout={logout} onLinkClick={closeUserMenu} />
                      </div>
                    </div>

                    {/* Mobile Bottom Sheet */}
                    <div className="fixed right-0 bottom-0 left-0 z-50 rounded-t-2xl border-t border-neutral-800/60 bg-neutral-900/95 shadow-2xl backdrop-blur-md sm:hidden">
                      {/* Handle */}
                      <div className="flex justify-center py-3">
                        <div className="h-1 w-10 rounded-full bg-neutral-700"></div>
                      </div>

                      {/* User Info */}
                      <div className="px-6 pb-4">
                        <div className="mb-4 flex items-center gap-4">
                          {user?.avatar_url && typeof user.avatar_url === "string" ? (
                            <Image
                              src={user.avatar_url}
                              alt="Avatar"
                              width={64}
                              height={64}
                              className="h-16 w-16 rounded-full border-2 border-neutral-800 object-cover"
                            />
                          ) : (
                            <IoPersonCircleSharp className="h-16 w-16 text-neutral-500" />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-lg font-semibold text-neutral-100">
                              {String(user?.name || "Usuário")}
                            </p>
                            <p className="text-neutral-400">{String(user?.email || "")}</p>
                          </div>
                        </div>
                      </div>

                      {/* Menu Items */}
                      <div className="border-t border-neutral-800/50">
                        <UserMenuItems logout={logout} onLinkClick={closeUserMenu} />

                        {/* Close Button */}
                        <button
                          onClick={closeUserMenu}
                          className="flex w-full items-center justify-center gap-2 px-4 py-3 text-center text-neutral-400 transition-all hover:bg-neutral-800/50 hover:text-neutral-100"
                        >
                          <FaTimes size={16} />
                          Fechar
                        </button>
                      </div>

                      {/* Safe Area */}
                      <div className="pb-safe-area-inset-bottom"></div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link
                  href="/auth/signin"
                  className="rounded-lg bg-yellow-500/90 px-4 py-2 text-sm font-semibold text-neutral-950 transition-all hover:bg-yellow-500"
                >
                  Entrar
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
