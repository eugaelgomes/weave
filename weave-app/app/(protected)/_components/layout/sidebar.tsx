"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import SearchModal from "@/app/(protected)/_components/ui/navbar/search-modal";
import { UserAvatar } from "@/app/(protected)/_components/layout/user-menu";
import SettingsModal from "@/app/(protected)/_components/modals/settings/settings-modal";

import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/app/_contexts/auth-context";
import { useLanguage } from "@/app/_contexts/language-context";
import { useNotification } from "@/app/_contexts/notification-context";
import { useProjects } from "@/app/_contexts/projects-context";
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
  Frown,
  MessageSquare,
  ChevronRight,
  Bot,
  Building2,
  Search,
  type LucideIcon,
} from "lucide-react";
import { ProjectIcon } from "@/app/(protected)/[orgId]/projects/_components/project-icon";
import { AiFredokaIcon } from "@/app/(protected)/_components/layout/icons/ai-fredoka-icon";
import { AnimatedHomeIcon } from "./icons/animated/AnimatedHomeIcon";
import { AnimatedNotesIcon } from "./icons/animated/AnimatedNotesIcon";
import { AnimatedProjectsIcon } from "./icons/animated/AnimatedProjectsIcon";
import { AnimatedFlowsIcon } from "./icons/animated/AnimatedFlowsIcon";
import { AnimatedSettingsIcon } from "./icons/animated/AnimatedSettingsIcon";

const SidebarToggleIcon = ({ className }: { className?: string }) => {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={cn("size-3.5", className)}
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M6 5a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h2V5H6Zm4 0v14h8a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1h-8ZM3 6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6Z"
        clipRule="evenodd"
      />
    </svg>
  );
};


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

const NAV_ICON_RAIL_CLASS = "relative flex w-10 h-6 shrink-0 items-center justify-center";

const COLLAPSED_LABEL_CLASS =
  "flex min-h-0 min-w-0 flex-1 items-center gap-2 overflow-hidden transition-[opacity,max-width] duration-200 ease-out";

// ---------------------------------------------------------------------------
// Depth-based style maps
// ---------------------------------------------------------------------------

/** Tamanhos de ícone por profundidade de aninhamento. */
const ICON_SIZE_BY_DEPTH = ["h-4 w-4", "size-3", "size-2.5"] as const;

/** Font-size da label por profundidade. */
const FONT_SIZE_BY_DEPTH = ["text-[13px]", "text-[12px]", "text-[11px]"] as const;

/** Padding do row por profundidade. */
const ROW_PADDING_BY_DEPTH = ["px-2 py-1", "px-2.5 py-1", "px-2.5 py-0.5"] as const;

/** Padding-left do wrapper <ul> por profundidade. */
const SUB_LIST_PL_BY_DEPTH = ["pl-7", "pl-4"] as const;

// ---------------------------------------------------------------------------
// NavItem — componente recursivo que substitui os 3 níveis manuais
// ---------------------------------------------------------------------------

interface NavItemProps {
  item: NavigationItem;
  depth: number;
  pathname: string;
  isCollapsed: boolean;
  expandedItems: Record<string, boolean>;
  onToggle: (path: string) => void;
  onLinkClick: () => void;
  t: ReturnType<typeof import("@/app/_contexts/language-context").useLanguage>["t"];
}

function NavItem({
  item,
  depth,
  pathname,
  isCollapsed,
  expandedItems,
  onToggle,
  onLinkClick,
  t,
}: NavItemProps) {
  const Icon = item.icon;
  const hasSubItems = !!item.subItems?.length;
  const subPaths = hasSubItems ? item.subItems!.map((s) => s.path) : undefined;
  const active = isPathActive(pathname, item.path, subPaths);
  const isExpanded = !isCollapsed && expandedItems[item.path];
  const linkHref = hasSubItems ? getFirstNavigablePath(item) : item.path;

  const isRoot = depth === 0;
  const iconSize = ICON_SIZE_BY_DEPTH[Math.min(depth, ICON_SIZE_BY_DEPTH.length - 1)];
  const fontSize = FONT_SIZE_BY_DEPTH[Math.min(depth, FONT_SIZE_BY_DEPTH.length - 1)];
  const rowPadding = ROW_PADDING_BY_DEPTH[Math.min(depth, ROW_PADDING_BY_DEPTH.length - 1)];

  // Só itens-folha (ou raiz) devem ter highlight de "ativo"
  const showActiveHighlight = active && (!hasSubItems || isRoot);

  return (
    <li>
      <div
        className={cn(
          "focus-visible:ring-brand-yellow/50 flex w-full min-w-0 items-center gap-0 rounded-md font-medium transition-colors duration-200 focus-visible:ring-2 focus-visible:outline-none",
          rowPadding,
          fontSize,
          showActiveHighlight
            ? "bg-black/10 text-slate-950 dark:bg-white/10 dark:text-white"
            : "text-gray-700 hover:bg-black/5 dark:text-gray-300 dark:hover:bg-white/6"
        )}
      >
        <Link
          href={linkHref}
          onClick={onLinkClick}
          title={item.label}
          aria-label={item.label}
          className={cn("group flex min-w-0 flex-1 items-center", isRoot ? "gap-2" : "gap-3")}
        >
          {isRoot ? (
            /* Raiz: usa o icon-rail fixo para manter alinhamento no collapse */
            <span className={cn(NAV_ICON_RAIL_CLASS, "transition-transform duration-200 group-hover:scale-110")}>
              <Icon
                className={cn(
                  iconSize,
                  "shrink-0 transition-colors",
                  active ? "text-slate-950 dark:text-white" : "text-slate-950 dark:text-white group-hover:text-slate-950"
                )}
              />
              {isCollapsed && item.badge !== undefined && item.badge > 0 ? (
                <span className="bg-brand-yellow absolute -top-0.5 -right-0.5 size-1.5 rounded-full ring-2 ring-white dark:ring-[#242422]" />
              ) : null}
            </span>
          ) : (
            /* Sub-itens: ícone inline simples */
            <Icon
              className={cn(
                iconSize,
                "shrink-0 transition-all duration-200 group-hover:scale-110",
                showActiveHighlight
                  ? "text-slate-950 dark:text-white"
                  : "text-gray-800 dark:text-white group-hover:text-slate-950"
              )}
            />
          )}

          {isRoot ? (
            /* Raiz: label com animação collapse */
            <div
              className={cn(
                COLLAPSED_LABEL_CLASS,
                isCollapsed ? "pointer-events-none max-w-0 opacity-0" : "opacity-100"
              )}
            >
              <span className="truncate">{item.label}</span>
              {item.badge !== undefined && item.badge > 0 ? (
                <span className="bg-brand-yellow ml-auto flex h-3.5 min-w-[16px] shrink-0 items-center justify-center rounded-full px-1 text-[9px] font-bold text-white">
                  {item.badge > 99 ? "99+" : item.badge}
                </span>
              ) : null}
            </div>
          ) : (
            /* Sub-itens: label simples */
            <span className="truncate">{item.label}</span>
          )}
        </Link>

        {/* Chevron expand/collapse */}
        {hasSubItems && !isCollapsed ? (
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onToggle(item.path);
            }}
            aria-label={
              isExpanded
                ? t.nav.collapseItem.replace("{label}", item.label)
                : t.nav.expandItem.replace("{label}", item.label)
            }
            className={cn(
              "group focus-visible:ring-brand-yellow/50 shrink-0 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-black/5 hover:text-gray-700 focus-visible:ring-2 focus-visible:outline-none dark:text-gray-400 dark:hover:bg-white/6",
              isRoot ? "flex size-6" : "ml-1 flex size-5"
            )}
          >
            <ChevronRight
              className={cn(
                "shrink-0 transition-transform duration-200 group-hover:scale-110",
                isRoot ? "size-3.5" : "size-3",
                isExpanded ? "text-brand-yellow rotate-90" : "text-gray-500 dark:text-gray-400"
              )}
            />
          </button>
        ) : null}
      </div>

      {/* Sub-items recursivos */}
      {!isCollapsed && hasSubItems && isExpanded && (
        <ul
          className={cn(
            "mt-0.5 space-y-0",
            SUB_LIST_PL_BY_DEPTH[Math.min(depth, SUB_LIST_PL_BY_DEPTH.length - 1)]
          )}
        >
          {item.subItems!.map((subItem) => (
            <NavItem
              key={subItem.path}
              item={subItem}
              depth={depth + 1}
              pathname={pathname}
              isCollapsed={isCollapsed}
              expandedItems={expandedItems}
              onToggle={onToggle}
              onLinkClick={onLinkClick}
              t={t}
            />
          ))}
        </ul>
      )}
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
        {recentItems.slice(0, 3).map((item) => {
          const basePath = item.type === "project" ? "projects" : "notes";
          const path = pathname.startsWith("/")
            ? `/${pathname.split("/")[1]}/${basePath}/${item.public_id || item.id}`
            : `/${basePath}/${item.public_id || item.id}`;
          const active = isPathActive(pathname, path);
          const ItemIcon = item.icon;

          return (
            <li key={`${item.type}-${item.id}`}>
              <div
                className={cn(
                  "focus-visible:ring-brand-yellow/50 flex w-full min-w-0 items-center gap-0 rounded-md font-medium transition-colors duration-200 focus-visible:ring-2 focus-visible:outline-none",
                  "px-2 py-1 text-[13px]",
                  active
                    ? "bg-black/10 text-slate-950 dark:bg-white/10 dark:text-white"
                    : "text-gray-700 hover:bg-black/5 dark:text-gray-300 dark:hover:bg-white/6"
                )}
              >
                <Link
                  href={path}
                  onClick={onLinkClick}
                  title={item.title}
                  className="group flex min-w-0 flex-1 items-center gap-2"
                >
                  <span className={cn(NAV_ICON_RAIL_CLASS, "transition-transform duration-200 group-hover:scale-110")}>
                    {item.projectIcon !== undefined ? (
                      <ProjectIcon icon={item.projectIcon} color={item.projectColor} size="sm" />
                    ) : ItemIcon ? (
                      <ItemIcon
                        className={cn(
                          "size-4 shrink-0 transition-colors",
                          active
                            ? "text-slate-950 dark:text-white"
                            : "text-gray-800 dark:text-white group-hover:text-slate-950"
                        )}
                      />
                    ) : null}
                  </span>
                  <div
                    className={cn(
                      COLLAPSED_LABEL_CLASS,
                      isCollapsed ? "pointer-events-none max-w-0 opacity-0" : "opacity-100"
                    )}
                  >
                    <span className="truncate">{item.title}</span>
                  </div>
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
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    const handleHashChange = () => {
      const hash = window.location.hash;
      setIsSettingsOpen(hash.startsWith('#settings'));
      setIsSearchOpen(hash.startsWith('#search'));
    };
    
    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useKeyboardShortcut("k", () => {
    window.location.hash = '#search';
  });

  return (
    <div className="shrink-0 px-1 pt-1 pb-1.5 flex flex-col gap-0.5">
      <button
        type="button"
        onClick={() => { window.location.hash = '#search'; }}
        title={t.navbar?.searchSystem || "Pesquisar"}
        aria-label={t.navbar?.searchSystem || "Pesquisar"}
        className={cn(
          NAV_ROW_CLASS,
          "group gap-2 px-2",
          "focus-visible:ring-brand-yellow/50 text-gray-700 hover:bg-black/5 focus-visible:ring-2 focus-visible:outline-none dark:text-gray-300 dark:hover:bg-white/6"
        )}
      >
        <span className={cn(NAV_ICON_RAIL_CLASS, "transition-transform duration-200 group-hover:scale-110")}>
          <Search className="size-4 shrink-0 transition-colors text-gray-800 dark:text-white group-hover:text-slate-950" />
        </span>
        <span
          className={cn(
            COLLAPSED_LABEL_CLASS,
            isCollapsed ? "pointer-events-none max-w-0 opacity-0" : "opacity-100"
          )}
        >
          <span className="truncate">{t.navbar?.searchSystem || "Pesquisar"}</span>
          {!isCollapsed && (
            <kbd className="ml-auto items-bottom flex gap-1 rounded px-1.5 font-sans text-[10px] font-medium text-gray-600 dark:text-gray-300">
              <span>⌘</span>K
            </kbd>
          )}
        </span>
      </button>

      <div className="relative w-full">
        <button
          type="button"
          onClick={() => { window.location.hash = '#settings/me'; }}
          title={t.navbar?.accountSettings || "Configurações"}
          aria-label={t.navbar?.accountSettings || "Configurações"}
          className={cn(
            NAV_ROW_CLASS,
            "group gap-2 px-2",
            "focus-visible:ring-brand-yellow/50 text-gray-700 hover:bg-black/5 focus-visible:ring-2 focus-visible:outline-none dark:text-gray-300 dark:hover:bg-white/6"
          )}
        >
          <span className={cn(NAV_ICON_RAIL_CLASS, "transition-transform duration-200 group-hover:scale-110")}>
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

      <SearchModal 
        isOpen={isSearchOpen} 
        onClose={() => {
          window.history.replaceState(null, "", window.location.pathname + window.location.search);
            window.dispatchEvent(new HashChangeEvent("hashchange"));
          setIsSearchOpen(false);
        }} 
      />
      
      {mounted && (
        <SettingsModal 
          isOpen={isSettingsOpen} 
          onClose={() => {
            window.history.replaceState(null, "", window.location.pathname + window.location.search);
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

  // Projects are global now.
  const projectsCtx = useProjects();
  const recentProjects = projectsCtx.getRecentProjects().slice(0, 5);

  const recentItems = recentProjects.map((proj: any) => ({
    type: "project" as const,
    id: proj.id,
    public_id: proj.public_id,
    title: proj.title || t.common.untitled,
    icon: AnimatedProjectsIcon,
    projectIcon: proj.icon,
    projectColor: proj.color,
  }));

  const hasOrg = !!user?.org_id;
  const orgPrefix = user?.org_public_id
    ? `/${user.org_public_id}`
    : user?.public_id
      ? `/${user.public_id}`
      : "";

  const navigationItems: NavigationItem[] = [
    { path: `${orgPrefix}/home`, icon: AnimatedHomeIcon, label: t.nav.home },
    {
      path: `${orgPrefix}/weave-ai/chat`,
      icon: AiFredokaIcon,
      label: t.nav.weaveAi,
    },
    { path: `${orgPrefix}/notes`, icon: AnimatedNotesIcon, label: t.nav.notes },
    {
      path: `${orgPrefix}/projects`,
      icon: AnimatedProjectsIcon,
      label: t.nav.projects,
    },
    {
      path: `${orgPrefix}/agent-house`,
      icon: Bot,
      label: "Agent House",
    },
    {
      path: `${orgPrefix}/weave-flow`,
      icon: AnimatedFlowsIcon,
      label: t.nav.weaveFlow,
    },
    ...(hasOrg
      ? [
          {
            path: `${orgPrefix}/organization/general`,
            icon: user.org_logo_url
              ? function OrgLogoIcon({ size, className, ...props }: any) {
                  return (
                    <Image
                      src={user.org_logo_url!}
                      alt={user.org_name || "Organization"}
                      width={size || 16}
                      height={size || 16}
                      className={cn("rounded object-contain", className)}
                      {...props}
                    />
                  );
                }
              : Building2,
            label: t.nav.workspace,
          },
        ]
      : []),
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col border-r border-gray-200/80 text-gray-700 transition-colors duration-300 dark:border-white/10 dark:text-gray-300">
      {/* Header mobile */}
      <div className="flex items-center justify-between p-3 lg:hidden">
        <div className="flex items-center gap-2">
          <Link
            href={`${orgPrefix}/home`}
            onClick={handleLinkClick}
            className="flex min-w-0 items-center px-1"
          >
            <span
              className={cn(
                "text-brand-yellow truncate text-base leading-none font-bold",
                fredoka.className
              )}
            >
              Weave
            </span>
          </Link>
        </div>
        <button
          type="button"
          onClick={handleLinkClick}
          className="rounded-md p-1.5 text-gray-700 hover:bg-black/5 dark:text-gray-300 dark:hover:bg-white/6"
          aria-label={t.nav.closeMenu}
          title={t.nav.closeMenu}
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="mt-3.5 mb-2 hidden w-full shrink-0 flex-col items-start lg:flex">
          <Link
            href={`${orgPrefix}/home`}
            className="flex min-w-0 items-center pl-2"
            onClick={handleLinkClick}
          >
            <span
              className={cn(
                "truncate text-base leading-none font-bold text-[#1D1D1B] dark:text-gray-300",
                fredoka.className
              )}
            >
              Weave
            </span>
          </Link>
        </div>

        <div className="hidden w-full shrink-0 items-center px-1 py-1 lg:flex">
          {toggleCollapse ? (
            <button
              type="button"
              onClick={toggleCollapse}
              className="focus-visible:ring-brand-yellow/50 flex h-8 w-full items-center rounded-md bg-black/5 px-2 text-gray-700 transition-colors hover:bg-black/10 focus-visible:ring-2 focus-visible:outline-none dark:bg-white/6 dark:text-gray-300 dark:hover:bg-white/10"
              title={isCollapsed ? t.nav.expandMenu : t.nav.collapseMenu}
              aria-label={isCollapsed ? t.nav.expandMenu : t.nav.collapseMenu}
            >
              <span className="flex w-10 shrink-0 items-center justify-center">
                <SidebarToggleIcon />
              </span>
            </button>
          ) : null}
        </div>

        <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
          <ul className="space-y-0.5 px-1 pt-0.5 pb-1.5">
            {navigationItems.map((item) => (
              <NavItem
                key={item.path}
                item={item}
                depth={0}
                pathname={pathname}
                isCollapsed={isCollapsed}
                expandedItems={expandedItems}
                onToggle={toggleExpandedItem}
                onLinkClick={handleLinkClick}
                t={t}
              />
            ))}
          </ul>

          <RecentItems
            recentItems={recentItems}
            pathname={pathname}
            isCollapsed={isCollapsed}
            onLinkClick={handleLinkClick}
            emptyLabel={t.common.empty}
            sectionLabel={t.nav.recentAccess}
          />
        </div>

        <SidebarBottomActions isCollapsed={isCollapsed} user={user} t={t} logout={logout} />
      </div>
    </div>
  );
};

export default Sidebar;
