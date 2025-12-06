"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "@/app/contexts/AuthContext";
import { usePathname } from "next/navigation";
import { FaBook, FaHome, FaProjectDiagram, FaTimes, FaGithub } from "react-icons/fa";
import { MdPersonAdd, MdInfo } from "react-icons/md";
import { IoMdSettings } from "react-icons/io";

interface SidebarProps {
  onLinkClick?: () => void;
}

const Sidebar = ({ onLinkClick }: SidebarProps) => {
  const { authenticated, user } = useAuth();
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path === "/app/notes" && pathname.startsWith("/app/notes")) return true;
    if (path === "/app/projects" && pathname.startsWith("/app/projects")) return true;
    if (path === "/app/community" && pathname.startsWith("/app/community")) return true;
    if (path === "/app/settings" && pathname.startsWith("/app/settings")) return true;
    return pathname === path;
  };

  const handleLinkClick = () => {
    if (onLinkClick) onLinkClick();
  };

  const navigationItems = [
    { path: "/app/home", icon: FaHome, label: "Início" },
    { path: "/app/notes", icon: FaBook, label: "Notas" },
    { path: "/app/projects", icon: FaProjectDiagram, label: "Projetos" },
    { path: "/app/community", icon: MdPersonAdd, label: "Comunidade" },
    { path: "/app/settings", icon: IoMdSettings, label: "Configurações" },
  ];

  if (!authenticated) return null;

  return (
    <aside className="flex h-full flex-col border-r border-neutral-800 bg-neutral-950">
      {/* Header Mobile - Super Compacto */}
      <div className="flex flex-shrink-0 items-center justify-between border-b border-neutral-800 p-3 lg:hidden">
        <div className="flex items-center gap-2">
          <FaBook className="h-4 w-4 text-yellow-500" />
          <h2 className="text-xs font-bold tracking-wider text-neutral-200 uppercase">Menu</h2>
        </div>
        <button
          title="Menu"
          onClick={handleLinkClick}
          className="text-neutral-400 hover:text-neutral-100"
        >
          <FaTimes size={16} />
        </button>
      </div>

      {/* Navigation - Lista Densa */}
      <nav className="flex-1 overflow-y-auto px-2 py-2">
        <ul className="space-y-0.5">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);

            return (
              <li key={item.path}>
                <Link
                  href={item.path}
                  onClick={handleLinkClick}
                  className={`flex items-center gap-2.5 rounded-md px-2.5 py-1.5 transition-colors duration-150 ${
                    active
                      ? "bg-yellow-500/10 text-yellow-500"
                      : "text-neutral-400 hover:bg-neutral-900 hover:text-neutral-200"
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 ${active ? "text-yellow-500" : "text-neutral-500 group-hover:text-neutral-300"}`}
                  />
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>

        {/* User Info - Minimalista */}
        <div className="mt-4 px-1">
          <div className="mb-4 h-px w-full bg-neutral-800" />
          <div className="flex items-center gap-2 rounded-md border border-neutral-800 bg-neutral-900/50 p-2">
            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded bg-neutral-800 text-xs font-bold text-neutral-300">
              {user?.name?.charAt(0).toUpperCase() || "U"}
            </div>
            <div className="min-w-0 overflow-hidden">
              <p className="truncate text-xs font-medium text-neutral-300">
                {user?.username || "Usuário"}
              </p>
              <p className="truncate text-[10px] text-neutral-500">{user?.email}</p>
            </div>
          </div>
        </div>
      </nav>

      {/* Footer Links - Botões pequenos */}
      <div className="flex-shrink-0 border-t border-neutral-800 p-2">
        <div className="flex gap-1">
          <Link
            href="https://github.com/eugaelgomes/notes-web-app"
            target="_blank"
            className="flex flex-1 items-center justify-center gap-1.5 rounded bg-neutral-900 py-1.5 text-[10px] font-medium text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-neutral-200"
          >
            <FaGithub className="h-3 w-3" />
            <span>Github</span>
          </Link>
          <Link
            href="/about"
            className="flex flex-1 items-center justify-center gap-1.5 rounded bg-neutral-900 py-1.5 text-[10px] font-medium text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-neutral-200"
          >
            <MdInfo className="h-3 w-3" />
            <span>Sobre</span>
          </Link>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
