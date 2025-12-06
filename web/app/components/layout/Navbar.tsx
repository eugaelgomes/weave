"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/app/contexts/AuthContext";
import { FaBars, FaTimes } from "react-icons/fa";
import { IoPersonCircleSharp } from "react-icons/io5";
import { RxMix } from "react-icons/rx";

// --- Helpers & Sub-components ---

const getDisplayName = (user: any) => {
  const name = user?.name || "Usuário";
  const parts = name.trim().split(" ");
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1]}` : parts[0];
};

const UserAvatar = ({ user, size = "sm" }: { user: any; size?: "sm" | "md" | "lg" }) => {
  const sizeClasses = {
    sm: "h-8 w-8 sm:h-9 sm:w-9",
    md: "h-12 w-12",
    lg: "h-16 w-16",
  };

  const wrapperClass = `${sizeClasses[size]} overflow-hidden rounded-md border-2 border-neutral-800 flex-shrink-0`;

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

  return (
    <IoPersonCircleSharp
      className={`${sizeClasses[size]} text-neutral-500 transition-colors group-hover:text-yellow-500`}
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
    <div className="flex items-center gap-4 border-b border-neutral-800/50 bg-neutral-950/30 px-6 py-4">
      <UserAvatar user={user} size="md" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-neutral-100">{user?.name || "Usuário"}</p>
        <p className="truncate text-sm text-neutral-500">{user?.email}</p>
      </div>
    </div>

    {/* Ações/Botões */}
    <div className="p-2">
      <Link
        href="/app/settings"
        onClick={onClose}
        className="block rounded-md px-4 py-2.5 text-sm font-medium text-neutral-300 transition-colors hover:bg-neutral-800 hover:text-neutral-100"
      >
        Configurações
      </Link>
      <Link
        href="/about"
        onClick={onClose}
        className="block rounded-md px-4 py-2.5 text-sm font-medium text-neutral-300 transition-colors hover:bg-neutral-800 hover:text-neutral-100"
      >
        Sobre o app
      </Link>
      <button
        onClick={() => {
          logout();
          onClose();
        }}
        className="block w-full rounded-md px-4 py-2.5 text-left text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10 hover:text-red-300"
      >
        Sair
      </button>
    </div>
  </>
);

// --- Main Component ---

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
    <nav className="sticky top-0 z-50 w-full border-b border-neutral-800 bg-neutral-950/80 backdrop-blur-md">
      <div className="mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-10 items-center justify-between sm:h-14">
          {/* Left: Hamburger + Logo */}
          <div className="flex items-center gap-3">
            {authenticated && (
              <button
                title="toggle_icon"
                onClick={onToggleSidebar}
                className="rounded-md p-2 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100 lg:hidden"
              >
                <FaBars className="h-5 w-5" />
              </button>
            )}

            <Link
              href={authenticated ? "/app/home" : "/"}
              className="group flex items-center gap-3"
            >
              {/* Logo Mark Sutil */}
              <div className="text-yellow-500 transition-transform duration-500 group-hover:rotate-180">
                <RxMix className="h-5 w-5" />
              </div>

              {/* Divisor vertical */}
              <div className="h-4 w-px bg-neutral-800"></div>

              <span className="text-base font-semibold tracking-tight text-neutral-200">
                Weave Notes
              </span>
            </Link>
          </div>

          {/* Right: User Actions */}
          <div className="flex items-center gap-4">
            {authenticated && user ? (
              <div className="relative" ref={menuRef}>
                {/* Trigger Button */}
                <button
                  onClick={() => setMenuOpen(!isMenuOpen)}
                  className="group flex items-center gap-3 rounded-md border border-transparent p-1 transition-all hover:bg-neutral-900 focus:ring-2 focus:ring-neutral-800 focus:ring-offset-2 focus:ring-offset-neutral-950 focus:outline-none"
                >
                  <span className="hidden text-sm font-medium text-neutral-300 group-hover:text-neutral-100 md:block">
                    {getDisplayName(user)}
                  </span>
                  <UserAvatar user={user} size="sm" />
                </button>

                {/* Dropdowns / Modals */}
                {isMenuOpen && (
                  <>
                    {/* Desktop Dropdown */}
                    <div className="ring-opacity-5 absolute right-0 mt-2 hidden w-72 origin-top-right overflow-hidden rounded-md border border-neutral-800 bg-neutral-900 shadow-2xl ring-1 ring-black sm:block">
                      <MenuContent user={user} logout={logout} onClose={() => setMenuOpen(false)} />
                    </div>

                    {/* Mobile Bottom Sheet Backdrop */}
                    <div
                      className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm sm:hidden"
                      onClick={() => setMenuOpen(false)}
                    />

                    {/* Mobile Bottom Sheet */}
                    <div className="fixed right-0 bottom-0 left-0 z-50 rounded-md border-t border-neutral-800 bg-neutral-900 shadow-2xl sm:hidden">
                      <div className="flex justify-center py-3">
                        <div className="h-1 w-12 rounded-md bg-neutral-800" />
                      </div>

                      <MenuContent user={user} logout={logout} onClose={() => setMenuOpen(false)} />

                      <div className="px-4 pt-2 pb-6">
                        <button
                          onClick={() => setMenuOpen(false)}
                          className="flex w-full items-center justify-center gap-2 rounded-md bg-neutral-800 py-3 text-sm font-medium text-neutral-300 hover:bg-neutral-700 hover:text-white"
                        >
                          <FaTimes /> Fechar
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <Link
                href="/auth/signin"
                className="rounded-md bg-yellow-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-yellow-500"
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
