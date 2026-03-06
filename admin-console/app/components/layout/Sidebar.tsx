"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FaHome,
  FaUsers,
  FaChevronLeft,
  FaChevronRight,
} from "react-icons/fa";
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
}

const Sidebar = ({ onLinkClick, isCollapsed = false, toggleCollapse }: SidebarProps) => {
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path === "/" && pathname === "/") return true;
    if (path !== "/" && pathname.startsWith(path)) return true;
    return false;
  };

  const navigationItems: NavigationItem[] = [
    { path: "/", icon: FaHome, label: "Dashboard" },
    { path: "/users", icon: FaUsers, label: "Usuários" },
  ];

  return (
    <div className="flex flex-1 flex-col justify-between overflow-y-auto bg-white py-4">
      <nav className="space-y-1 px-3">
        {navigationItems.map((item) => {
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              href={item.path}
              onClick={onLinkClick}
              className={`group flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                active
                  ? "bg-yellow-500 text-white shadow-sm"
                  : "text-neutral-700 hover:bg-yellow-50 hover:text-yellow-600"
              }`}
            >
              <item.icon
                className={`flex-shrink-0 transition-all duration-200 ${
                  active
                    ? "text-white"
                    : "text-neutral-500 group-hover:text-yellow-500"
                } ${isCollapsed ? "mr-0 h-6 w-6" : "mr-3 h-5 w-5"}`}
              />
              {!isCollapsed && (
                <span className="truncate">{item.label}</span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="hidden border-t border-neutral-200 p-4 lg:block">
        <button
          onClick={toggleCollapse}
          className="flex w-full items-center justify-center rounded-lg p-2 text-neutral-500 hover:bg-yellow-50 hover:text-yellow-600"
        >
          {isCollapsed ? (
            <FaChevronRight className="h-5 w-5" />
          ) : (
            <div className="flex items-center gap-2">
              <FaChevronLeft className="h-5 w-5" />
              <span className="text-sm font-medium">Recolher</span>
            </div>
          )}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
