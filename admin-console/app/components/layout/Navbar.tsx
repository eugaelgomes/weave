"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useAuth } from "@/app/contexts/AuthContext";
import { FaBars } from "react-icons/fa";
import { IoPersonCircleSharp } from "react-icons/io5";
import { HiOutlineLogout } from "react-icons/hi";

interface NavbarProps {
  onToggleSidebar?: () => void;
}

const Navbar = ({ onToggleSidebar }: NavbarProps) => {
  const { user, logout } = useAuth();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <nav className="relative top-0 flex h-16 w-full items-center justify-between border-b border-yellow-500 bg-white px-6 shadow-sm transition-all">
      <div className="flex items-center gap-4">
        <button
          onClick={onToggleSidebar}
          className="rounded-lg p-2 text-yellow-500 transition-colors hover:bg-yellow-50 focus:outline-none focus:ring-2 focus:ring-yellow-500 lg:hidden"
          aria-label="Alternar Menu Lateral"
        >
          <FaBars className="h-6 w-6" />
        </button>

        <Link href="/" className="flex items-center gap-3 transition-transform hover:scale-105">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-yellow-500 text-lg font-bold text-white shadow-md">
            W
          </div>
          <span className="hidden text-xl font-extrabold tracking-wide text-yellow-500 sm:block">
            Admin Console
          </span>
        </Link>
      </div>

      <div className="flex items-center" ref={dropdownRef}>
        <button
          onClick={() => setIsProfileOpen(!isProfileOpen)}
          className="flex items-center gap-3 rounded-full border border-transparent p-1 pr-4 transition-all hover:border-yellow-200 hover:bg-yellow-50 focus:outline-none focus:ring-2 focus:ring-yellow-500"
          aria-expanded={isProfileOpen}
          aria-haspopup="true"
        >
          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-yellow-100 text-yellow-500">
            <IoPersonCircleSharp className="h-full w-full" />
          </div>
          <span className="hidden text-sm font-semibold text-yellow-600 md:block">
            {user?.name || "Administrador"}
          </span>
        </button>

        {isProfileOpen && (
          <div className="absolute right-4 top-16 mt-2 w-64 origin-top-right rounded-xl border border-yellow-200 bg-white shadow-lg ring-1 ring-yellow-500/10 focus:outline-none">
            <div className="border-b border-yellow-100 px-4 py-4">
              <p className="text-sm font-bold text-yellow-600">
                {user?.name || "Usuário Conectado"}
              </p>
              <p className="truncate text-xs font-medium text-yellow-500">
                {user?.email || "admin@weave.com"}
              </p>
            </div>
            <div className="p-2">
              <button
                onClick={logout}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
              >
                <HiOutlineLogout className="h-5 w-5" />
                Sair
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
