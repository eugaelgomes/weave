"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/app/_contexts/auth-context";
import { useLanguage } from "@/app/_contexts/language-context";
import { cn } from "@/lib/utils";
import { isPathActive, SUPPORT_URL } from "@/app/_utils/navigation";
import {
  Home,
  MessageSquare,
  Bot,
  AudioLines,
  ImageIcon,
  SquareTerminal,
  KeyRound,
  TrendingUp,
  Logs,
  Braces,
  Database,
  Orbit,
  Settings,
  MoreHorizontal,
  PanelLeft,
  PanelLeftClose,
  UsersRound,
  ServerCog,
  HelpCircle,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types & Nav Items Definition
// ---------------------------------------------------------------------------

interface SidebarProps {
  onLinkClick?: () => void;
  isCollapsed?: boolean;
  toggleCollapse?: () => void;
}

interface NavItemConfig {
  id: string;
  label: string;
  icon: React.ElementType;
  path?: string;
  badge?: string;
  exact?: boolean;
  isMore?: boolean;
}

const NAV_ITEMS: NavItemConfig[] = [
  { id: "home", label: "Home", icon: Home, path: "/home", exact: true },
  { id: "chat", label: "Chat", icon: MessageSquare, path: "/chat" },
  { id: "agents", label: "Agents", icon: Bot, path: "/weave-ai/agents", badge: "New" },
  { id: "audio", label: "Audio", icon: AudioLines, path: "/weave-ai/audio" },
  { id: "images", label: "Images", icon: ImageIcon, path: "/weave-ai/images" },
  { id: "codex", label: "Codex", icon: SquareTerminal, path: "/weave-flow" },
  { id: "api-keys", label: "API Keys", icon: KeyRound, path: "/workspace/integrations" },
  { id: "usage", label: "Usage", icon: TrendingUp, path: "/workspace/plans" },
  { id: "logs", label: "Logs", icon: Logs, path: "/logs" },
  { id: "batches", label: "Batches", icon: Braces, path: "/batches" },
  { id: "storage", label: "Storage", icon: Database, path: "/documents" },
  { id: "plugins", label: "Plugins", icon: Orbit, path: "/weave-ai/tools" },
  { id: "settings", label: "Settings", icon: Settings, path: "/workspace/settings" },
  { id: "more", label: "More", icon: MoreHorizontal, isMore: true },
];

const MORE_OPTIONS = [
  { label: "Membros & Usuários", path: "/workspace/members/list", icon: UsersRound },
  { label: "Provedores & LLMs", path: "/weave-ai/llms", icon: ServerCog },
  { label: "Suporte & Docs", path: SUPPORT_URL, icon: HelpCircle, external: true },
];

// ---------------------------------------------------------------------------
// Sidebar Component
// ---------------------------------------------------------------------------

const Sidebar = ({ onLinkClick, isCollapsed = false, toggleCollapse }: SidebarProps) => {
  const { authenticated } = useAuth();
  const { t } = useLanguage();
  const pathname = usePathname();

  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const moreRef = useRef<HTMLLIElement>(null);

  // Click outside handler for "More" menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setIsMoreOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!authenticated) return null;

  return (
    <aside className="flex h-full min-h-0 w-full flex-1 flex-col bg-white text-neutral-800 transition-colors duration-200 select-none dark:bg-[#1d1d1b] dark:text-neutral-200">
      {/* ------------------------------------------------------------------- */}
      {/* 1. First Item: Expand / Collapse Button                            */}
      {/* ------------------------------------------------------------------- */}
      {toggleCollapse && (
        <div className={cn("shrink-0 pt-1 pb-0.5", isCollapsed ? "px-0" : "px-3")}>
          <button
            type="button"
            onClick={toggleCollapse}
            className={cn(
              "group flex h-8 w-full items-center rounded-md text-gray-700 transition-colors hover:bg-black/5 dark:text-gray-300 dark:hover:bg-white/10",
              isCollapsed && "justify-center"
            )}
            title={isCollapsed ? t.nav.expandMenu : t.nav.collapseMenu}
            aria-label={isCollapsed ? t.nav.expandMenu : t.nav.collapseMenu}
          >
            <span className="flex size-8 shrink-0 items-center justify-center text-black transition-colors dark:text-white">
              {isCollapsed ? (
                <PanelLeft className="size-[17px]" strokeWidth={2.1} />
              ) : (
                <PanelLeftClose className="size-[17px]" strokeWidth={2.1} />
              )}
            </span>
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* 2. Navigation Items List                                           */}
      {/* ------------------------------------------------------------------- */}
      <nav
        className={cn(
          "min-h-0 flex-1 overflow-x-hidden overflow-y-auto py-0.5",
          isCollapsed ? "px-0" : "[scrollbar-gutter:stable] px-3"
        )}
      >
        <ul className="space-y-0">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = item.path
              ? item.exact
                ? pathname === item.path || pathname === "/"
                : isPathActive(pathname, item.path)
              : false;

            // "More" special dropdown item
            if (item.isMore) {
              return (
                <li key={item.id} className="relative w-full" ref={moreRef}>
                  <button
                    type="button"
                    onClick={() => setIsMoreOpen((prev) => !prev)}
                    title={isCollapsed ? item.label : undefined}
                    className={cn(
                      "group flex h-8 w-full items-center rounded-md text-xs font-normal transition-colors select-none",
                      isCollapsed && "justify-center",
                      isMoreOpen
                        ? "bg-neutral-200/60 text-neutral-900 dark:bg-white/10 dark:text-white"
                        : "text-neutral-600 hover:bg-neutral-200/50 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-white/5 dark:hover:text-white"
                    )}
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center">
                      <Icon
                        className="size-[17px] shrink-0 text-black transition-colors dark:text-white"
                        strokeWidth={2.1}
                      />
                    </span>

                    <div
                      className={cn(
                        "flex min-w-0 flex-1 items-center justify-between overflow-hidden transition-[opacity,max-width] duration-200 ease-out",
                        isCollapsed
                          ? "pointer-events-none max-w-0 pr-0 opacity-0"
                          : "max-w-[180px] pr-2 opacity-100"
                      )}
                    >
                      <span className="truncate text-[13px] leading-none">{item.label}</span>
                    </div>
                  </button>

                  {/* More Dropdown Menu */}
                  {isMoreOpen && (
                    <div
                      className={cn(
                        "animate-in fade-in-50 zoom-in-95 absolute z-50 rounded-xl border border-neutral-200/80 bg-white/95 p-1 shadow-xl backdrop-blur-md dark:border-white/10 dark:bg-[#20201e]/95",
                        isCollapsed ? "top-0 left-full ml-2 w-48" : "bottom-full left-0 mb-1.5 w-52"
                      )}
                    >
                      <div className="space-y-0.5">
                        {MORE_OPTIONS.map((subItem) => {
                          const SubIcon = subItem.icon;
                          const isSubActive = !subItem.external && pathname === subItem.path;

                          if (subItem.external) {
                            return (
                              <a
                                key={subItem.path}
                                href={subItem.path}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() => setIsMoreOpen(false)}
                                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-neutral-600 transition-colors hover:bg-black/5 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-white/5 dark:hover:text-white"
                              >
                                <SubIcon
                                  className="size-3.5 shrink-0 text-black dark:text-white"
                                  strokeWidth={2}
                                />
                                <span className="truncate">{subItem.label}</span>
                              </a>
                            );
                          }

                          return (
                            <Link
                              key={subItem.path}
                              href={subItem.path}
                              onClick={() => {
                                setIsMoreOpen(false);
                                onLinkClick?.();
                              }}
                              className={cn(
                                "flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors",
                                isSubActive
                                  ? "bg-black/5 font-semibold text-neutral-900 dark:bg-white/10 dark:text-white"
                                  : "text-neutral-600 hover:bg-black/5 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-white/5 dark:hover:text-white"
                              )}
                            >
                              <SubIcon
                                className="size-3.5 shrink-0 text-black dark:text-white"
                                strokeWidth={2}
                              />
                              <span className="truncate">{subItem.label}</span>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </li>
              );
            }

            return (
              <li key={item.id} className="w-full">
                <Link
                  href={item.path || "#"}
                  onClick={onLinkClick}
                  title={isCollapsed ? item.label : undefined}
                  className={cn(
                    "group flex h-8 w-full items-center rounded-md text-xs transition-colors select-none",
                    isCollapsed && "justify-center",
                    active
                      ? "bg-neutral-200/70 font-medium text-neutral-900 dark:bg-white/10 dark:text-white"
                      : "text-neutral-600 hover:bg-neutral-200/50 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-white/5 dark:hover:text-white"
                  )}
                >
                  <span className="relative flex size-8 shrink-0 items-center justify-center">
                    <Icon
                      className="size-[17px] shrink-0 text-black transition-colors dark:text-white"
                      strokeWidth={2.1}
                    />

                    {/* Collapsed dot for badge */}
                    {isCollapsed && item.badge && (
                      <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-[#6941C6] ring-1 ring-white dark:bg-purple-400 dark:ring-[#18181b]" />
                    )}
                  </span>

                  <div
                    className={cn(
                      "flex min-w-0 flex-1 items-center justify-between overflow-hidden transition-[opacity,max-width] duration-200 ease-out",
                      isCollapsed
                        ? "pointer-events-none max-w-0 pr-0 opacity-0"
                        : "max-w-[180px] pr-2 opacity-100"
                    )}
                  >
                    <span className="truncate text-[13px] leading-none">{item.label}</span>
                    {item.badge && (
                      <span className="ml-auto rounded bg-[#ECE9FE] px-1.5 py-0.5 text-[9px] leading-none font-semibold text-[#6941C6] dark:bg-purple-900/40 dark:text-purple-300">
                        {item.badge}
                      </span>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* ------------------------------------------------------------------- */}
      {/* 4. Bottom Spacer                                                   */}
      {/* ------------------------------------------------------------------- */}
      <div className="shrink-0 p-1" />
    </aside>
  );
};

export default Sidebar;
