"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { UserAvatar } from "@/app/(protected)/_components/layout/user-menu";
import SettingsModal from "@/app/(protected)/_components/modals/settings/settings-modal";

import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/app/_contexts/auth-context";
import { useLanguage } from "@/app/_contexts/language-context";
import { useNotification } from "@/app/_contexts/notification-context";
import { useChat } from "@/app/_contexts/chat-context";
import { useModules } from "@/app/_contexts/modules-context";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  isPathActive,
  getFirstNavigablePath,
  SUPPORT_URL,
  type NavigationItem,
} from "@/app/_utils/navigation";
import { Fredoka } from "next/font/google";

const fredoka = Fredoka({
  subsets: ["latin"],
  weight: ["700"],
});
import {
  X,
  MessageCircle,
  NotebookPen,
  Folder,
  Bot,
  Workflow,
  Building2,
  Users,
  UserPlus,
  Layers,
  Puzzle,
  CreditCard,
  Sliders,
  Cpu,
  Wrench,
  Calendar,
  FileText,
  PanelLeftClose,
  PanelLeft,
  ChevronRight,
  Search,
  type LucideIcon,
} from "lucide-react";

const useKeyboardShortcut = (key: string, callback: () => void) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === key.toLowerCase()) {
        e.preventDefault();
        callback();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [key, callback]);
};

const useClickOutside = (refs: React.RefObject<HTMLElement | null>[], callback: () => void) => {
  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      const isOutside = refs.every((ref) => ref.current && !ref.current.contains(target));

      if (isOutside) {
        callback();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [refs, callback]);
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SidebarProps {
  onLinkClick?: () => void;
  isCollapsed?: boolean;
  toggleCollapse?: () => void;
}

// ---------------------------------------------------------------------------
// Shared class constants (inlined — too small to warrant a separate file)
// ---------------------------------------------------------------------------

const NAV_ROW_CLASS =
  "flex w-full min-w-0 items-center gap-0 rounded-md px-2 py-1 text-[13px] font-medium transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-brand-yellow/50 focus-visible:outline-none";

const NAV_ICON_RAIL_CLASS = "relative flex h-6 shrink-0 items-center justify-center";

const COLLAPSED_LABEL_CLASS =
  "flex min-h-0 min-w-0 flex-1 items-center gap-2 overflow-hidden transition-[opacity,max-width] duration-200 ease-out";

// ---------------------------------------------------------------------------
// Section Data Type
// ---------------------------------------------------------------------------
type NavigationSectionData = {
  title: string;
  items: NavigationItem[];
};

// ---------------------------------------------------------------------------
// NavItem — componente simplificado e achatado
// ---------------------------------------------------------------------------

interface NavItemProps {
  item: NavigationItem;
  pathname: string;
  isCollapsed: boolean;
  onLinkClick: () => void;
  t: ReturnType<typeof import("@/app/_contexts/language-context").useLanguage>["t"];
}

function NavItem({ item, pathname, isCollapsed, onLinkClick, t }: NavItemProps) {
  const Icon = item.icon;
  const linkHref = item.path;
  const active = isPathActive(pathname, item.path);

  return (
    <li>
      <div
        className={cn(
          "focus-visible:ring-brand-yellow/50 flex w-full min-w-0 items-center gap-0 rounded-md font-normal transition-colors duration-200 focus-visible:ring-2 focus-visible:outline-none",
          "px-2 py-0.5 text-[11px]",
          isCollapsed ? "justify-center px-0" : "",
          active
            ? "bg-black/5 font-medium text-slate-950 dark:bg-white/10 dark:text-white"
            : "text-gray-700 hover:bg-black/5 dark:text-gray-300 dark:hover:bg-white/6"
        )}
      >
        <Link
          href={linkHref}
          onClick={onLinkClick}
          title={item.label}
          aria-label={item.label}
          className={cn(
            "group flex min-w-0 flex-1 items-center",
            isCollapsed ? "w-full justify-center gap-0" : "gap-1.5"
          )}
        >
          <span
            className={cn(
              NAV_ICON_RAIL_CLASS,
              isCollapsed ? "w-full" : "w-4",
              "transition-transform duration-200 group-hover:scale-110"
            )}
          >
            <Icon
              className={cn(
                "size-3.5 shrink-0 transition-colors",
                active
                  ? "font-medium text-slate-950 dark:text-white"
                  : "text-gray-700 group-hover:text-slate-950 dark:text-gray-300 dark:group-hover:text-white"
              )}
            />
            {isCollapsed && item.badge !== undefined && item.badge > 0 ? (
              <span className="bg-brand-yellow absolute -top-0.5 -right-0.5 size-1.5 rounded-full ring-2 ring-white dark:ring-[#1d1d1b]" />
            ) : null}
          </span>

          {!isCollapsed && (
            <div className={COLLAPSED_LABEL_CLASS}>
              <span className="truncate">{item.label}</span>
              {item.badge !== undefined && item.badge > 0 ? (
                <span className="bg-brand-yellow ml-auto flex h-3.5 min-w-[16px] shrink-0 items-center justify-center rounded-full px-1 text-[9px] font-bold text-white">
                  {item.badge > 99 ? "99+" : item.badge}
                </span>
              ) : null}
            </div>
          )}
        </Link>
      </div>
    </li>
  );
}

// ---------------------------------------------------------------------------
// RecentItems — seção "Acesso recente"
// ---------------------------------------------------------------------------

interface RecentItemsProps {
  recentItems: {
    type: string;
    id: string;
    public_id?: string | null;
    title: string;
    icon?: React.ElementType<any>;
    projectIcon?: any;
    projectColor?: string | null;
    path?: string;
  }[];
  pathname: string;
  isCollapsed: boolean;
  onLinkClick: () => void;
  emptyLabel: string;
  sectionLabel: string;
}

function RecentItems({
  recentItems,
  pathname,
  isCollapsed,
  onLinkClick,
  emptyLabel,
  sectionLabel,
}: RecentItemsProps) {
  if (recentItems.length === 0) return null;

  return (
    <div className="mt-1.5 border-t border-gray-200/80 pt-1.5 dark:border-white/10">
      <ul className="space-y-0.5 px-1">
        {recentItems.slice(0, 5).map((item) => {
          const basePath = item.type === "project" ? "projects" : "notes";
          const path =
            item.path ||
            (pathname.startsWith("/")
              ? `/${pathname.split("/")[1]}/${basePath}/${item.public_id || item.id}`
              : `/${basePath}/${item.public_id || item.id}`);
          const active = isPathActive(pathname, path);
          const ItemIcon = item.icon;

          return (
            <li key={`${item.type}-${item.id}`}>
              <div
                className={cn(
                  "focus-visible:ring-brand-yellow/50 flex w-full min-w-0 items-center gap-0 rounded-md font-medium transition-colors duration-200 focus-visible:ring-2 focus-visible:outline-none",
                  "py-1 text-[13px]",
                  isCollapsed ? "justify-center px-0" : "px-2",
                  active
                    ? "bg-black/10 text-slate-950 dark:bg-white/10 dark:text-white"
                    : "text-gray-700 hover:bg-black/5 dark:text-gray-300 dark:hover:bg-white/6"
                )}
              >
                <Link
                  href={path}
                  onClick={onLinkClick}
                  title={item.title}
                  className={cn(
                    "group flex min-w-0 flex-1 items-center",
                    isCollapsed ? "w-full justify-center gap-0" : "gap-2"
                  )}
                >
                  <span
                    className={cn(
                      NAV_ICON_RAIL_CLASS,
                      isCollapsed ? "w-full" : "w-10",
                      "transition-transform duration-200 group-hover:scale-110"
                    )}
                  >
                    {ItemIcon ? (
                      <ItemIcon
                        className={cn(
                          "size-[18px] shrink-0 transition-colors",
                          active
                            ? "text-slate-950 dark:text-white"
                            : "text-gray-700 group-hover:text-slate-950 dark:text-gray-300 dark:group-hover:text-white"
                        )}
                      />
                    ) : null}
                  </span>
                  {!isCollapsed && (
                    <div className={COLLAPSED_LABEL_CLASS}>
                      <span className="truncate">{item.title}</span>
                    </div>
                  )}
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SidebarBottomActions
// ---------------------------------------------------------------------------

interface SidebarBottomActionsProps {
  isCollapsed: boolean;
  user: any;
  t: any;
  logout: () => void;
}

function SidebarBottomActions({ isCollapsed, user, t, logout }: SidebarBottomActionsProps) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    const handleHashChange = () => {
      const hash = window.location.hash;
      setIsSettingsOpen(hash.startsWith("#settings"));
    };

    handleHashChange();
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  return (
    <div className="flex shrink-0 flex-col gap-0.5 px-1 pt-1 pb-1.5">
      <div className="relative w-full">
        <button
          type="button"
          onClick={() => {
            window.location.hash = "#settings/me";
          }}
          title={t.navbar?.accountSettings || "Configurações"}
          aria-label={t.navbar?.accountSettings || "Configurações"}
          className={cn(
            NAV_ROW_CLASS,
            "group gap-2 px-2",
            "focus-visible:ring-brand-yellow/50 text-gray-700 hover:bg-black/5 focus-visible:ring-2 focus-visible:outline-none dark:text-gray-300 dark:hover:bg-white/6"
          )}
        >
          <span
            className={cn(
              NAV_ICON_RAIL_CLASS,
              "transition-transform duration-200 group-hover:scale-110"
            )}
          >
            <UserAvatar user={user} size="sm" />
          </span>
          <span
            className={cn(
              COLLAPSED_LABEL_CLASS,
              isCollapsed ? "pointer-events-none max-w-0 opacity-0" : "opacity-100"
            )}
          >
            <span className="truncate">{user?.user_name || t.common?.user || "Usuário"}</span>
          </span>
        </button>
      </div>

      {mounted && (
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => {
            window.history.replaceState(
              null,
              "",
              window.location.pathname + window.location.search
            );
            window.dispatchEvent(new HashChangeEvent("hashchange"));
            setIsSettingsOpen(false);
          }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sidebar — componente principal
// ---------------------------------------------------------------------------

const Sidebar = ({ onLinkClick, isCollapsed = true, toggleCollapse }: SidebarProps) => {
  const { authenticated, user, logout } = useAuth();
  const { t } = useLanguage();
  const { unreadCount } = useNotification();
  const pathname = usePathname();
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  const { chatHistory } = useChat();
  const { isModuleActive } = useModules();

  useEffect(() => {
    // No sub-items to expand currently
  }, [pathname, isCollapsed]);

  const handleLinkClick = () => {
    onLinkClick?.();
  };

  const toggleExpandedItem = (path: string) => {
    setExpandedItems((prev) => ({ ...prev, [path]: !prev[path] }));
  };

  if (!authenticated) return null;

  const hasOrg = !!user?.org_id;
  const orgPrefix = user?.org_public_id
    ? `/${user.org_public_id}`
    : user?.public_id
      ? `/${user.public_id}`
      : "";

  const navigationSections: NavigationSectionData[] = [
    {
      title: "AI Gateway",
      items: [
        { path: "/chat", icon: MessageCircle, label: "Chat" },
        isModuleActive("agent_house") && { path: "/weave-ai/agents", icon: Bot, label: "Agentes" },
        isModuleActive("agent_house") && { path: "/weave-ai/llms", icon: Cpu, label: "Provedores" },
        isModuleActive("agent_house") && {
          path: "/weave-ai/tools",
          icon: Wrench,
          label: "Ferramentas & MCP",
        },
        isModuleActive("weave_flow") && { path: "/weave-flow", icon: Workflow, label: "Flow" },
      ].filter(Boolean) as NavigationItem[],
    },
    {
      title: "Workspace",
      items: [
        hasOrg && { path: "/organization/general", icon: Building2, label: "Visão Geral" },
        hasOrg && { path: "/organization/members/list", icon: Users, label: "Membros & Usuários" },
        hasOrg && {
          path: "/organization/integrations",
          icon: Puzzle,
          label: "Integrações & Chaves API",
        },
        hasOrg && { path: "/organization/plans", icon: CreditCard, label: "Planos & Faturamento" },
        hasOrg && {
          path: "/organization/settings",
          icon: Sliders,
          label: "Configurações do Workspace",
        },
      ].filter(Boolean) as NavigationItem[],
    },
  ].filter(Boolean) as NavigationSectionData[];

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-white text-gray-700 transition-colors duration-300 dark:bg-[#1d1d1b] dark:text-gray-300">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden pt-1">
        {toggleCollapse && (
          <div className="shrink-0 px-1 py-0.5">
            <button
              type="button"
              onClick={toggleCollapse}
              className={cn(
                "flex h-7 w-full items-center rounded-md text-gray-700 transition-colors hover:bg-black/5 dark:text-gray-300 dark:hover:bg-white/10",
                isCollapsed ? "justify-center" : "px-2"
              )}
              title={isCollapsed ? t.nav.expandMenu : t.nav.collapseMenu}
              aria-label={isCollapsed ? t.nav.expandMenu : t.nav.collapseMenu}
            >
              <span
                className={cn(
                  "flex shrink-0 items-center justify-center text-gray-700 transition-colors dark:text-gray-300",
                  isCollapsed ? "w-full" : "w-4"
                )}
              >
                {isCollapsed ? (
                  <PanelLeft className="size-3.5" />
                ) : (
                  <PanelLeftClose className="size-3.5" />
                )}
              </span>
            </button>
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
          <div className="flex flex-col gap-5 px-1 pt-3 pb-1.5">
            {navigationSections.map(
              (section, idx) =>
                section &&
                section.items.length > 0 && (
                  <div key={idx} className="flex flex-col gap-1">
                    {!isCollapsed && (
                      <h3 className="px-2 text-[10px] font-semibold text-gray-400 dark:text-gray-500">
                        {section.title}
                      </h3>
                    )}
                    <ul className="space-y-0.5">
                      {section.items.map((item: NavigationItem) => (
                        <NavItem
                          key={item.path}
                          item={item}
                          pathname={pathname}
                          isCollapsed={isCollapsed}
                          onLinkClick={handleLinkClick}
                          t={t}
                        />
                      ))}
                    </ul>
                  </div>
                )
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
