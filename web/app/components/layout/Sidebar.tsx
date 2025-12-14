"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "@/app/contexts/AuthContext";
import { useSafeAuthenticatedData } from "@/app/hooks/useAuthenticatedData";
import { usePathname } from "next/navigation";
import { FaBook, FaHome, FaProjectDiagram, FaTimes, FaGithub, FaRegSadTear } from "react-icons/fa";
import { MdPersonAdd, MdInfo } from "react-icons/md";
import { IoMdSettings } from "react-icons/io";

interface SidebarProps {
  onLinkClick?: () => void;
}

const Sidebar = ({ onLinkClick }: SidebarProps) => {
  const { authenticated } = useAuth();
  const authData = useSafeAuthenticatedData();
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path === "/app/home" && pathname === "/app/home") return true;
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

  if (!authenticated || !authData) return null;

  const recentNotes = authData.notes.getRecentNotes().slice(0, 5);
  const recentProjects = authData.projects.getRecentProjects().slice(0, 5);

  const recentItems = [
    ...recentNotes.map((note) => ({
      type: "note" as const,
      id: note.id,
      title: note.title || "Sem título",
      icon: FaBook,
    })),
    ...recentProjects.map((project) => ({
      type: "project" as const,
      id: project.id,
      title: project.title || "Sem nome",
      icon: FaProjectDiagram,
    })),
  ];

  return (
    <aside className="flex h-full flex-col border-r border-neutral-200 bg-white text-neutral-600 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-400">
      {/* Botão de Menu em telas pequenas */}
      <div className="flex flex-shrink-0 items-center justify-between border-b border-neutral-200 p-3 lg:hidden dark:border-neutral-800">
        <div className="flex items-center gap-2">
          <FaBook className="h-4 w-4 text-yellow-500" />
          <h2 className="text-xs font-bold tracking-wider text-neutral-500 uppercase dark:text-neutral-200">
            Menu
          </h2>
        </div>
        <button
          title="Menu"
          onClick={handleLinkClick}
          className="text-neutral-600 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
        >
          <FaTimes size={16} />
        </button>
      </div>

      <nav className="flex flex-1 flex-col overflow-y-auto px-2 py-4 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-neutral-800/50 hover:[&::-webkit-scrollbar-thumb]:bg-neutral-700 [&::-webkit-scrollbar-track]:bg-transparent">
        <h2 className="mb-2 px-2 text-[10px] font-bold tracking-wider text-yellow-500 uppercase">
          <span className="h-4 w-1 text-yellow-500"></span> Menu
        </h2>
        <ul className="space-y-0.5">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);

            return (
              <li key={item.path}>
                <Link
                  href={item.path}
                  onClick={handleLinkClick}
                  className={`group flex items-center gap-2.5 rounded-md px-2.5 py-1.5 transition-all duration-200 ${
                    active
                      ? "bg-yellow-500/10 font-medium text-yellow-500"
                      : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-neutral-200"
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 transition-colors ${
                      active
                        ? "text-yellow-500"
                        : "text-neutral-600 group-hover:text-neutral-900 dark:text-neutral-500 dark:group-hover:text-neutral-300"
                    }`}
                  />
                  <span className="text-sm">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Divisor entre as partes de menu e recentes*/}
        <div className="divisor my-4 h-0.5 w-full shrink-0 rounded-full bg-neutral-300 opacity-50 dark:bg-neutral-800 dark:opacity-20" />

        <div className="flex-1">
          <h2 className="mb-2 px-2 text-[10px] font-bold tracking-wider text-yellow-500 uppercase">
            Acesso Recente
          </h2>

          <ul className="space-y-0.5">
            {recentItems.length === 0 && (
              <li className="flex flex-col items-center justify-center gap-2 px-2.5 py-8 text-center text-sm text-neutral-500 dark:text-neutral-600">
                <FaRegSadTear className="h-5 w-5 opacity-50" />
                <span className="text-xs">Nada recente por aqui</span>
              </li>
            )}

            {recentItems.map((item) => {
              const path =
                item.type === "note"
                  ? `/app/notes/view/${item.id}`
                  : `/app/projects/view/${item.id}`;

              const isItemActive = pathname === path;
              const ItemIcon = item.icon;

              return (
                <li key={`${item.type}-${item.id}`}>
                  <Link
                    href={path}
                    onClick={handleLinkClick}
                    title={item.title}
                    className={`group flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-all duration-200 ${
                      isItemActive
                        ? "bg-neutral-800 text-neutral-200 shadow-sm ring-1 ring-neutral-700"
                        : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-neutral-200"
                    }`}
                  >
                    <ItemIcon
                      className={`h-3.5 w-3.5 flex-shrink-0 ${
                        isItemActive
                          ? "text-yellow-500"
                          : "text-neutral-600 group-hover:text-neutral-900 dark:text-neutral-600 dark:group-hover:text-neutral-400"
                      }`}
                    />
                    <span className="truncate text-neutral-700 dark:text-neutral-600">
                      {item.title}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>

      <div className="flex-shrink-0 border-t border-neutral-200 p-2 dark:border-neutral-800">
        <div className="flex gap-1">
          <Link
            href="https://github.com/eugaelgomes/notes-web-app"
            target="_blank"
            className="flex flex-1 items-center justify-center gap-1.5 rounded bg-neutral-200/50 py-1.5 text-[10px] font-medium text-neutral-600 transition-colors hover:bg-neutral-200 hover:text-neutral-900 dark:bg-neutral-900/50 dark:text-neutral-500 dark:hover:bg-neutral-900 dark:hover:text-neutral-300"
          >
            <FaGithub className="h-3 w-3" />
            <span>Github</span>
          </Link>
          <Link
            href="/about"
            className="flex flex-1 items-center justify-center gap-1.5 rounded bg-neutral-200/50 py-1.5 text-[10px] font-medium text-neutral-600 transition-colors hover:bg-neutral-200 hover:text-neutral-900 dark:bg-neutral-900/50 dark:text-neutral-500 dark:hover:bg-neutral-900 dark:hover:text-neutral-300"
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
