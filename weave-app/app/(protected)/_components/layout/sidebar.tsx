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
  CircleHelp,
  type LucideIcon,
} from "lucide-react";

const SUPPORT_URL = `${process.env.NEXT_PUBLIC_APP_URL || "https://weavenotes.app"}/support/`;

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
              { path: "/organization/settings", icon: Settings, label: "Configurações" },
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
    { path: "/settings", icon: Settings, label: "Configurações" },
  ];

  return (
    <div className="mx-1.5 mb-1 flex min-h-0 flex-1 flex-col rounded-md border border-black/5 bg-white/70 text-gray-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] backdrop-blur-sm transition-colors duration-300 dark:border-white/10 dark:bg-[#242422] dark:text-white dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
      {/* Header mobile */}
      <div className="flex items-center justify-between border-b border-black/10 p-3 lg:hidden dark:border-white/10">
        <div className="flex items-center gap-2">
          <Book className="h-3.5 w-3.5 text-brand-yellow" />
          <h2 className="text-[10px] font-bold tracking-widest text-gray-700 uppercase dark:text-white">
            Menu
          </h2>
        </div>
        <button
          type="button"
          onClick={handleLinkClick}
          className="rounded-md p-1.5 text-gray-700 hover:bg-black/5 dark:text-white dark:hover:bg-white/10"
          aria-label="Fechar menu"
          title="Fechar menu"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {/* Toggle collapse desktop only */}
        <div className={`flex shrink-0 items-center py-2 ${isCollapsed ? "justify-center" : "px-3"}`}>
          {!isCollapsed && (
            <h2 className="text-[9px] font-bold tracking-widest text-gray-600 uppercase dark:text-white">Menu</h2>
          )}
          {toggleCollapse && (
            <button
              type="button"
              onClick={toggleCollapse}
              className={`hidden rounded-md p-1.5 text-gray-700 transition-colors hover:bg-black/5 focus-visible:ring-2 focus-visible:ring-brand-yellow/50 focus-visible:outline-none dark:text-white dark:hover:bg-white/10 lg:block ${
                isCollapsed ? "" : "ml-auto"
              }`}
              title={isCollapsed ? t.nav.expandMenu : t.nav.collapseMenu}
              aria-label={isCollapsed ? t.nav.expandMenu : t.nav.collapseMenu}
            >
              {isCollapsed ? <ChevronsRight size={14} /> : <ChevronsLeft size={14} />}
            </button>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-black/15 dark:[&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-track]:bg-transparent">
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
                    className={`group flex rounded-md text-[13px] font-medium transition-all duration-200 focus-visible:ring-2 focus-visible:ring-brand-yellow/50 focus-visible:outline-none ${
                      active
                        ? "bg-brand-yellow/10 text-brand-yellow"
                        : "text-gray-700 hover:bg-black/5 dark:text-white dark:hover:bg-white/10"
                    } ${
                      isCollapsed
                        ? "flex-col items-center justify-center gap-1 px-0.5 py-2"
                        : "w-full min-w-0 items-center px-2.5 py-2"
                    }`}
                  >
                    {isCollapsed ? (
                      <div className="flex flex-col items-center gap-1">
                        <span className="relative inline-flex shrink-0">
                          <Icon
                            className={`h-4 w-4 transition-colors ${active ? "text-brand-yellow" : "text-gray-600 dark:text-white"}`}
                          />
                          {item.badge !== undefined && item.badge > 0 && (
                            <span className="bg-brand-yellow absolute -top-0.5 -right-0.5 size-1.5 rounded-full ring-2 ring-white dark:ring-[#242422]" />
                          )}
                        </span>
                        <span
                          className={`line-clamp-2 w-full max-w-[4.5rem] text-center text-[8px] font-semibold leading-[1.15] tracking-tight ${
                            active ? "text-brand-yellow" : "text-gray-600 dark:text-white"
                          }`}
                        >
                          {item.label}
                        </span>
                      </div>
                    ) : (
                      <>
                        <div className="flex min-w-0 flex-1 items-center gap-2.5">
                          <Icon
                            className={`h-4 w-4 shrink-0 transition-colors ${active ? "text-brand-yellow" : "text-gray-600 dark:text-white"}`}
                          />
                          <span className="truncate">{item.label}</span>
                          {item.badge !== undefined && item.badge > 0 && (
                            <span className="bg-brand-yellow ml-auto flex h-3.5 min-w-[16px] shrink-0 items-center justify-center rounded-full px-1 text-[9px] font-bold text-white">
                              {item.badge > 99 ? "99+" : item.badge}
                            </span>
                          )}
                        </div>
                        {hasSubItems && (
                          <ChevronRight
                            className={`ml-auto size-3.5 shrink-0 transition-transform duration-200 ${
                              isExpanded ? "rotate-90 text-brand-yellow" : "text-gray-500 dark:text-white"
                            }`}
                          />
                        )}
                      </>
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
                                  ? "bg-brand-yellow/5 text-brand-yellow"
                                  : "text-gray-700 hover:bg-black/5 dark:text-white dark:hover:bg-white/10"
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <SubIcon
                                  className={`size-3 transition-colors ${
                                    isSubActive && !hasSubSubItems
                                      ? "text-brand-yellow"
                                      : "text-gray-600 dark:text-white"
                                  }`}
                                />
                                <span className="truncate">{subItem.label}</span>
                              </div>

                              {!isCollapsed && hasSubSubItems && (
                                <ChevronRight
                                  className={`ml-auto size-3 transition-transform ${
                                    isSubExpanded ? "rotate-90" : ""
                                  } text-gray-500 dark:text-white`}
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
                                            ? "bg-brand-yellow/5 text-brand-yellow"
                                            : "text-gray-700 hover:bg-black/5 dark:text-white dark:hover:bg-white/10"
                                        }`}
                                      >
                                        <SubSubIcon
                                          className={`size-2.5 transition-colors ${
                                            isSubSubActive
                                              ? "text-brand-yellow"
                                              : "text-gray-600 dark:text-white"
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
                <h2 className="mb-2 px-3 text-[9px] font-bold tracking-widest text-gray-600 uppercase dark:text-white">
                  {t.nav.recentAccess}
                </h2>

                <ul className="space-y-1 px-1">
                  {recentItems.length === 0 ? (
                    <li className="flex flex-col items-center justify-center gap-2 py-6 text-center text-xs text-gray-600 dark:text-white">
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
                                ? "bg-brand-yellow/10 text-brand-yellow"
                                : "text-gray-700 hover:bg-black/5 dark:text-white dark:hover:bg-white/10"
                            }`}
                          >
                            <ItemIcon
                              className={`h-3.5 w-3.5 shrink-0 transition-colors ${
                                isItemActive
                                  ? "text-brand-yellow"
                                  : "text-gray-600 dark:text-white"
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

        <div className="shrink-0 border-t border-black/10 px-1 pt-2 pb-2 dark:border-white/10">
          <div className={`flex ${isCollapsed ? "justify-center" : "px-1"}`}>
            <a
              href={SUPPORT_URL}
              target="_blank"
              rel="noopener noreferrer"
              title={t.footer.help}
              aria-label={t.footer.help}
              className={`text-gray-700 transition-colors hover:bg-black/5 focus-visible:ring-2 focus-visible:ring-brand-yellow/50 focus-visible:outline-none dark:text-white dark:hover:bg-white/10 ${
                isCollapsed
                  ? "flex flex-col items-center justify-center gap-1 rounded-md px-0.5 py-2"
                  : "inline-flex w-full items-center justify-start gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium"
              }`}
            >
              <CircleHelp
                className={`shrink-0 text-gray-600 dark:text-white ${isCollapsed ? "size-[18px]" : "size-4"}`}
              />
              {isCollapsed ? (
                <span className="line-clamp-2 max-w-[4.5rem] text-center text-[8px] font-semibold leading-[1.15] tracking-tight text-gray-600 dark:text-white">
                  {t.footer.help}
                </span>
              ) : (
                <span className="truncate">{t.footer.help}</span>
              )}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;