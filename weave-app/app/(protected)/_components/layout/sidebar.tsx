"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/app/_contexts/auth-context";
import { useLanguage } from "@/app/_contexts/language-context";
import { useNotification } from "@/app/_contexts/notification-context";
import { useSafeAuthenticatedData } from "@/app/(protected)/_hooks/use-authenticated-data";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { isPathActive, getFirstNavigablePath } from "@/app/_utils/navigation";
import {
  Book,
  Home,
  Network,
  X,
  Frown,
  MessageSquare,
  ChevronRight,
  Bot,
  Users,
  UsersRound,
  ChevronsLeft,
  ChevronsRight,
  Waypoints,
  Calendar,
  Settings,
  Sparkles,
  Workflow,
  CircleHelp,
  type LucideIcon,
} from "lucide-react";

const SUPPORT_URL = `${process.env.NEXT_PUBLIC_APP_URL || "https://weavenotes.app"}/support/`;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SidebarProps {
  onLinkClick?: () => void;
  isCollapsed?: boolean;
  toggleCollapse?: () => void;
}

interface NavigationItem {
  path: string;
  icon: LucideIcon;
  label: string;
  subItems?: NavigationItem[];
  badge?: number;
}

// ---------------------------------------------------------------------------
// Shared class constants (inlined — too small to warrant a separate file)
// ---------------------------------------------------------------------------

const NAV_ROW_CLASS =
  "flex w-full min-w-0 items-center gap-0 rounded-md px-2 py-1 text-[13px] font-medium transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-brand-yellow/50 focus-visible:outline-none";

const NAV_ICON_RAIL_CLASS =
  "relative flex size-6 shrink-0 items-center justify-center";

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
          "flex w-full min-w-0 items-center gap-0 rounded-md font-medium transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-brand-yellow/50 focus-visible:outline-none",
          rowPadding,
          fontSize,
          isRoot && isCollapsed ? "justify-center px-1" : "",
          showActiveHighlight
            ? "bg-brand-yellow/10 text-brand-yellow"
            : "text-gray-700 hover:bg-black/5 dark:text-gray-300 dark:hover:bg-white/6",
        )}
      >
        <Link
          href={linkHref}
          onClick={onLinkClick}
          title={item.label}
          aria-label={item.label}
          className={cn(
            "group flex min-w-0 items-center",
            isRoot && isCollapsed ? "justify-center" : "flex-1",
            !isRoot && "gap-2.5",
          )}
        >
          {isRoot ? (
            /* Raiz: usa o icon-rail fixo para manter alinhamento no collapse */
            <span className={NAV_ICON_RAIL_CLASS}>
              <Icon
                className={cn(
                  iconSize,
                  "shrink-0 transition-colors",
                  active ? "text-brand-yellow" : "text-gray-800 dark:text-gray-400",
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
                "shrink-0 transition-colors",
                showActiveHighlight ? "text-brand-yellow" : "text-gray-800 dark:text-gray-400",
              )}
            />
          )}

          {isRoot ? (
            /* Raiz: label com animação collapse */
            <div
              className={cn(
                COLLAPSED_LABEL_CLASS,
                isCollapsed ? "pointer-events-none max-w-0 opacity-0" : "opacity-100",
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
            aria-label={isExpanded ? t.nav.collapseItem.replace("{label}", item.label) : t.nav.expandItem.replace("{label}", item.label)}
            className={cn(
              "focus-visible:ring-brand-yellow/50 shrink-0 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-black/5 hover:text-gray-700 focus-visible:ring-2 focus-visible:outline-none dark:text-gray-400 dark:hover:bg-white/6",
              isRoot ? "flex size-6" : "ml-1 flex size-5",
            )}
          >
            <ChevronRight
              className={cn(
                "shrink-0 transition-transform duration-200",
                isRoot ? "size-3.5" : "size-3",
                isExpanded ? "text-brand-yellow rotate-90" : "text-gray-500 dark:text-gray-400",
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
            SUB_LIST_PL_BY_DEPTH[Math.min(depth, SUB_LIST_PL_BY_DEPTH.length - 1)],
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
  recentItems: { type: string; id: string; title: string; icon: LucideIcon }[];
  pathname: string;
  onLinkClick: () => void;
  emptyLabel: string;
  sectionLabel: string;
}

function RecentItems({ recentItems, pathname, onLinkClick, emptyLabel, sectionLabel }: RecentItemsProps) {
  return (
    <div className="mt-3">
      <h2 className="mb-1.5 px-3 text-[9px] font-bold tracking-widest text-gray-600 uppercase dark:text-gray-500">
        {sectionLabel}
      </h2>

      <ul className="space-y-0 px-1">
        {recentItems.length === 0 ? (
          <li className="flex flex-col items-center justify-center gap-2 py-5 text-center text-xs text-gray-800 dark:text-gray-400">
            <Frown className="size-6 opacity-60" />
            <span className="text-xs">{emptyLabel}</span>
          </li>
        ) : (
          recentItems.map((item) => {
            const path = `/notes/${item.id}`;
            const active = isPathActive(pathname, path);
            const ItemIcon = item.icon;

            return (
              <li key={`${item.type}-${item.id}`}>
                <Link
                  href={path}
                  onClick={onLinkClick}
                  title={item.title}
                  className={cn(
                    "group flex items-center gap-2.5 rounded-md px-3 py-1 transition-all duration-200",
                    active
                      ? "bg-brand-yellow/10 text-brand-yellow"
                      : "text-gray-700 hover:bg-black/5 dark:text-gray-300 dark:hover:bg-white/6",
                  )}
                >
                  <ItemIcon
                    className={cn(
                      "h-3.5 w-3.5 shrink-0 transition-colors",
                      active ? "text-brand-yellow" : "text-gray-800 dark:text-gray-400",
                    )}
                  />
                  <span className="truncate text-[12px]">{item.title}</span>
                </Link>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SidebarFooter — link de ajuda
// ---------------------------------------------------------------------------

interface SidebarFooterProps {
  isCollapsed: boolean;
  helpLabel: string;
}

function SidebarFooter({ isCollapsed, helpLabel }: SidebarFooterProps) {
  return (
    <div className="shrink-0 px-1 pt-1 pb-1.5">
      <a
        href={SUPPORT_URL}
        target="_blank"
        rel="noopener noreferrer"
        title={helpLabel}
        aria-label={helpLabel}
        className={cn(
          NAV_ROW_CLASS,
          isCollapsed ? "justify-center px-1" : "",
          "focus-visible:ring-brand-yellow/50 text-gray-700 hover:bg-black/5 focus-visible:ring-2 focus-visible:outline-none dark:text-gray-300 dark:hover:bg-white/6",
        )}
      >
        <span className={NAV_ICON_RAIL_CLASS}>
          <CircleHelp className="size-4 shrink-0 text-gray-800 dark:text-gray-400" />
        </span>
        <span
          className={cn(
            COLLAPSED_LABEL_CLASS,
            isCollapsed ? "pointer-events-none max-w-0 opacity-0" : "opacity-100",
          )}
        >
          <span className="truncate">{helpLabel}</span>
        </span>
      </a>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sidebar — componente principal
// ---------------------------------------------------------------------------

const Sidebar = ({ onLinkClick, isCollapsed = true, toggleCollapse }: SidebarProps) => {
  const { authenticated } = useAuth();
  const { t } = useLanguage();
  const { unreadCount } = useNotification();
  const authData = useSafeAuthenticatedData();
  const pathname = usePathname();
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (isCollapsed) return;

    const newExpandedState: Record<string, boolean> = {};
    const itemsWithSubs = [
      { path: "/weave-ai/chat", checkPath: "/weave-ai" },
      { path: "/organization", checkPath: "/organization" },
      { path: "/organization/members", checkPath: "/organization/members" },
    ];

    itemsWithSubs.forEach(({ path, checkPath }) => {
      if (pathname.startsWith(checkPath)) {
        newExpandedState[path] = true;
      }
    });

    setExpandedItems((prev) => ({ ...prev, ...newExpandedState }));
  }, [pathname, isCollapsed]);

  const handleLinkClick = () => {
    onLinkClick?.();
  };

  const toggleExpandedItem = (path: string) => {
    setExpandedItems((prev) => ({ ...prev, [path]: !prev[path] }));
  };

  if (!authenticated || !authData) return null;

  const recentNotes = authData.notes.getRecentNotes().slice(0, 6);

  const recentItems = recentNotes.map((note) => ({
    type: "note" as const,
    id: note.id,
    title: note.title || t.common.untitled,
    icon: Book,
  }));

  const hasOrg = !!authData.user.org_id;

  const navigationItems: NavigationItem[] = [
    { path: "/home", icon: Home, label: t.nav.home },
    { path: "/notes", icon: Book, label: t.nav.notes },
    {
      path: "/projects",
      icon: Network,
      label: t.nav.projects,
    },
    {
      path: "/weave-flow",
      icon: Waypoints,
      label: t.nav.weaveFlow,
    },
    {
      path: "/weave-ai/chat",
      icon: Sparkles,
      label: t.nav.weaveAi,
      subItems: [
        { path: "/weave-ai/chat", icon: MessageSquare, label: t.nav.chat },
        { path: "/weave-ai/agent", icon: Bot, label: t.nav.agent },
      ],
    },
    {
      path: "/calendar",
      icon: Calendar,
      label: t.nav.calendar,
    },
    {
      path: "/notifications",
      icon: MessageSquare,
      label: t.nav.notifications,
      badge: unreadCount,
    },
    ...(hasOrg
      ? [
          {
            path: "/organization",
            icon: Users,
            label: t.nav.workspace,
            subItems: [
              { path: "/organization/settings", icon: Settings, label: t.nav.settingsLabel },
              {
                path: "/organization/members",
                icon: UsersRound,
                label: t.nav.members,
                subItems: [
                  { path: "/organization/members/list", icon: Users, label: t.nav.list },
                  {
                    path: "/organization/members/invites",
                    icon: MessageSquare,
                    label: t.nav.invites,
                  },
                ],
              },
              { path: "/organization/areas", icon: Workflow, label: t.nav.areas },
              { path: "/organization/projects", icon: Network, label: t.nav.projects },
            ],
          },
        ]
      : []),
    { path: "/settings", icon: Settings, label: t.nav.settingsLabel },
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col text-gray-700 transition-colors duration-300 dark:text-gray-300">
      {/* Header mobile */}
      <div className="flex items-center justify-between p-3 lg:hidden">
        <div className="flex items-center gap-2">
          <Book className="text-brand-yellow h-3.5 w-3.5" />
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
        {/* Toggle collapse: chevron fixed in same column as nav icon rail (desktop only). */}
        <div
          className={cn(
            "hidden shrink-0 items-center py-1 lg:flex",
            isCollapsed ? "justify-center px-1" : "px-2",
          )}
        >
          <div className={NAV_ICON_RAIL_CLASS}>
            {toggleCollapse ? (
              <button
                type="button"
                onClick={toggleCollapse}
                className="focus-visible:ring-brand-yellow/50 flex size-7 items-center justify-center rounded-md text-gray-700 transition-colors hover:bg-black/5 focus-visible:ring-2 focus-visible:outline-none dark:text-gray-300 dark:hover:bg-white/6"
                title={isCollapsed ? t.nav.expandMenu : t.nav.collapseMenu}
                aria-label={isCollapsed ? t.nav.expandMenu : t.nav.collapseMenu}
              >
                {isCollapsed ? <ChevronsRight size={14} /> : <ChevronsLeft size={14} />}
              </button>
            ) : null}
          </div>
          <div
            className={cn(
              COLLAPSED_LABEL_CLASS,
              isCollapsed ? "pointer-events-none max-w-0 opacity-0" : "opacity-100",
            )}
          >
            <h2 className="text-[9px] font-bold tracking-widest text-gray-600 uppercase dark:text-gray-500">
              {t.nav.menu}
            </h2>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-black/15 dark:[&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-track]:bg-transparent">
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

          {!isCollapsed && (
            <RecentItems
              recentItems={recentItems}
              pathname={pathname}
              onLinkClick={handleLinkClick}
              emptyLabel={t.common.empty}
              sectionLabel={t.nav.recentAccess}
            />
          )}
        </div>

        <SidebarFooter isCollapsed={isCollapsed} helpLabel={t.footer.help} />
      </div>
    </div>
  );
};

export default Sidebar;
