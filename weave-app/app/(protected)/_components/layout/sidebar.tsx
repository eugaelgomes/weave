"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/app/_contexts/auth-context";
import { useLanguage } from "@/app/_contexts/language-context";
import { useNotification } from "@/app/_contexts/notification-context";
import { useSafeAuthenticatedData } from "@/app/(protected)/_hooks/use-authenticated-data";
import { usePathname } from "next/navigation";
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
  Calendar,
  Settings,
  Sparkles,
  Workflow,
  type LucideIcon,
} from "lucide-react";

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

/** Primeiro destino real ao clicar num item com filhos (ex.: /members → /members/list). */
function getFirstNavigableChildPath(item: NavigationItem): string {
  if (!item.subItems?.length) return item.path;
  return getFirstNavigableChildPath(item.subItems[0]);
}

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

  const isItemActive = (item: NavigationItem) => {
    if (pathname === item.path || pathname === `${item.path}/`) return true;
    if (pathname.startsWith(`${item.path}/`)) return true;
    if (item.subItems) {
      return item.subItems.some(
        (sub) => pathname === sub.path || pathname.startsWith(`${sub.path}/`)
      );
    }
    return false;
  };

  const handleLinkClick = () => {
    onLinkClick?.();
  };

  if (!authenticated || !authData) return null;

  const recentNotes = authData.notes.getRecentNotes().slice(0, 6);

  const recentItems = [
    ...recentNotes.map((note) => ({
      type: "note" as const,
      id: note.id,
      title: note.title || t.common.untitled,
      icon: Book,
    })),
  ];

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
              { path: "/organization/settings", icon: Settings, label: t.nav.settings },
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
    { path: "/settings", icon: Settings, label: t.nav.settings },
  ];

  return (
    <div className="mx-2 mb-2 flex min-h-0 flex-1 flex-col rounded-md border border-gray-800 bg-gray-900 text-gray-100 shadow-sm transition-colors duration-300 dark:border-gray-800/50 dark:bg-gray-950/50 dark:text-gray-400">
      {/* Header mobile */}
      <div className="flex items-center justify-between border-b border-neutral-200/60 p-3 lg:hidden dark:border-neutral-800/60">
        <div className="flex items-center gap-2">
          <Book className="h-3.5 w-3.5 text-brand-primary-500" />
          <h2 className="text-[10px] font-bold tracking-widest text-neutral-400 uppercase dark:text-neutral-500">
            Menu
          </h2>
        </div>
        <button
          onClick={handleLinkClick}
          className="rounded-md p-1.5 text-gray-400 hover:bg-white/10 hover:text-white dark:text-gray-500 dark:hover:bg-gray-800/50 dark:hover:text-gray-300"
          aria-label="Fechar menu"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Toggle collapse desktop only */}
        <div className={`flex items-center py-2 ${isCollapsed ? "justify-center" : "px-3"}`}>
          {!isCollapsed && (
            <h2 className="text-[9px] font-bold tracking-widest text-gray-400/80 uppercase dark:text-gray-500">Menu</h2>
          )}
          {toggleCollapse && (
            <button
              onClick={toggleCollapse}
              className={`hidden rounded-md p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 lg:block dark:text-neutral-500 dark:hover:bg-neutral-800/50 dark:hover:text-neutral-300 ${
                isCollapsed ? "" : "ml-auto"
              }`}
              title={isCollapsed ? t.nav.expandMenu : t.nav.collapseMenu}
            >
              {isCollapsed ? <ChevronsRight size={14} /> : <ChevronsLeft size={14} />}
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-neutral-200 dark:[&::-webkit-scrollbar-thumb]:bg-neutral-800 [&::-webkit-scrollbar-track]:bg-transparent">
          <ul className="space-y-1 px-1 pt-1 pb-2">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const active = isItemActive(item);
              const hasSubItems = item.subItems && item.subItems.length > 0;
              const isExpanded = !isCollapsed && expandedItems[item.path];
              const linkHref = hasSubItems ? getFirstNavigableChildPath(item) : item.path;

              return (
                <li key={item.path}>
                  <Link
                    href={linkHref}
                    onClick={() => {
                      handleLinkClick();
                    }}
                    title={isCollapsed ? item.label : undefined}
                    className={`group flex items-center rounded-md py-2 text-[13px] font-medium transition-all duration-200 ${
                      active
                        ? "bg-brand-primary-500/10 text-brand-primary-500"
                        : "text-gray-300 hover:bg-white/5 hover:text-white dark:text-gray-400 dark:hover:bg-gray-800/50 dark:hover:text-gray-200"
                    } ${isCollapsed ? "justify-center px-0" : "px-2.5"}`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon
                        className={`h-4 w-4 transition-colors ${active ? "text-brand-primary-500" : "text-gray-400 group-hover:text-white dark:text-gray-500 dark:group-hover:text-gray-300"}`}
                      />
                      {!isCollapsed && <span className="truncate">{item.label}</span>}
                      {!isCollapsed && item.badge !== undefined && item.badge > 0 && (
                        <span className="bg-brand-primary-500 ml-auto flex h-3.5 min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-bold text-white">
                          {item.badge > 99 ? "99+" : item.badge}
                        </span>
                      )}
                      {isCollapsed && item.badge !== undefined && item.badge > 0 && (
                        <span className="bg-brand-primary-500 ml-1 flex h-1.5 w-1.5 rounded-full" />
                      )}
                    </div>

                    {!isCollapsed && hasSubItems && (
                      <ChevronRight
                        className={`ml-auto size-3.5 transition-transform duration-200 ${
                          isExpanded ? "rotate-90 text-brand-primary-500" : "text-neutral-300 dark:text-neutral-600"
                        }`}
                      />
                    )}
                  </Link>

                  {!isCollapsed && hasSubItems && isExpanded && (
                    <ul className="mt-1 space-y-1 pl-7">
                      {item.subItems!.map((subItem) => {
                        const SubIcon = subItem.icon;
                        const isSubActive =
                          pathname === subItem.path || pathname.startsWith(`${subItem.path}/`);
                        const hasSubSubItems = subItem.subItems && subItem.subItems.length > 0;
                        const isSubExpanded = !isCollapsed && expandedItems[subItem.path];
                        const linkHref = hasSubSubItems
                          ? getFirstNavigableChildPath(subItem)
                          : subItem.path;

                        return (
                          <li key={subItem.path}>
                            <Link
                              href={linkHref}
                              onClick={() => {
                                handleLinkClick();
                              }}
                              className={`group flex items-center rounded-md px-2.5 py-1.5 text-[12px] font-medium transition-all duration-200 ${
                                isSubActive && !hasSubSubItems
                                  ? "bg-brand-primary-500/5 text-brand-primary-500"
                                  : "text-gray-300 hover:bg-white/5 hover:text-white dark:text-gray-400 dark:hover:bg-gray-800/50 dark:hover:text-gray-200"
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <SubIcon
                                  className={`size-3 transition-colors ${
                                    isSubActive && !hasSubSubItems
                                      ? "text-brand-primary-500"
                                      : "text-gray-400 group-hover:text-white dark:text-gray-500 dark:group-hover:text-gray-300"
                                  }`}
                                />
                                <span className="truncate">{subItem.label}</span>
                              </div>

                              {!isCollapsed && hasSubSubItems && (
                                <ChevronRight
                                  className={`ml-auto size-3 text-current transition-transform ${
                                    isSubExpanded ? "rotate-90" : ""
                                  }`}
                                />
                              )}
                            </Link>

                            {!isCollapsed && hasSubSubItems && isSubExpanded && (
                              <ul className="mt-1 space-y-1 pl-4">
                                {subItem.subItems!.map((subSubItem) => {
                                  const SubSubIcon = subSubItem.icon;
                                  const isSubSubActive =
                                    pathname === subSubItem.path ||
                                    pathname.startsWith(`${subSubItem.path}/`);

                                  return (
                                    <li key={subSubItem.path}>
                                      <Link
                                        href={subSubItem.path}
                                        onClick={handleLinkClick}
                                        className={`group flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-all duration-200 ${
                                          isSubSubActive
                                            ? "bg-brand-primary-500/5 text-brand-primary-500"
                                            : "text-gray-300 hover:bg-white/5 hover:text-white dark:text-gray-400 dark:hover:bg-gray-800/50 dark:hover:text-gray-200"
                                        }`}
                                      >
                                        <SubSubIcon
                                          className={`size-2.5 transition-colors ${
                                            isSubSubActive
                                              ? "text-brand-primary-500"
                                              : "text-gray-400 group-hover:text-white dark:text-gray-500 dark:group-hover:text-gray-300"
                                          }`}
                                        />
                                        <span className="truncate">{subSubItem.label}</span>
                                      </Link>
                                    </li>
                                  );
                                })}
                              </ul>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>

          {!isCollapsed && (
            <>
              <div className="mt-4">
                <h2 className="mb-2 px-3 text-[9px] font-bold tracking-widest text-gray-400/80 uppercase dark:text-gray-500">
                  {t.nav.recentAccess}
                </h2>

                <ul className="space-y-1 px-1">
                  {recentItems.length === 0 ? (
                    <li className="flex flex-col items-center justify-center gap-2 py-6 text-center text-xs text-neutral-900/80 dark:text-neutral-100/80">
                      <Frown className="size-6 opacity-60" />
                      <span className="text-xs">{t.common.empty}</span>
                    </li>
                  ) : (
                    recentItems.map((item) => {
                      const path = `/notes/${item.id}`;
                      const isItemActive = pathname === path || pathname.startsWith(`${path}/`);
                      const ItemIcon = item.icon;

                      return (
                        <li key={`${item.type}-${item.id}`}>
                          <Link
                            href={path}
                            onClick={handleLinkClick}
                            title={item.title}
                            className={`group flex items-center gap-2.5 rounded-md px-3 py-2 transition-all duration-200 ${
                              isItemActive
                                ? "bg-brand-primary-500/10 text-brand-primary-500"
                                : "text-gray-300 hover:bg-white/5 hover:text-white dark:text-gray-400 dark:hover:bg-gray-800/50 dark:hover:text-gray-200"
                            }`}
                          >
                            <ItemIcon
                              className={`h-3.5 w-3.5 shrink-0 transition-colors ${
                                isItemActive
                                  ? "text-brand-primary-500"
                                  : "text-gray-400 group-hover:text-white dark:text-gray-500 dark:group-hover:text-gray-300"
                              }`}
                            />
                            <span className="truncate text-[12px]">{item.title}</span>
                          </Link>
                        </li>
                      );
                    })
                  )}
                </ul>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
