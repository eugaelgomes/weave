"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/app/_contexts/auth-context";
import { useLanguage } from "@/app/_contexts/language-context";
import { useNotification } from "@/app/_contexts/notification-context";
import { useSafeAuthenticatedData } from "@/app/app/_hooks/use-authenticated-data";
import { usePathname } from "next/navigation";
import {
  Book,
  Home,
  Network,
  X,
  Frown,
  MessageSquare,
  ChevronDown,
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

const Sidebar = ({ onLinkClick, isCollapsed = false, toggleCollapse }: SidebarProps) => {
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
      { path: "/app/weave-ai/chat", checkPath: "/app/weave-ai" },
      { path: "/app/organization", checkPath: "/app/organization" },
      { path: "/app/organization/members", checkPath: "/app/organization/members" },
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

  const toggleExpand = (path: string) => {
    if (isCollapsed) return;
    setExpandedItems((prev) => ({ ...prev, [path]: !prev[path] }));
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
    { path: "/app/home", icon: Home, label: t.nav.home },
    { path: "/app/notes", icon: Book, label: t.nav.notes },
    {
      path: "/app/projects",
      icon: Network,
      label: t.nav.projects,
    },
    {
      path: "/app/weave-ai/chat",
      icon: Sparkles,
      label: t.nav.weaveAi,
      subItems: [
        { path: "/app/weave-ai/chat", icon: MessageSquare, label: t.nav.chat },
        { path: "/app/weave-ai/agent", icon: Bot, label: t.nav.agent },
      ],
    },
    {
      path: "/app/calendar",
      icon: Calendar,
      label: t.nav.calendar,
    },
    {
      path: "/app/notifications",
      icon: MessageSquare,
      label: t.nav.notifications,
      badge: unreadCount,
    },
    ...(hasOrg
      ? [
          {
            path: "/app/organization",
            icon: Users,
            label: t.nav.organization,
            subItems: [
              { path: "/app/organization/settings", icon: Settings, label: t.nav.settings },
              { 
                path: "/app/organization/members", 
                icon: UsersRound, 
                label: t.nav.members,
                subItems: [
                  { path: "/app/organization/members/list", icon: Users, label: t.nav.list || "Lista" },
                  { path: "/app/organization/members/invites", icon: MessageSquare, label: t.nav.invites || "Convites" },
                ]
              },
              { path: "/app/organization/areas", icon: Workflow, label: t.nav.areas },
              { path: "/app/organization/projects", icon: Network, label: t.nav.projects },
            ],
          },
        ]
      : []),
    { path: "/app/settings", icon: Settings, label: t.nav.settings },
  ];

  return (
    <div className="flex h-full flex-col bg-white text-neutral-600 dark:bg-brand-secondary-950 dark:text-neutral-400">
      {/* Header mobile */}
      <div className="flex items-center justify-between border-b border-neutral-200 p-3 lg:hidden dark:border-neutral-800">
        <div className="flex items-center gap-2">
          <Book className="h-3.5 w-3.5 text-brand-primary-700" />
          <h2 className="text-xs font-bold tracking-wider text-neutral-700 dark:text-neutral-200">
            Menu
          </h2>
        </div>
        <button
          onClick={handleLinkClick}
          className="rounded p-1 text-neutral-600 hover:bg-black/5 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-white/5 dark:hover:text-neutral-100"
          aria-label="Fechar menu"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Toggle collapse desktop only */}
        <div className={`flex items-center py-1.5 ${isCollapsed ? "justify-center" : "px-2"}`}>
          {!isCollapsed && (
            <h2 className="text-[10px] font-bold tracking-wider text-brand-primary-700 ">Menu</h2>
          )}
          {toggleCollapse && (
            <button
              onClick={toggleCollapse}
              className={`hidden rounded-md p-1 text-brand-primary-700 hover:bg-neutral-100 lg:block dark:hover:bg-neutral-800 ${
                isCollapsed ? "" : "ml-auto"
              }`}
              title={isCollapsed ? t.nav.expandMenu : t.nav.collapseMenu}
            >
              {isCollapsed ? <ChevronsRight size={14} /> : <ChevronsLeft size={14} />}
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-yellow-400 [&::-webkit-scrollbar-track]:bg-transparent">
          <ul className="space-y-1 px-1 pt-1 pb-2">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const active = isItemActive(item);
              const hasSubItems = item.subItems && item.subItems.length > 0;
              const isExpanded = !isCollapsed && expandedItems[item.path];
              const linkHref = isCollapsed && hasSubItems ? item.subItems![0].path : item.path;

              return (
                <li key={item.path}>
                  <Link
                    href={linkHref}
                    onClick={(e) => {
                      if (hasSubItems && !isCollapsed) {
                        e.preventDefault();
                        toggleExpand(item.path);
                      } else {
                        handleLinkClick();
                      }
                    }}
                    title={isCollapsed ? item.label : undefined}
                    className={`flex items-center rounded-md py-2 text-sm font-medium transition duration-200 ${
                      active
                        ? "bg-brand-primary-700/10 text-yellow-600 dark:text-brand-primary-700"
                        : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-white"
                    } ${isCollapsed ? "justify-center px-0" : "px-2"}`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon
                        className={`h-4 w-4 ${
                          active ? "text-brand-primary-700" : "text-neutral-500 dark:text-neutral-500"
                        }`}
                      />
                      {!isCollapsed && <span className="truncate">{item.label}</span>}
                      {!isCollapsed && item.badge !== undefined && item.badge > 0 && (
                        <span className="ml-auto flex h-4 min-w-[18px] items-center justify-center rounded-full bg-brand-primary-700 px-1 text-[9px] font-bold text-white">
                          {item.badge > 99 ? "99+" : item.badge}
                        </span>
                      )}
                      {isCollapsed && item.badge !== undefined && item.badge > 0 && (
                        <span className="ml-1 flex h-1.5 w-1.5 rounded-full bg-brand-primary-700" />
                      )}
                    </div>

                    {!isCollapsed && hasSubItems && (
                      <ChevronRight
                        className={`ml-auto size-3 transition-transform ${
                          isExpanded ? "rotate-90" : ""
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
                        const linkHref = isCollapsed && hasSubSubItems ? subItem.subItems![0].path : subItem.path;

                        return (
                          <li key={subItem.path}>
                            <Link
                              href={linkHref}
                              onClick={(e) => {
                                if (hasSubSubItems && !isCollapsed) {
                                  e.preventDefault();
                                  toggleExpand(subItem.path);
                                } else {
                                  handleLinkClick();
                                }
                              }}
                              className={`flex items-center rounded-md px-2 py-1 text-sm font-medium transition duration-200 ${
                                isSubActive && !hasSubSubItems
                                  ? "bg-brand-primary-700/10 text-yellow-600 dark:text-brand-primary-700"
                                  : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-900"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <SubIcon
                                  className={`size-2.5 ${
                                    isSubActive && !hasSubSubItems
                                      ? "text-brand-primary-700"
                                      : "text-neutral-500 opacity-70 dark:text-neutral-500"
                                  }`}
                                />
                                <span className="truncate text-sm">{subItem.label}</span>
                              </div>

                              {!isCollapsed && hasSubSubItems && (
                                <ChevronRight
                                  className={`ml-auto size-3 transition-transform ${
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
                                    pathname === subSubItem.path || pathname.startsWith(`${subSubItem.path}/`);

                                  return (
                                    <li key={subSubItem.path}>
                                      <Link
                                        href={subSubItem.path}
                                        onClick={handleLinkClick}
                                        className={`flex items-center gap-2 rounded-md px-2 py-1 text-sm font-medium transition duration-200 ${
                                          isSubSubActive
                                            ? "bg-brand-primary-700/10 text-yellow-600 dark:text-brand-primary-700"
                                            : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-900"
                                        }`}
                                      >
                                        <SubSubIcon
                                          className={`size-2.5 ${
                                            isSubSubActive
                                              ? "text-brand-primary-700"
                                              : "text-neutral-500 opacity-70 dark:text-neutral-500"
                                          }`}
                                        />
                                        <span className="truncate text-xs">{subSubItem.label}</span>
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
              <div className="my-2 h-px w-full bg-neutral-200 dark:bg-neutral-800" />

              <div>
                <h2 className="mb-1.5 px-2 text-[10px] font-bold tracking-wider text-brand-primary-700 ">
                  {t.nav.recentAccess}
                </h2>

                <ul className="space-y-1 px-1">
                  {recentItems.length === 0 ? (
                    <li className="flex flex-col items-center justify-center gap-2 py-6 text-center text-sm text-neutral-500">
                      <Frown className="size-6 opacity-60" />
                      <span className="text-sm">{t.common.empty}</span>
                    </li>
                  ) : (
                    recentItems.map((item) => {
                      const path = `/app/notes/${item.id}`;
                      const isItemActive = pathname === path || pathname.startsWith(`${path}/`);
                      const ItemIcon = item.icon;

                      return (
                        <li key={`${item.type}-${item.id}`}>
                          <Link
                            href={path}
                            onClick={handleLinkClick}
                            title={item.title}
                            className={`group flex items-center gap-2 rounded-md px-2 py-1.5 transition duration-200 ${
                              isItemActive
                                ? "bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-white"
                                : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-900"
                            }`}
                          >
                            <ItemIcon
                              className={`shrink-0 h-3.5 w-3.5 ${
                                isItemActive
                                  ? "text-brand-primary-700"
                                  : "text-neutral-400 dark:text-neutral-500"
                              }`}
                            />
                            <span className="truncate text-xs">{item.title}</span>
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
