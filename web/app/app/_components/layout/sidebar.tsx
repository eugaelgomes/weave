"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/app/_contexts/auth-context";
import { useLanguage } from "@/app/_contexts/language-context";
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
  type LucideIcon
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
  subItems?: {
    path: string;
    icon: LucideIcon;
    label: string;
  }[];
}

const Sidebar = ({ onLinkClick, isCollapsed = false, toggleCollapse }: SidebarProps) => {
  const { authenticated } = useAuth();
  const { t } = useLanguage();
  const authData = useSafeAuthenticatedData();
  const pathname = usePathname();
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (isCollapsed) return;

    const newExpandedState: Record<string, boolean> = {};
    const itemsWithSubs = [
      { path: "/app/weave-ai/chat", checkPath: "/app/weave-ai" },
      { path: "/app/organization", checkPath: "/app/organization" },
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
    if (onLinkClick) onLinkClick();
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
      path: "/app/notifications",
      icon: MessageSquare,
      label: t.nav.notifications,
    },
    {
      path: "/app/calendar",
      icon: Calendar,
      label: t.nav.calendar,
    },
    ...(hasOrg
      ? [
          {
            path: "/app/organization",
            icon: Users,
            label: t.nav.organization,
            subItems: [
              { path: "/app/organization/settings", icon: Settings, label: t.nav.settings },
              { path: "/app/organization/members", icon: UsersRound, label: t.nav.members },
              { path: "/app/organization/areas", icon: Workflow, label: t.nav.areas },
              { path: "/app/organization/projects", icon: Network, label: t.nav.projects },
            ],
          },
        ]
      : []),
    { path: "/app/settings", icon: Settings, label: t.nav.settings },
  ];

  return (
    <div className="flex h-full w-full flex-col bg-transparent text-neutral-600 lg:bg-neutral-50 dark:text-neutral-400 dark:lg:bg-neutral-950">
      <div className="flex flex-shrink-0 items-center justify-between border-b border-neutral-200 p-3 lg:hidden dark:border-neutral-800">
        <div className="flex items-center gap-2">
          <Book className="h-3.5 w-3.5 text-yellow-500" />
          <h2 className="text-xs font-bold tracking-wider text-neutral-700 dark:text-neutral-200">
            Menu
          </h2>
        </div>
        <button
          onClick={handleLinkClick}
          className="text-neutral-700 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-neutral-100"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden">
        <div
          className={`mb-2 flex shrink-0 items-center ${isCollapsed ? "justify-center" : "justify-between px-2"}`}
        >
          {!isCollapsed && (
            <h2 className="text-[10px] font-bold tracking-wider text-yellow-500">Menu</h2>
          )}
          <button
            onClick={toggleCollapse}
            className="hidden rounded-md px-6 py-2 text-yellow-500 hover:bg-neutral-100 hover:text-yellow-500/50 lg:block dark:hover:bg-neutral-800 dark:hover:text-white"
            title={isCollapsed ? t.nav.expandMenu : t.nav.collapseMenu}
          >
            {isCollapsed ? <ChevronsRight size={14} /> : <ChevronsLeft size={14} />}
          </button>
        </div>
        <div className="flex-1 overflow-x-hidden overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-yellow-500/40 hover:[&::-webkit-scrollbar-thumb]:bg-yellow-500 dark:[&::-webkit-scrollbar-thumb]:bg-yellow-500/30 dark:hover:[&::-webkit-scrollbar-thumb]:bg-yellow-500/60 [&::-webkit-scrollbar-track]:bg-transparent">
          <ul className="space-y-1">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const active = isItemActive(item);
              const hasSubItems = item.subItems && item.subItems.length > 0;
              const isExpanded = !isCollapsed && expandedItems[item.path];

              // Se estiver recolhido E o item tiver filhos, apontamos o Link para o primeiro subitem
              // para evitar cair na página raiz vazia (ex: /app/organization)
              const linkHref = (isCollapsed && hasSubItems) ? item.subItems![0].path : item.path;

              return (
                <li key={item.path} className="group relative">
                  <div className="flex items-center">
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
                      className={`flex flex-1 rounded-md transition-all duration-200 ${
                        isCollapsed 
                          ? "flex-col items-center justify-center gap-1 p-2" 
                          : "items-center justify-between px-2.5 py-2"
                      } ${
                        active
                          ? "bg-yellow-500/10 font-medium text-yellow-500"
                          : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-neutral-200"
                      } `}
                    >
                      <div className={`flex items-center ${isCollapsed ? "flex-col gap-1 w-full" : "gap-2.5"}`}>
                        <Icon
                          className={`h-4 w-4 transition-colors ${active ? "text-yellow-500" : "text-neutral-500 group-hover:text-neutral-900 dark:text-neutral-400 dark:group-hover:text-neutral-200"} `}
                        />
                        <span className={`${isCollapsed ? "text-[8px] text-center leading-none truncate w-full" : "text-xs"}`}>
                          {item.label}
                        </span>
                      </div>

                      {!isCollapsed && hasSubItems && (
                        <div className="text-neutral-400">
                          {isExpanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                        </div>
                      )}
                    </Link>
                  </div>

                  {!isCollapsed && hasSubItems && isExpanded && (
                    <ul className="animate-in slide-in-from-top-1 mt-1 space-y-0.5 pl-4 duration-200">
                      {item.subItems!.map((subItem) => {
                        const SubIcon = subItem.icon;

                        const isSubActive =
                          pathname === subItem.path ||
                          (subItem.path !== item.path && pathname.startsWith(`${subItem.path}/`));

                        return (
                          <li key={subItem.path}>
                            <Link
                              href={subItem.path}
                              onClick={handleLinkClick}
                              className={`flex items-center gap-2.5 rounded-md px-2.5 py-1.5 transition-all duration-200 ${
                                isSubActive
                                  ? "bg-yellow-500/10 font-medium text-yellow-600 dark:text-yellow-500"
                                  : "text-neutral-500 hover:text-neutral-800 dark:text-neutral-500 dark:hover:text-neutral-300"
                              }`}
                            >
                              <SubIcon
                                className={`h-2.5 w-2.5 ${isSubActive ? "text-yellow-500" : "opacity-70"}`}
                              />
                              <span
                                className="truncate text-[11px] font-medium"
                                title={subItem.label}
                              >
                                {subItem.label}
                              </span>
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

          {!isCollapsed && (
            <>
              <div className="divisor my-4 h-px w-full shrink-0 bg-neutral-200 dark:bg-neutral-800" />

              <div className="animate-in fade-in flex-1 duration-300">
                <h2 className="mb-2 px-2 text-[10px] font-bold tracking-wider text-yellow-500">
                  {t.nav.recentAccess}
                </h2>

                <ul className="space-y-0.5">
                  {recentItems.length === 0 && (
                    <li className="flex flex-col items-center justify-center gap-2 px-2.5 py-8 text-center text-xs text-neutral-500">
                      <Frown className="h-5 w-5 opacity-50" />
                      <span className="text-xs">{t.common.empty}</span>
                    </li>
                  )}

                  {recentItems.map((item) => {
                    const path = `/app/notes/${item.id}`;
                    const isItemActive = pathname === path || pathname.startsWith(`${path}/`);
                    const ItemIcon = item.icon;

                    return (
                      <li key={`${item.type}-${item.id}`}>
                        <Link
                          href={path}
                          onClick={handleLinkClick}
                          title={item.title}
                          className={`group flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[11px] transition-all duration-200 ${
                            isItemActive
                              ? "bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-white"
                              : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-neutral-200"
                          }`}
                        >
                          <ItemIcon
                            className={`h-3 w-3 flex-shrink-0 ${isItemActive ? "text-yellow-500" : "text-neutral-400"}`}
                          />
                          <span className="truncate">{item.title}</span>
                        </Link>
                      </li>
                    );
                  })}
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