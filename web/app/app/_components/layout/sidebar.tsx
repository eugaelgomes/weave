"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/app/_contexts/auth-context";
import { useLanguage } from "@/app/_contexts/language-context";
import { useSafeAuthenticatedData } from "@/app/app/_hooks/use-authenticated-data";
import { usePathname } from "next/navigation";
import {
  FaBook,
  FaHome,
  FaProjectDiagram,
  FaTimes,
  FaRegSadTear,
  FaComments,
  FaChevronDown,
  FaChevronRight,
  FaRobot,
  FaUsers,
  FaUserFriends,
  FaAngleDoubleLeft,
  FaAngleDoubleRight,
  FaCalendar,
  FaList,
} from "react-icons/fa";
import { IoMdSettings } from "react-icons/io";
import { HiSparkles } from "react-icons/hi2";
import { IconType } from "react-icons";

interface SidebarProps {
  onLinkClick?: () => void;
  isCollapsed?: boolean;
  toggleCollapse?: () => void;
}

interface NavigationItem {
  path: string;
  icon: IconType;
  label: string;
  subItems?: {
    path: string;
    icon: IconType;
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

  const toggleExpand = (path: string, e: React.MouseEvent) => {
    e.preventDefault();
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
      icon: FaBook,
    })),
  ];

  const hasOrg = !!authData.user.org_id;

  const navigationItems: NavigationItem[] = [
    { path: "/app/home", icon: FaHome, label: t.nav.home },
    { path: "/app/notes", icon: FaBook, label: t.nav.notes },
    {
      path: "/app/projects",
      icon: FaProjectDiagram,
      label: t.nav.projects,
    },
    {
      path: "/app/weave-ai/chat",
      icon: HiSparkles,
      label: t.nav.weaveAi,
      subItems: [
        { path: "/app/weave-ai/chat", icon: FaComments, label: t.nav.chat },
        { path: "/app/weave-ai/agent", icon: FaRobot, label: t.nav.agent },
      ],
    },
    {
      path: "/app/notifications",
      icon: FaComments,
      label: t.nav.notifications,
    },
    {
      path: "/app/calendar",
      icon: FaCalendar,
      label: t.nav.calendar,
    },
    ...(hasOrg
      ? [
          {
            path: "/app/organization",
            icon: FaUsers,
            label: t.nav.organization,
            subItems: [
              { path: "/app/organization/settings", icon: IoMdSettings, label: t.nav.settings },
              { path: "/app/organization/members", icon: FaUserFriends, label: t.nav.members },
              { path: "/app/organization/projects", icon: FaProjectDiagram, label: t.nav.projects },
            ],
          },
        ]
      : []),
    { path: "/app/settings", icon: IoMdSettings, label: t.nav.settings },
  ];

  return (
    <div className="flex h-full w-full flex-col bg-transparent text-neutral-600 lg:bg-neutral-50 dark:text-neutral-400 dark:lg:bg-neutral-950">
      <div className="flex flex-shrink-0 items-center justify-between border-b border-neutral-200 p-3 lg:hidden dark:border-neutral-800">
        <div className="flex items-center gap-2">
          <FaBook className="h-4 w-4 text-yellow-500" />
          <h2 className="text-xs font-bold tracking-wider text-neutral-700 dark:text-neutral-200">
            Menu
          </h2>
        </div>
        <button
          onClick={handleLinkClick}
          className="text-neutral-700 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-neutral-100"
        >
          <FaTimes size={16} />
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
            {isCollapsed ? <FaAngleDoubleRight size={14} /> : <FaAngleDoubleLeft size={14} />}
          </button>
        </div>
        <div className="flex-1 overflow-x-hidden overflow-y-auto px-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-yellow-500/40 hover:[&::-webkit-scrollbar-thumb]:bg-yellow-500 dark:[&::-webkit-scrollbar-thumb]:bg-yellow-500/30 dark:hover:[&::-webkit-scrollbar-thumb]:bg-yellow-500/60 [&::-webkit-scrollbar-track]:bg-transparent">
          <ul className="space-y-1">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const active = isItemActive(item);
              const hasSubItems = item.subItems && item.subItems.length > 0;
              const isExpanded = !isCollapsed && expandedItems[item.path];

              return (
                <li key={item.path} className="group relative">
                  <div className="flex items-center">
                    <Link
                      href={item.path}
                      onClick={(e) => {
                        if (hasSubItems && !isCollapsed) {
                          toggleExpand(item.path, e);
                        } else {
                          handleLinkClick();
                        }
                      }}
                      className={`flex flex-1 items-center rounded-md transition-all duration-200 ${isCollapsed ? "justify-center px-0 py-3" : "justify-between px-2.5 py-2"} ${
                        active
                          ? "bg-yellow-500/10 font-medium text-yellow-500"
                          : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-neutral-200"
                      } `}
                    >
                      <div className={`flex items-center ${!isCollapsed && "gap-3"}`}>
                        <Icon
                          className={`transition-colors ${isCollapsed ? "h-4 w-4" : "h-4 w-4"} ${active ? "text-yellow-500" : "text-neutral-500 group-hover:text-neutral-900 dark:text-neutral-400 dark:group-hover:text-neutral-200"} `}
                        />
                        {!isCollapsed && <span className="text-sm">{item.label}</span>}
                      </div>

                      {!isCollapsed && hasSubItems && (
                        <div className="text-neutral-400">
                          {isExpanded ? <FaChevronDown size={10} /> : <FaChevronRight size={10} />}
                        </div>
                      )}
                    </Link>
                  </div>

                  {isCollapsed && (
                    <div className="pointer-events-none absolute top-1/2 left-full z-50 ml-2 -translate-y-1/2 rounded-md bg-neutral-900 px-2 py-1 text-xs whitespace-nowrap text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                      {item.label}
                    </div>
                  )}

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
                                className={`h-3 w-3 ${isSubActive ? "text-yellow-500" : "opacity-70"}`}
                              />
                              <span className="truncate text-xs font-medium" title={subItem.label}>
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
                  {t.nav.recentAccess} (Anotações)
                </h2>

                <ul className="space-y-0.5">
                  {recentItems.length === 0 && (
                    <li className="flex flex-col items-center justify-center gap-2 px-2.5 py-8 text-center text-sm text-neutral-500">
                      <FaRegSadTear className="h-5 w-5 opacity-50" />
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
                          className={`group flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-all duration-200 ${
                            isItemActive
                              ? "bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-white"
                              : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-neutral-200"
                          }`}
                        >
                          <ItemIcon
                            className={`h-3.5 w-3.5 flex-shrink-0 ${isItemActive ? "text-yellow-500" : "text-neutral-400"}`}
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